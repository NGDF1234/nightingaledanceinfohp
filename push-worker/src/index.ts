import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

interface Env { PUSH_STORE: KVNamespace; SITE_URL: string; DATA_URL: string; VAPID_SUBJECT: string; VAPID_PUBLIC_KEY: string; VAPID_PRIVATE_KEY: string; TEST_KEY: string }
interface News { date: string; tag: string; title: string; note?: string; url?: string }
interface Schedule { date: string; startTime: string; title: string; tag: string; place?: string; station?: string; url?: string }

const json = (data: unknown, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...headers } });
const cors = (origin: string, env: Env) => { const allowed = new URL(env.SITE_URL).origin; return { "Access-Control-Allow-Origin": origin === allowed ? origin : allowed, "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS" }; };
const fingerprint = (item: object) => btoa(unescape(encodeURIComponent(JSON.stringify(item)))).replace(/[^a-zA-Z0-9]/g, "").slice(0, 120);

async function subscriptions(env: Env) {
  const result: PushSubscription[] = []; let cursor: string | undefined;
  do { const page = await env.PUSH_STORE.list({ prefix: "sub:", cursor }); for (const key of page.keys) { const value = await env.PUSH_STORE.get(key.name, "json"); if (value) result.push(value as PushSubscription); } cursor = page.list_complete ? undefined : page.cursor; } while (cursor);
  return result;
}

async function broadcast(env: Env, payload: object) {
  let delivered = 0;
  await Promise.all((await subscriptions(env)).map(async (subscription) => {
    try {
      const request = await buildPushPayload({ data: JSON.stringify(payload), options: { ttl: 3600 } }, subscription, { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY });
      const response = await fetch(subscription.endpoint, { ...request, body: request.body as BodyInit });
      if (response.ok) delivered += 1;
      if (response.status === 404 || response.status === 410) await env.PUSH_STORE.delete(`sub:${fingerprint({ endpoint: subscription.endpoint })}`);
      await env.PUSH_STORE.put("debug:last-push", JSON.stringify({ at: new Date().toISOString(), status: response.status, ok: response.ok, endpointHost: new URL(subscription.endpoint).host }));
    } catch (error) {
      await env.PUSH_STORE.put("debug:last-push", JSON.stringify({ at: new Date().toISOString(), status: 0, ok: false, error: String(error) }));
    }
  }));
  return delivered;
}

async function runNotifications(env: Env, now = new Date()) {
  const data = await fetch(env.DATA_URL, { headers: { "Cache-Control": "no-cache" } }).then((r) => r.json()) as { news: News[]; schedule: Schedule[] };
  const previous = await env.PUSH_STORE.get("state:latest-news"); const latest = data.news[0] ? fingerprint(data.news[0]) : "";
  if (previous && latest !== previous) { const index = data.news.findIndex((item) => fingerprint(item) === previous); for (const item of data.news.slice(0, index < 0 ? 1 : index).reverse()) await broadcast(env, { title: `新着NEWS｜${item.tag}`, body: item.title, url: `${env.SITE_URL}/news.html`, tag: `news-${fingerprint(item)}` }); }
  if (latest && latest !== previous) await env.PUSH_STORE.put("state:latest-news", latest);
  const jst = new Date(now.getTime() + 9 * 3600000); const date = jst.toISOString().slice(0, 10); const hour = jst.getUTCHours(); const minute = jst.getUTCMinutes();
  const today = data.schedule.filter((item) => item.date === date);
  if (hour === 8 && minute < 2 && today.length && !(await env.PUSH_STORE.get(`sent:daily:${date}`))) { await broadcast(env, { title: "今日の出演予定", body: today.map((item) => `${item.startTime} ${item.title}`).join("\n"), url: `${env.SITE_URL}/news.html`, tag: `daily-${date}` }); await env.PUSH_STORE.put(`sent:daily:${date}`, "1", { expirationTtl: 604800 }); }
  for (const item of data.schedule) { const start = new Date(`${item.date}T${item.startTime}:00+09:00`); const diff = start.getTime() - now.getTime(); const key = `sent:30min:${fingerprint(item)}`; const place = item.place || item.station || ""; if (diff > 1740000 && diff <= 1860000 && !(await env.PUSH_STORE.get(key))) { await broadcast(env, { title: "開始30分前", body: `${item.startTime} ${item.title}${place ? `｜${place}` : ""}`, url: `${env.SITE_URL}/schedule.html`, tag: key }); await env.PUSH_STORE.put(key, "1", { expirationTtl: 604800 }); } }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url); const origin = request.headers.get("Origin") || env.SITE_URL; const headers = cors(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname === "/vapid-public-key") return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, headers);
    if (url.pathname === "/test" && request.method === "POST") {
      if (request.headers.get("X-Test-Key") !== env.TEST_KEY) return json({ error: "unauthorized" }, 401, headers);
      const delivered = await broadcast(env, { title: "通知テスト", body: "プッシュ通知の直接送信テストです。", url: `${env.SITE_URL}/news.html`, tag: `direct-test-${Date.now()}` });
      return json({ ok: true, delivered }, 200, headers);
    }
    if (url.pathname === "/subscribe" && request.method === "POST") { const subscription = await request.json() as PushSubscription; if (!subscription.endpoint || !subscription.keys) return json({ error: "invalid subscription" }, 400, headers); await env.PUSH_STORE.put(`sub:${fingerprint({ endpoint: subscription.endpoint })}`, JSON.stringify(subscription)); return json({ ok: true }, 201, headers); }
    return json({ ok: true }, 200, headers);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) { ctx.waitUntil(runNotifications(env)); }
} satisfies ExportedHandler<Env>;
