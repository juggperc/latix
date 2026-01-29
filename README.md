# Latix

Fast, secure AI chat with persistent memory and a credits-based pricing model.

Latix connects to language models through OpenRouter and remembers context across sessions using a per-account memory system inspired by Clawdbot. Every model is dynamically priced with a platform margin so operational costs are always covered.

## Features

- **Streaming chat** via OpenRouter with model selection
- **Persistent memory** — preferences, decisions, and facts recalled across sessions using vector similarity search
- **Credit system** — per-token billing with configurable platform markup on every model
- **Subscriptions** — monthly plans that auto-top-up credits via Stripe
- **Secure by default** — all data scoped per account, protected routes, JWT sessions

## Stack

Next.js, TypeScript, Tailwind CSS, Drizzle ORM, SQLite, NextAuth, Stripe

## Setup

```
cp .env.example .env
```

Fill in your keys:

- `NEXTAUTH_SECRET` — any random string
- `OPENROUTER_API_KEY` — from openrouter.ai
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — for subscriptions (optional)

```
npm install
npm run dev
```

## Models

Models are configured in `src/lib/models.ts`. Each entry defines the OpenRouter cost and a `platformMarkup` multiplier. The user-facing credit cost is always OpenRouter price x markup, ensuring the platform never operates at a loss.

Currently ships with a free model. Add paid models by appending to the `MODELS` array.

## Plans

| Plan | Price | Monthly Credits |
|------|-------|-----------------|
| Free | $0 | 0 (free models only) |
| Pro | $15/mo | 15,000 |

1 credit = $0.001
