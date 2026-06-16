import { Hono } from "hono";

type Bindings = {
  TG_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.post("/tg/webhook", async (c) => {
  const expected = c.env.TG_WEBHOOK_SECRET;
  const received = c.req.header("X-Telegram-Bot-Api-Secret-Token");

  if (!received || received !== expected) {
    return c.json({ ok: false, error: "Invalid webhook secret" }, 401);
  }

  return c.json({ ok: true }, 200);
});

app.all("*", (c) => {
  return c.notFound();
});

export default app;
