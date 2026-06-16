import { Hono } from "hono";

type Bindings = {
  HELIUS_WEBHOOK_AUTH_HEADER: string;
  HELIUS_RPC_URL?: string; // Used by the real implementation when fetching finalized txs.
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/webhook/helius", async (c) => {
  const expected = c.env.HELIUS_WEBHOOK_AUTH_HEADER;
  const provided = c.req.header("Authorization");

  if (!provided || provided !== expected) {
    // Real implementation MUST use a constant-time comparison here
    // (e.g., a custom XOR-and-OR loop over the byte arrays). The MVP
    // mock uses `!==` for brevity; this is documented in
    // docs/specs/04-api.md §"Helius auth". The mock returns the
    // standard error envelope from §"Standard error response".
    return c.json(
      {
        error: {
          code: "UNAUTHORIZED",
          message: "Invalid webhook auth.",
        },
      },
      401,
    );
  }

  // The real handler must parse the request body (an array of webhook
  // entries) and count distinct signatures: `accepted` is the count of
  // new rows inserted into helius_inbox, `duplicates` is the count of
  // signatures already present. The mock returns constants; the real
  // implementation must not.
  return c.json({ accepted: 1, duplicates: 0 }, 200);
});

app.all("*", (c) => {
  return c.notFound();
});

export default app;

