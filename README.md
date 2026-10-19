# The Family Store

A Next.js storefront prototype for The Family Store, with a responsive product grid, category filters, search, and a client-side bag. Product content is sample data from the inventory screenshot; quantities and prices are for the demo only.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Supabase handoff

The storefront currently imports its catalog from `src/data/products.ts`. Replace that mock catalog with a Supabase query once the inventory schema is available. Keep the UI-facing `Product` fields (`id`, `name`, `category`, `price`, `stock`, `image`, `note`, `color`) or map the database rows into that shape. Add Supabase credentials through environment variables; do not commit secrets.
