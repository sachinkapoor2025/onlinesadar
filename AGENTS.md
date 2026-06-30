# AGENTS.md — Cursor AI Development Guide

This repository is an **AI-first e-commerce platform**. Developers add features by prompting Cursor, not by hand-editing scattered files without context.

## Before You Change Anything

1. Read `docs/ARCHITECTURE.md`
2. Follow patterns in existing code — match naming, folder structure, error handling
3. Shared types live in `packages/shared` — update there first, then API and web
4. Never commit secrets; use env vars / SSM parameter names documented in `.env.example`

## Project Structure

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 15 storefront + `/admin` portal |
| `apps/api` | AWS Lambda handlers (one folder per domain) |
| `packages/shared` | Zod schemas, TypeScript types, constants |
| `infrastructure/template.yaml` | SAM — add new Lambda functions here |
| `.cursor/rules/` | Coding conventions (auto-loaded) |

## Adding a New API Feature

1. Add Zod schema + types in `packages/shared/src/schemas/`
2. Add handler in `apps/api/src/handlers/<domain>/`
3. Register route in `apps/api/src/router.ts`
4. Add Lambda + API Gateway event in `infrastructure/template.yaml`
5. Add client hook/page in `apps/web`
6. Update `docs/ARCHITECTURE.md` API table if public

## Adding a New Admin Feature

- Admin routes: `apps/web/src/app/admin/`
- Protect with `middleware.ts` (Cognito session check)
- Use existing UI components from `apps/web/src/components/ui/`

## Adding a Storefront Feature

- Pages: `apps/web/src/app/(store)/`
- SEO: always add `generateMetadata` and consider JSON-LD
- Customer tracking: call `POST /leads` on meaningful form interactions

## Payments

- Region config: `CONFIG#PAYMENTS` in DynamoDB
- US → Stripe (`apps/api/src/handlers/payments/stripe.ts`)
- IN → Razorpay (`apps/api/src/handlers/payments/razorpay.ts`)
- Never store card data; use gateway tokens only

## Database

- Single-table DynamoDB — follow PK/SK patterns in ARCHITECTURE.md
- Use `packages/shared/src/db/keys.ts` for key builders

## Testing Changes Locally

```bash
npm install
npm run dev          # Next.js on :3000
npm run dev:api      # SAM local API on :3001
```

## Deploy

Push to `main` triggers GitHub Actions. Do not manually deploy unless fixing CI.

## Common Prompts (Examples)

- "Add product reviews with star rating and admin moderation"
- "Add coupon code support at checkout"
- "Improve product page SEO with FAQ schema"
- "Add abandoned cart email using SES"

Always preserve backward compatibility for existing orders and cart sessions.
