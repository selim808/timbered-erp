# fetchData — Shopify admin extensions

Extensions that run inside Shopify admin under the **fetchData** app.

## Kanban Phase panel

A block on every order page:

- each item with its current phase (badge) and the date it got there
- a dropdown of phases, grouped by phase group, loaded live from Supabase
- **History** per item: every phase, date and who set it (Auto / ERP / Shopify / partner)

It reads and writes the same data as the ERP:

| Field (order metafield)      | What it is                                  |
|------------------------------|---------------------------------------------|
| `timbered.kanban_phase`      | The data (JSON, keyed by line item id)      |
| `timbered.kanban_status`     | Readable current phase, one row per item ("Title → Phase") |
| `timbered.kanban_timeline`   | Readable history, one row per phase change  |

Saves use Shopify's `compareDigest`, so a change made at the same time in the ERP is never overwritten.

## Publish it (once, ~20 minutes)

You need Node.js 20+ and your Shopify login.

1. Install Shopify CLI
   ```
   npm install -g @shopify/cli
   ```
2. Get the code
   ```
   git clone https://github.com/selim808/timbered-erp
   cd timbered-erp/shopify-app
   npm install
   ```
3. Link to fetchData. This signs you in and copies fetchData's **current** settings into `shopify.app.toml` (nothing changes yet).
   ```
   shopify app config link
   ```
   Pick your organisation, then choose **fetchData** (do not create a new app).
4. Open `shopify.app.toml` and check the scopes line includes `read_orders` and `write_orders`. Add them if missing and keep everything else as is:
   ```
   [access_scopes]
   scopes = "...existing scopes...,read_orders,write_orders"
   ```
5. Publish
   ```
   shopify app deploy
   ```
   Confirm the release when asked.
6. Open any order in Shopify admin. If the **Kanban Phase** block isn't showing, use the **Apps** / app-block menu on the order page to add it.

If you added scopes in step 4, Shopify asks you to approve them the next time fetchData is opened.

## Change it later

Edit `extensions/kanban-panel/src/BlockExtension.jsx`, then run `shopify app deploy` again.
