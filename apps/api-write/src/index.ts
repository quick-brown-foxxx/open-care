import { Hono } from "hono";

type Bindings = {
  vault_db: D1Database;
  OPERATOR_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Auth middleware — every route on this Worker is operator-authenticated.
// The Worker is not publicly routable; it is reached only via service
// binding from vault-operator, which already validates OPERATOR_TOKEN.
// The redundant check here is a defence-in-depth measure.
app.use("*", async (c, next) => {
  const provided = c.req
    .header("Authorization")
    ?.replace(/^Bearer /, "");
  const expected = c.env.OPERATOR_TOKEN;

  if (!provided || provided !== expected) {
    // Real implementation MUST use a constant-time comparison here
    // (e.g., crypto.subtle.timingSafeEqual over the byte arrays).
    // The MVP mock uses `!==` for brevity; documented in
    // docs/specs/04-api.md §"Operator auth". The mock returns the
    // standard error envelope from §"Standard error response".
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid operator token.",
        },
      },
      401,
    );
  }

  await next();
});

// The real handler must validate the disbursement request body, persist
// the disbursement row in vault_db, and enqueue the on-chain transfer
// for operator approval. The mock returns `{ ok: true }`.
app.post("/api/disbursements", (c) => {
  return c.json({ ok: true }, 200);
});

// The real handler must trigger an anchor run: compute merkle root,
// persist anchor_runs row, and submit the on-chain anchor transaction.
// The mock returns `{ ok: true }`.
app.post("/api/anchor/manual", (c) => {
  return c.json({ ok: true }, 200);
});

app.all("*", (c) => {
  return c.notFound();
});

export default app;