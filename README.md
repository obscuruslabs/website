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
  WAITLIST_TOKEN_SECRET="$(openssl rand -base64 32)" \
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
  WAITLIST_TOKEN_SECRET="$(openssl rand -base64 32)" \
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
    waitlist/
      confirmed/         # Landing after clicking the confirm link
      error/             # Landing for expired/invalid confirm links
    (legal)/             # terms, privacy, returns, shipping, contact
    api/
      checkout/          # Stripe Checkout session
      stripe/webhook/    # Order fulfilment trigger
      waitlist/          # POST: send confirm link (no audience write yet)
        confirm/         # GET: verify token, write to audience, redirect
  components/
    Hero, Nav, Footer, Product, Tech, Faq, Waitlist, ComingSoon, BuyButton, ProductJsonLd
  lib/
    product.ts           # single source of truth for pricing
    faq.ts
    env.ts
    stripe.ts
    email.ts
    emails/              # html templates
    waitlist-token.ts    # HMAC sign/verify for confirm links
  middleware.ts          # Basic auth + noindex on staging
```

## Prototype sales (maintenance page)

When `SITE_MODE=coming_soon`, the maintenance page offers a second CTA
beside the waitlist: a $39 prototype unit (`viso-prototype` SKU) sold via
the same Stripe Checkout flow as the production Ghost. Two env vars
control it:

```bash
PROTOTYPE_LIMIT=12          # cap on the run; default 12
PROTOTYPE_AVAILABLE=true    # kill switch — set 'false' to pause sales
```

Inventory is counted from completed Stripe Checkout sessions whose
`metadata.sku === 'viso-prototype'` via the Stripe Search API, cached
in-memory for 60 seconds. The webhook invalidates the cache when a sale
lands so the page updates immediately.

To pause sales without changing the limit:

```bash
flyctl secrets set -a obscuruslabs PROTOTYPE_AVAILABLE=false
```

To raise or lower the cap:

```bash
flyctl secrets set -a obscuruslabs PROTOTYPE_LIMIT=20
```

## Discount codes

Five percent-off codes apply to the prototype only: `PROTO5`, `PROTO10`,
`PROTO15`, `PROTO20`, `PROTO25`. They live in Stripe (one coupon + one
promotion code per tier, restricted via `applies_to.products`). The
homepage accepts both `?code=PROTO10` shareable links *and* customers
typing the code on the Stripe-hosted checkout page.

### Bootstrap (one-time per environment)

```bash
# Test mode — staging
STRIPE_SECRET_KEY=sk_test_... node scripts/seed-discounts.mjs
flyctl secrets set -a obscuruslabs-staging STRIPE_PROTOTYPE_PRODUCT_ID=prod_…

# Live mode — production
STRIPE_SECRET_KEY=sk_live_... node scripts/seed-discounts.mjs
flyctl secrets set -a obscuruslabs STRIPE_PROTOTYPE_PRODUCT_ID=prod_…
```

The script is idempotent — re-running detects existing product, coupons,
and codes and skips them. Use `DISCOUNT_TIERS=…` (JSON) to override
defaults, e.g. swap `PROTO15` for a themed string like `LAUNCH15`.

### Disabling a code

Deactivate in Stripe Dashboard → Products → Coupons (or via the API).
The homepage validation catches the `active: false` flip within ~60s
(in-memory cache TTL).

### Removing the product restriction (rare)

If you want a code to apply to the Ghost as well, edit the coupon's
`applies_to.products` in Stripe Dashboard or recreate without the
restriction. The /api/checkout route also enforces prototype-only
defense-in-depth at the API layer.

## Waitlist (double opt-in)

`POST /api/waitlist` validates the email, signs a 7-day HMAC token, and
emails a confirmation link. The contact is **not** written to the Resend
audience at this point.

`GET /api/waitlist/confirm?token=…` verifies the token, calls
`addToWaitlistAudience` (idempotent), and redirects to
`/waitlist/confirmed`. Bad/expired tokens redirect to `/waitlist/error`.

The HMAC secret lives in `WAITLIST_TOKEN_SECRET` and must be set per
environment:

```bash
flyctl secrets set -a obscuruslabs-staging \
  WAITLIST_TOKEN_SECRET="$(openssl rand -base64 32)"

flyctl secrets set -a obscuruslabs \
  WAITLIST_TOKEN_SECRET="$(openssl rand -base64 32)"
```

Use a different value in each environment so a leaked staging secret
can't forge prod confirmations.
