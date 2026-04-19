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

Flip `SITE_MODE` between coming-soon and full storefront. **Default target is
staging** — prod requires an explicit `production` positional:

```bash
pnpm maintenance status                # staging status (default)
pnpm maintenance on                    # staging → coming-soon
pnpm maintenance off                   # staging → full storefront

pnpm maintenance status production     # prod status
pnpm maintenance on  production        # prod → coming-soon
pnpm maintenance off production        # prod → full storefront
```

Flags: `--dry-run` to preview the command, `--yes` to skip the prod launch
confirmation, `--app=<name>` to target a raw Fly app name.

The script only toggles `SITE_MODE`. `NOINDEX` is an environment property set
via `[env]` in `fly.toml` / `fly.staging.toml` and is not touched by the
script. At prod launch, allow indexing separately:

```bash
flyctl secrets set -a obscuruslabs NOINDEX=false
```

Auth uses whatever `flyctl` already has — run `flyctl auth whoami` to check.

### GitHub Actions: build-once / promote architecture

Two workflows feed deploys:

- [build.yml](.github/workflows/build.yml) — on every push and PR, builds the
  Docker image with BuildKit + GHA layer cache, tags it with the commit SHA,
  and pushes to `registry.fly.io/obscuruslabs:sha-<commit>`. Same image for
  every environment.
- [deploy.yml](.github/workflows/deploy.yml) — triggered by a successful Build
  run. Pulls the SHA-tagged image from the registry and calls `flyctl deploy
  --image ...` against the target app. No rebuild. Typical deploy: 20–30s.

The same bytes that passed PR CI deploy to staging; the same bytes that ran on
staging deploy to prod. Merging `staging → main` is literal artifact promotion.

Required repo secret:

```bash
flyctl tokens create org personal --name "github-actions" --expiry 999999h
gh secret set FLY_API_TOKEN --repo obscuruslabs/website
```

Rollback to any prior SHA without a build:

```bash
flyctl deploy --image registry.fly.io/obscuruslabs:sha-<old-commit> -a obscuruslabs
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
