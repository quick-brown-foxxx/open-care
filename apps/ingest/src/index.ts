import { Hono } from "hono";

type Bindings = {
  HELIUS_WEBHOOK_AUTH_HEADER: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/webhook/helius", async (c) => {
  const expected = c.env.HELIUS_WEBHOOK_AUTH_HEADER;
  const provided = c.req.header("Authorization");

  if (!provided || provided !== expected) {
    return c.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid webhook auth" } },
      401,
    );
  }

  return c.json({ accepted: 1, duplicates: 0 }, 200);
});

app.all("*", (c) => {
  return c.notFound();
});

export default app;
