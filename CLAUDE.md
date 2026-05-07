## Current state (as of session 1)

### Decisions made
- Stack: Next.js 15 + TypeScript + Tailwind + Supabase + WooCommerce REST API
- Hosting: Vercel
- No webhooks yet — use REST API polling + Vercel Cron for WC sync
- TanStack Query for data fetching hooks
- Axios for WooCommerce calls

### Order lifecycle
placed → reviewed → planning → production → shipping → warehouse → delivery → follow_up
Every status change must be logged to order_status_history.

### Roles
owner | manager | employee
Each has its own route group with a layout.tsx permission gate.

### Module build order
1. Types (types/index.ts)          ← START HERE
2. Supabase client setup
3. WooCommerce client setup
4. SQL migrations
5. Auth module
6. Orders module (read-only first)
7. Order status flow
8. Products module
9. Production module
10. Customers, Reports, Settings

### What is done
- [x] create-next-app scaffolded
- [x] dependencies installed
- [x] .env.local created
- [x] CLAUDE.md created
- [x] types/index.ts
- [x] Supabase clients
- [x] WooCommerce client
- [x] SQL migrations