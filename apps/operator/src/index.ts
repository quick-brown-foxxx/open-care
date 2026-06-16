// apps/operator — sole holder of OPERATOR_TOKEN.
//
// The MVP has no `src/index.ts` yet. When written, the Worker is a
// thin auth-and-route layer:
//
//   import { Hono } from "hono";
//   const app = new Hono<{ Bindings: Bindings }>();
//
//   app.use("*", async (c, next) => {
//     const provided = c.req.header("Authorization")?.replace(/^Bearer /, "");
//     const expected = c.env.OPERATOR_TOKEN;
//     // Constant-time comparison here.
//     if (!provided || provided !== expected) {
//       return c.json({ error: { code: "UNAUTHORIZED", message: "..." } }, 401);
//     }
//     await next();
//   });
//
//   app.post("/api/disbursements", (c) =>
//     c.env.VAULT_API_WRITE.fetch(c.req.raw));
//   app.post("/api/anchor/manual", (c) =>
//     c.env.VAULT_ANCHOR_CRON.fetch(c.req.raw));
//   app.get("/tg/internal/pending-requests", (c) =>
//     c.env.TG_BOT.fetch(c.req.raw));
//   app.post("/tg/internal/send-code", (c) =>
//     c.env.TG_BOT.fetch(c.req.raw));
//
//   export default app;
//
// The wrangler config will declare the service bindings:
//   services:
//     - binding: "VAULT_API_WRITE",    service: "vault-api-write"
//     - binding: "VAULT_ANCHOR_CRON",  service: "vault-anchor-cron"
//     - binding: "TG_BOT",             service: "tg-bot"
//
// See docs/specs/01-architecture.md §"Operator Worker trust model"
// for the full design.
export {};
