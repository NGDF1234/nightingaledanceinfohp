import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

interface Env {
  PUSH_STORE: KVNamespace;
  SITE_URL: string;
  DATA_URL: string;
  VAPID_SUBJECT: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  TEST_KEY: string;
}

interface News {
  date: string;
  tag: string;
  title: string;
  comment?: string;
  url?: string;
  ticketSales?: TicketSale[];
}

interface Schedule {
  date: string;
  startTime: string;
  title: string;
  tag: string;
  place?: string;
  station?: string;
  url?: string;
  ticketSales?: TicketSale[];
}

interface TicketSale {
  type: "抽選販売" | "先着販売" | "一般販売" | "抽選" | "先着" | "一般" | string;
  label?: string;
  startAt?: string;
  endAt?: string;
  url?: string;
}

interface TicketReminder {
  id: string;
  title: string;
  ticketKind: "抽選販売" | "先着販売" | "一般販売" | "抽選" | "先着" | "一般" | string;
  ticketLabel: string;
  reminderType: "start" | "end" | string;
  reminderLabel: string;
  notifyAt: string;
  targetAt: string;
  startAt: string;
  endAt?: string;
  url?: string;
}

interface HomepageData {
  news?: News[];
  schedule?: Schedule[];
  ticketReminders?: TicketReminder[];
}

const MINUTE_MS = 60 * 1000;
const TICKET_SENT_TTL_SECONDS = 60 * 60 * 24 * 200;

const json = (data: unknown, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const cors = (origin: string, env: Env) => {
  const allowed = new URL(env.SITE_URL).origin;
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  };
};

const fingerprint = (item: object) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(item))))
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 120);

async function subscriptions(env: Env) {
  const result: PushSubscription[] = [];
  let cursor: string | undefined;
  do {
    const page = await env.PUSH_STORE.list({ prefix: "sub:", cursor });
    for (const key of page.keys) {
      const value = await env.PUSH_STORE.get(key.name, "json");
      if (value) result.push(value as PushSubscription);
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return result;
}

async function broadcast(env: Env, payload: object) {
  let delivered = 0;
  await Promise.all(
    (await subscriptions(env)).map(async (subscription) => {
      try {
        const request = await buildPushPayload(
          { data: JSON.stringify(payload), options: { ttl: 3600 } },
          subscription,
          {
            subject: env.VAPID_SUBJECT,
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
          },
        );
        const response = await fetch(subscription.endpoint, { ...request, body: request.body as BodyInit });
        if (response.ok) delivered += 1;
        if (response.status === 404 || response.status === 410) {
          await env.PUSH_STORE.delete(`sub:${fingerprint({ endpoint: subscription.endpoint })}`);
        }
        await env.PUSH_STORE.put(
          "debug:last-push",
          JSON.stringify({
            at: new Date().toISOString(),
            status: response.status,
            ok: response.ok,
            endpointHost: new URL(subscription.endpoint).host,
          }),
        );
      } catch (error) {
        await env.PUSH_STORE.put(
          "debug:last-push",
          JSON.stringify({ at: new Date().toISOString(), status: 0, ok: false, error: String(error) }),
        );
      }
    }),
  );
  return delivered;
}

async function runNotifications(env: Env, now = new Date()) {
  const data = (await fetch(env.DATA_URL, { headers: { "Cache-Control": "no-cache" } }).then((r) =>
    r.json(),
  )) as HomepageData;

  const news = Array.isArray(data.news) ? data.news : [];
  const schedule = Array.isArray(data.schedule) ? data.schedule : [];
  const ticketReminders = ticketRemindersFromData(data);

  await runNewsNotifications(env, news);
  await runDailyScheduleNotification(env, schedule, now);
  await runScheduleStartNotifications(env, schedule, now);
  await runTicketReminderNotifications(env, ticketReminders, now);
}

async function runNewsNotifications(env: Env, news: News[]) {
  const previous = await env.PUSH_STORE.get("state:latest-news");
  const latest = news[0] ? fingerprint(news[0]) : "";
  if (previous && latest !== previous) {
    const index = news.findIndex((item) => fingerprint(item) === previous);
    const targets = news.slice(0, index < 0 ? 1 : index).reverse();
    for (const item of targets) {
      await broadcast(env, {
        title: `新着NEWS｜${item.tag}`,
        body: item.title,
        url: `${env.SITE_URL}/news.html`,
        tag: `news-${fingerprint(item)}`,
      });
    }
  }
  if (latest && latest !== previous) await env.PUSH_STORE.put("state:latest-news", latest);
}

async function runDailyScheduleNotification(env: Env, schedule: Schedule[], now: Date) {
  const jst = new Date(now.getTime() + 9 * 3600000);
  const date = jst.toISOString().slice(0, 10);
  const hour = jst.getUTCHours();
  const minute = jst.getUTCMinutes();
  const today = schedule.filter((item) => item.date === date);
  if (hour !== 8 || minute >= 2 || !today.length) return;

  const key = `sent:daily:${date}`;
  if (await env.PUSH_STORE.get(key)) return;
  await broadcast(env, {
    title: "今日の出演予定",
    body: today.map((item) => `${item.startTime} ${item.title}`).join("\n"),
    url: `${env.SITE_URL}/news.html`,
    tag: `daily-${date}`,
  });
  await env.PUSH_STORE.put(key, "1", { expirationTtl: 604800 });
}

async function runScheduleStartNotifications(env: Env, schedule: Schedule[], now: Date) {
  for (const item of schedule) {
    const start = new Date(`${item.date}T${item.startTime}:00+09:00`);
    if (!isValidDate(start)) continue;
    const diff = start.getTime() - now.getTime();
    const place = item.place || item.station || "";
    const body = `${item.startTime} ${item.title}${place ? `｜${place}` : ""}`;

    if (diff > 1740000 && diff <= 1860000) {
      const key = `sent:30min:${fingerprint(item)}`;
      if (!(await env.PUSH_STORE.get(key))) {
        await broadcast(env, {
          title: "開始30分前",
          body,
          url: `${env.SITE_URL}/schedule.html`,
          tag: key,
        });
        await env.PUSH_STORE.put(key, "1", { expirationTtl: 604800 });
      }
    }

    if (diff <= 0 && diff > -120000) {
      const key = `sent:start:${fingerprint(item)}`;
      if (!(await env.PUSH_STORE.get(key))) {
        await broadcast(env, {
          title: "開始時間です",
          body,
          url: `${env.SITE_URL}/schedule.html`,
          tag: key,
        });
        await env.PUSH_STORE.put(key, "1", { expirationTtl: 604800 });
      }
    }
  }
}

async function runTicketReminderNotifications(env: Env, reminders: TicketReminder[], now: Date) {
  for (const item of reminders) {
    if (!shouldUseTicketReminder(item)) continue;
    const notifyAt = new Date(item.notifyAt);
    const targetAt = new Date(item.targetAt);
    if (!isValidDate(notifyAt) || !isValidDate(targetAt)) continue;
    if (!isInMinuteWindow(notifyAt, now)) continue;

    const key = `sent:ticket:${fingerprint({ id: item.id, notifyAt: item.notifyAt })}`;
    if (await env.PUSH_STORE.get(key)) continue;

    await broadcast(env, {
      title: ticketNotificationTitle(item),
      body: ticketNotificationBody(item, targetAt),
      url: item.url || `${env.SITE_URL}/schedule.html`,
      tag: key,
    });
    await env.PUSH_STORE.put(key, "1", { expirationTtl: TICKET_SENT_TTL_SECONDS });
  }
}

function shouldUseTicketReminder(item: TicketReminder) {
  if (!item.id || !item.title || !item.ticketLabel || !item.notifyAt || !item.targetAt) return false;
  if (item.reminderType === "start") {
    return ["抽選販売", "先着販売", "一般販売", "抽選", "先着", "一般"].includes(item.ticketKind);
  }
  if (item.reminderType === "end") return item.ticketKind === "抽選販売" || item.ticketKind === "抽選";
  return false;
}

function ticketRemindersFromData(data: HomepageData) {
  const reminders = Array.isArray(data.ticketReminders) ? [...data.ticketReminders] : [];
  const items = [...(Array.isArray(data.news) ? data.news : []), ...(Array.isArray(data.schedule) ? data.schedule : [])];

  for (const item of items) {
    if (!Array.isArray(item.ticketSales)) continue;
    for (const sale of item.ticketSales) {
      reminders.push(...ticketRemindersFromSale(item, sale));
    }
  }

  return reminders;
}

function ticketRemindersFromSale(item: News | Schedule, sale: TicketSale) {
  const ticketKind = normalizeTicketKind(sale.type);
  const ticketLabel = String(sale.label || sale.type || ticketKind).trim();
  const url = sale.url || item.url || "";
  const startAt = sale.startAt || "";
  const endAt = sale.endAt || "";
  const base = {
    title: item.title,
    ticketKind,
    ticketLabel,
    startAt,
    endAt,
    url,
  };
  const reminders: TicketReminder[] = [];

  if (ticketKind === "抽選販売") {
    if (startAt) {
      reminders.push({
        ...base,
        id: `ticket:${fingerprint({ title: item.title, ticketKind, startAt, type: "start" })}`,
        reminderType: "start",
        reminderLabel: "受付開始",
        notifyAt: startAt,
        targetAt: startAt,
      });
    }
    if (endAt) {
      reminders.push({
        ...base,
        id: `ticket:${fingerprint({ title: item.title, ticketKind, endAt, type: "end-30" })}`,
        reminderType: "end",
        reminderLabel: "受付終了30分前",
        notifyAt: offsetIsoMinutes(endAt, -30),
        targetAt: endAt,
      });
    }
    return reminders;
  }

  if ((ticketKind === "先着販売" || ticketKind === "一般販売") && startAt) {
    reminders.push({
      ...base,
      id: `ticket:${fingerprint({ title: item.title, ticketKind, startAt, type: "start-30" })}`,
      reminderType: "start",
      reminderLabel: "販売開始30分前",
      notifyAt: offsetIsoMinutes(startAt, -30),
      targetAt: startAt,
    });
  }

  return reminders;
}

function normalizeTicketKind(value = "") {
  const text = String(value).trim();
  if (text.includes("抽選")) return "抽選販売";
  if (text.includes("先着")) return "先着販売";
  if (text.includes("一般")) return "一般販売";
  return text;
}

function offsetIsoMinutes(value: string, minutes: number) {
  const date = new Date(value);
  if (!isValidDate(date)) return "";
  return new Date(date.getTime() + minutes * MINUTE_MS).toISOString();
}

function isInMinuteWindow(target: Date, now: Date) {
  const diff = target.getTime() - now.getTime();
  return diff > -2 * MINUTE_MS && diff <= MINUTE_MS;
}

function isValidDate(value: Date) {
  return !Number.isNaN(value.getTime());
}

function ticketNotificationTitle(item: TicketReminder) {
  if (item.reminderType === "end") return "抽選販売終了30分前";
  if (item.ticketKind === "抽選販売" || item.ticketKind === "抽選") return "抽選販売開始";
  if (item.ticketKind === "先着販売" || item.ticketKind === "先着") return "先着販売開始30分前";
  if (item.ticketKind === "一般販売" || item.ticketKind === "一般") return "一般販売開始30分前";
  return "チケット販売開始30分前";
}

function ticketNotificationBody(item: TicketReminder, targetAt: Date) {
  const suffix = item.reminderType === "end" ? "まで" : "から";
  return `${formatJstDateTime(targetAt)}${suffix} ${item.ticketLabel}\n${item.title}`;
}

function formatJstDateTime(value: Date) {
  const jst = new Date(value.getTime() + 9 * 3600000);
  const month = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(jst.getUTCDate()).padStart(2, "0");
  const hour = String(jst.getUTCHours()).padStart(2, "0");
  const minute = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${month}/${day} ${hour}:${minute}`;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || env.SITE_URL;
    const headers = cors(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (url.pathname === "/vapid-public-key") return json({ publicKey: env.VAPID_PUBLIC_KEY }, 200, headers);
    if (url.pathname === "/test" && request.method === "POST") {
      if (request.headers.get("X-Test-Key") !== env.TEST_KEY) return json({ error: "unauthorized" }, 401, headers);
      const delivered = await broadcast(env, {
        title: "通知テスト",
        body: "プッシュ通知の直接送信テストです。",
        url: `${env.SITE_URL}/news.html`,
        tag: `direct-test-${Date.now()}`,
      });
      return json({ ok: true, delivered }, 200, headers);
    }
    if (url.pathname === "/subscribe" && request.method === "POST") {
      const subscription = (await request.json()) as PushSubscription;
      if (!subscription.endpoint || !subscription.keys) return json({ error: "invalid subscription" }, 400, headers);
      await env.PUSH_STORE.put(`sub:${fingerprint({ endpoint: subscription.endpoint })}`, JSON.stringify(subscription));
      return json({ ok: true }, 201, headers);
    }
    return json({ ok: true }, 200, headers);
  },
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runNotifications(env));
  },
} satisfies ExportedHandler<Env>;
