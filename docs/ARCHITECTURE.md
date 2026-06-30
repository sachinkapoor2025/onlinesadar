# HR E-Commerce Platform — Architecture

## Goals

- Full-featured e-commerce (catalog, cart, checkout, orders, admin)
- Dual payment gateways: **Stripe** (USA) and **Razorpay** (India), region-configurable
- Customer capture at every touchpoint (partial name/email saved for outreach)
- **SEO-first** storefront (SSR, metadata, sitemap, structured data)
- **AI-driven development**: developers use Cursor prompts; no manual redeploy for code edits
- **Multi-developer**: Git + branch workflow; Cursor rules keep changes consistent
- **AWS serverless**, near-zero idle cost, auto-scales under load

## Why This Stack

| Layer | Choice | Idle cost | Rationale |
|-------|--------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | ~$0 on Amplify/OpenNext | SSR/SSG for SEO; deploy from GitHub without Docker |
| API | API Gateway + Lambda | $0 | Pay per request |
| Database | DynamoDB on-demand | ~$0 | No provisioned capacity; no RDS always-on cost |
| Auth | Cognito User Pool | Free tier | Login/logout, JWT, admin roles |
| Files | S3 + CloudFront | Pennies | Product images, bulk CSV uploads |
| Payments | Stripe + Razorpay | $0 until transaction | Config-driven per region |
| IaC | AWS SAM | $0 | Simpler than raw CloudFormation for serverless |
| CI/CD | GitHub Actions | Free tier | Push → deploy infra + app |

**No Docker for app code** — GitHub Actions builds and deploys directly. Cursor edits code → push → auto deploy. Docker only if you later need custom runtimes (not required now).

## Repository Layout

```
onlinesadar/
├── AGENTS.md                 # Instructions for Cursor AI
├── apps/
│   ├── web/                  # Next.js storefront + admin
│   └── api/                  # Lambda handlers (TypeScript)
├── packages/
│   └── shared/               # Types, constants, validation (Zod)
├── infrastructure/
│   ├── template.yaml         # SAM: DynamoDB, Cognito, Lambda, S3, API GW
│   └── samconfig.toml
├── .cursor/rules/            # Persistent AI coding rules
├── .github/workflows/        # deploy.yml
└── docs/
```

## DynamoDB Multi-Table Design

Per-domain tables (`PAY_PER_REQUEST`), named `onlinesadar-<domain>-{env}` and wired into
the Lambda via env vars (`PRODUCTS_TABLE`, `ORDERS_TABLE`, `CARTS_TABLE`,
`CUSTOMERS_TABLE`, `EVENTS_TABLE`, `CONFIG_TABLE`).

| Table | PK | SK | Notes / GSIs |
|-------|----|----|--------------|
| products | `PRODUCT#<slug>` / `CATEGORY#<slug>` | `META` | GSI1 `CATEGORY#<slug>` → products |
| orders | `ORDER#<orderId>` | `META` | GSI1 byCustomer (`USER#<key>`), GSI2 byDate (`ENTITY#ORDER`), GSI3 byStatus (`STATUS#<status>`) |
| carts | `CART#<userKey>` | `META` | GSI1 byUpdatedAt (`ENTITY#CART`) + `itemCount`; TTL `expiresAt` |
| customers | `SESSION#<sessionId>` | `PROFILE` / `LEAD#<ts>` | GSI1 lead feed (`ENTITY#LEAD`) |
| events | `SESSION#<sessionId>` | `<ts>#<eventId>` | GSI1 byTypeDay (`<type>#<yyyy-mm-dd>`); TTL `expiresAt` (90d). Rollups: PK `ROLLUP#<yyyy-mm-dd>` |
| config | `CONFIG#PAYMENTS` | `META` | Stripe/Razorpay settings |

Order status lifecycle: `pending_payment → paid → processing → shipped → delivered`
(plus `cancelled` / `refunded`), with a `statusHistory[]` audit trail and tracking number.

Migration from the legacy single table: `npm run migrate:multitable` (copies orders +
leads/sessions; products re-seed via `import:usarakhi`).

## Background jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `ReviewEmailsCronFunction` | Every hour | Email customers 1 day after order is marked **Delivered** or **Complete**, linking to `/reviews` |

When admin sets order status to **Delivered** or **Complete**, the API sets `reviewEmailDueAt` (delivery + 1 day). The cron sends one email per order (tracked via `reviewEmailSentAt`).

## API Routes (Lambda)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/products` | List/search products |
| GET | `/products/{slug}` | Product detail |
| POST | `/products` | Admin: create product |
| PUT | `/products/{slug}` | Admin: update |
| DELETE | `/products/{slug}` | Admin: delete |
| POST | `/products/bulk` | Admin: CSV bulk upload |
| GET | `/categories` | List categories |
| POST | `/categories` | Admin: create |
| GET | `/cart` | Get cart |
| POST | `/cart/items` | Add to cart |
| DELETE | `/cart/items/{id}` | Remove item |
| POST | `/checkout` | Create order + payment intent |
| POST | `/webhooks/stripe` | Stripe webhook |
| POST | `/webhooks/razorpay` | Razorpay webhook |
| POST | `/leads` | Save partial customer info |
| POST | `/events` | First-party analytics events (batched, public) |
| GET | `/orders` | User orders |
| GET | `/orders/{orderId}` | Order detail (owner/admin) |
| GET | `/admin/orders` | Admin: list orders (filter `?status=`) |
| GET | `/admin/orders/{orderId}` | Admin: order detail |
| PATCH | `/admin/orders/{orderId}` | Admin: update status + tracking (schedules review email 1 day after delivered) |
| GET | `/admin/analytics/sales` | Admin: day/week/month payments received (excludes refunds) |
| GET | `/admin/analytics/overview` | Admin: traffic + funnel (`?days=`) |
| GET | `/admin/analytics/products` | Admin: most-viewed products |
| GET | `/admin/analytics/searches` | Admin: top + zero-result searches |
| GET | `/admin/sessions` | Admin: recent visitor sessions |
| GET | `/admin/sessions/{sessionId}` | Admin: full visitor journey |
| GET | `/admin/carts/abandoned` | Admin: abandoned carts (CSV in UI) |
| GET | `/admin/leads` | Admin: captured leads |
| GET | `/config/payments` | Public payment region config |

## Payment Flow

1. Checkout reads `CONFIG#PAYMENTS` → region (`US` → Stripe, `IN` → Razorpay)
2. Create order in DynamoDB (status: `pending_payment`)
3. Create Stripe PaymentIntent or Razorpay Order
4. Client completes payment
5. Webhook confirms → order status `paid` → inventory decrement

Secrets (Stripe/Razorpay keys) live in **SSM Parameter Store** / **Secrets Manager**, never in code.

## Customer / Lead Capture

Every form blur or debounced keystroke can POST to `/leads`:

- Anonymous `sessionId` (cookie) + optional `userId` after login
- Fields: name (partial OK), email, phone, page, product viewed
- Stored as `LEAD#` and `SESSION#` for CRM-style outreach

## SEO

- Next.js `generateMetadata` per product/category page
- `/sitemap.xml`, `/robots.txt` dynamic routes
- JSON-LD Product schema on product pages
- Canonical URLs, Open Graph tags

## Multi-Developer + Cursor Workflow

1. Clone repo, open in Cursor
2. Read `AGENTS.md` and `.cursor/rules/`
3. Log into admin portal locally or staging
4. Prompt: *"Add wishlist feature"* or *"Improve checkout UX"*
5. Cursor edits `apps/web` and `apps/api` following conventions
6. Push branch → PR → GitHub Actions deploys to staging
7. Multiple devs: feature branches, shared types in `packages/shared`

Admin credentials for staging are in team 1Password / SSM — developers never share source code in prompts; Cursor has repo access.

## AWS Deployment (GitHub Actions)

```
push main → build shared → build api → sam deploy → build web → Amplify/OpenNext deploy
```

### Estimated Monthly Cost (Low Traffic / Idle)

| Service | ~Cost |
|---------|-------|
| DynamoDB on-demand | $0–5 |
| Lambda + API GW | $0–3 |
| S3 + CloudFront | $1–5 |
| Cognito | $0 (under 50k MAU) |
| **Total idle/low** | **~$0–15/mo** |

Scales automatically; no manual intervention.

## Environment Variables

See `apps/web/.env.example` and `infrastructure/template.yaml` Parameters section.

## Future Extensions (prompt-ready)

- Wishlist, reviews, coupons, inventory alerts
- Email (SES), SMS (SNS)
- Multi-currency, multi-language
- Analytics (Plausible / GA4)
- Abandoned cart emails
