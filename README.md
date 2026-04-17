# obscurus labs

Storefront for anti-surveillance eyewear. Next.js 15 (App Router) + Tailwind v4, Stripe Checkout, Resend for transactional email, Plausible for analytics, Sentry for error tracking. Deployed on Fly.io.

## Environments

| | Production | Staging |
| --- | --- | --- |
| Branch | `main` | `staging` |
| Fly app | `obscuruslabs` | `obscuruslabs-staging` |
| URL | https://obscuruslabs.com | https://stg.obscuruslabs.com |
| `SITE_MODE` | `coming_soon` | `full` |
| Robots | `noindex` (until launch) | `noindex` (always) |
| Basic auth | off | on |

Main always matches production. Merges to `main` auto-deploy via [deploy.yml](.github/workflows/deploy.yml). Merges to `staging` auto-deploy to the staging app. Do feature work on a branch, PR into `staging`, then PR `staging` → `main` when ready to ship.

## Local development

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

Open http://localhost:3000. Set `SITE_MODE=coming_soon` in `.env.local` to preview the coming-soon page.

## Stripe local testing

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the whsec_… into STRIPE_WEBHOOK_SECRET
pnpm dev
# then buy the product — use 4242 4242 4242 4242
```

## One-time infrastructure setup

These commands are **not** run by CI; an operator runs them once per environment.

### Create the staging Fly app

```bash
flyctl apps create obscuruslabs-staging
flyctl ips allocate-v4 --shared -a obscuruslabs-staging
flyctl ips allocate-v6 -a obscuruslabs-staging

flyctl secrets set -a obscuruslabs-staging \
  BASIC_AUTH_USER="preview" \
  BASIC_AUTH_PASSWORD="tavin is smart" \
  STRIPE_SECRET_KEY="sk_test_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..." \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="obscurus labs <hello@stg.obscuruslabs.com>" \
  NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC="stg.obscuruslabs.com"

flyctl certs create stg.obscuruslabs.com -a obscuruslabs-staging
```

Then add a Porkbun `A` / `AAAA` record (or `CNAME obscuruslabs-staging.fly.dev`) for `stg.obscuruslabs.com`.

### Set production secrets

```bash
flyctl secrets set -a obscuruslabs \
  STRIPE_SECRET_KEY="sk_live_..." \
  STRIPE_WEBHOOK_SECRET="whsec_..." \
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_..." \
  RESEND_API_KEY="re_..." \
  EMAIL_FROM="obscurus labs <hello@obscuruslabs.com>" \
  NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC="obscuruslabs.com"
```

### Maintenance mode

Flip production between the coming-soon page and the full storefront:

```bash
pnpm maintenance status   # show current SITE_MODE / NOINDEX / secrets
pnpm maintenance on       # hide the site behind the coming-soon page
pnpm maintenance off      # launch — show the full storefront
```

Add `--app=obscuruslabs-staging` to target staging, `--dry-run` to preview the
command, and `--yes` to skip the "you're about to launch" confirmation.

The script wraps `flyctl secrets set` and reads `FLYIO_API_KEY` from [.env](.env)
if `FLY_API_TOKEN` isn't already in your environment. It falls back to
`nix run nixpkgs#flyctl` if `flyctl` isn't on your PATH.

### GitHub Actions deploy token

```bash
flyctl tokens create deploy -x 999999h
# add as repo secret: FLY_API_TOKEN
gh secret set FLY_API_TOKEN --repo thejonanshow/obscuruslabs
```

## Stripe webhook endpoints

Point Stripe at these URLs. Include `checkout.session.completed`.

- Production: `https://obscuruslabs.com/api/stripe/webhook`
- Staging:    `https://stg.obscuruslabs.com/api/stripe/webhook`

The webhook route is exempted from the basic-auth middleware so Stripe can reach it even on staging.

## File structure

```
src/
  app/
    page.tsx             # Switches on SITE_MODE
    layout.tsx           # Metadata, Plausible, JSON-LD
    robots.ts            # Respects NOINDEX
    sitemap.ts
    opengraph-image.tsx  # Dynamic OG
    success/             # Post-checkout
    cancel/
    (legal)/             # terms, privacy, returns, shipping, contact
    api/
      checkout/          # Stripe Checkout session
      stripe/webhook/    # Order fulfilment trigger
      waitlist/          # Waitlist subscribe
  components/
    Hero, Nav, Footer, Product, Tech, Faq, Waitlist, ComingSoon, BuyButton, ProductJsonLd
  lib/
    product.ts           # single source of truth for pricing
    faq.ts
    env.ts
    stripe.ts
    email.ts
    emails/              # html templates
  middleware.ts          # Basic auth + noindex on staging
```
