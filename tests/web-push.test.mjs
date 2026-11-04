import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import { DEFAULT_NOTIFICATIONS } from "../server/user-preferences.mjs";
import {
  backgroundAlerts,
  pushSnapshot,
  validatePushDevice,
} from "../server/web-push.mjs";
import { handler } from "../server/api.mjs";

const now = Date.parse("2026-11-04T18:00:00Z");
const key = "soccer/bra.1/123";
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/example",
  keys: {
    p256dh: Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 1)]).toString(
      "base64url",
    ),
    auth: Buffer.alloc(16, 2).toString("base64url"),
  },
};

test("device validation restricts push endpoints and expires old games", () => {
  const body = {
    subscription,
    preferences: DEFAULT_NOTIFICATIONS,
    games: [
      { key, date: new Date(now).toISOString() },
      { key: "soccer/bra.1/456", date: "2026-11-01T18:00:00Z" },
    ],
  };
  const device = validatePushDevice(body, now);
  assert.match(device.id, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(device.games), [key]);
  for (const endpoint of [
    "https://127.0.0.1/push",
    "https://fcm.googleapis.com.evil.test/push",
    "https://user@fcm.googleapis.com/push",
  ])
    assert.throws(() =>
      validatePushDevice(
        { ...body, subscription: { ...subscription, endpoint } },
        now,
      ),
    );
  assert.throws(() =>
    validatePushDevice(
      {
        ...body,
        games: [{ key: "soccer/nope/123", date: new Date(now).toISOString() }],
      },
      now,
    ),
  );
});

test("monitor baselines suppress old alerts and reuse foreground goal detection", () => {
  const detail = (offset, score) => ({
    fetchedAt: new Date(now + offset).toISOString(),
    events: [],
    match: {
      sport: "soccer",
      league: "bra.1",
      id: "123",
      state: "live",
      statusName: "IN_PROGRESS",
      period: 1,
      home: { id: "1", name: "Casa", score },
      away: { id: "2", name: "Fora", score: "0" },
    },
  });
  const baseline = pushSnapshot(key, detail(0, "0"));
  const current = pushSnapshot(key, detail(60_000, "1"));
  assert.equal(pushSnapshot(key, { ...detail(0, "0"), stale: true }), null);
  assert.deepEqual(backgroundAlerts(null, current), []);
  assert.deepEqual(backgroundAlerts(current, baseline), []);
  assert.deepEqual(
    backgroundAlerts(baseline, pushSnapshot(key, detail(6 * 60_000, "2"))),
    [],
  );
  assert.equal(backgroundAlerts(baseline, current)[0].url, "/partida/" + key);
});

test("push monitor and device registration reject unauthenticated requests", async () => {
  for (const [url, method] of [
    ["/api/push/monitor", "GET"],
    ["/api/me/push", "POST"],
  ]) {
    const response = { setHeader() {}, end() {} };
    await handler({ url, method, headers: {} }, response);
    assert.equal(response.statusCode, 401);
  }
});

test("service worker shows push notifications and confines click URLs to Sportstates", async () => {
  const listeners = {};
  const displayed = [];
  const opened = [];
  const self = {
    location: { origin: "https://sportstates.test" },
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
    registration: {
      showNotification(title, options) {
        displayed.push({ title, options });
        return Promise.resolve();
      },
    },
    clients: {
      async matchAll() {
        return [];
      },
      openWindow(url) {
        opened.push(url);
      },
    },
  };
  vm.runInNewContext(
    readFileSync(
      new URL("../public/notifications-sw.js", import.meta.url),
      "utf8",
    ),
    { self, URL },
  );
  let task;
  const waitUntil = (promise) => {
    task = promise;
  };
  listeners.push({
    data: {
      json: () => ({
        id: "goal",
        title: "Gol",
        body: "Casa 1 × 0 Fora",
        url: "/partida/" + key,
      }),
    },
    waitUntil,
  });
  await task;
  assert.equal(displayed[0].options.tag, "goal");
  listeners.notificationclick({
    notification: { data: { url: "https://evil.test" }, close() {} },
    waitUntil,
  });
  await task;
  assert.deepEqual(opened, ["https://sportstates.test/"]);
});

test("service worker acknowledges a diagnostic push only after requesting the OS notice", async () => {
  const listeners = {};
  const received = [];
  let fail = false;
  const self = {
    location: { origin: "https://sportstates.test" },
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
    registration: {
      async showNotification() {
        if (fail) throw new Error("Denied");
      },
    },
    clients: {
      async matchAll() {
        return [
          {
            postMessage(message) {
              received.push(message.shown);
            },
          },
        ];
      },
    },
  };
  vm.runInNewContext(
    readFileSync(
      new URL("../public/notifications-sw.js", import.meta.url),
      "utf8",
    ),
    { self, URL },
  );
  let task;
  const event = {
    data: {
      json: () => ({
        id: "sportstates-test:123",
        title: "Teste",
        body: "Aviso",
      }),
    },
    waitUntil(promise) {
      task = promise;
    },
  };
  listeners.push(event);
  await task;
  fail = true;
  listeners.push(event);
  await assert.rejects(task, /Denied/);
  assert.deepEqual(received, [true, false]);
});

test("personalized announcement links one match directly and groups link home", async () => {
  const { validateAnnouncement } = await import("../server/web-push.mjs");
  const draft = {
    id: "d4e145f2-560b-48cd-afbd-19a2dad1fd82",
    title: " Brasileirão ",
    body: "Hoje às 21h.",
  };
  const first = "soccer/bra.1/123";
  const second = "soccer/bra.1/456";
  assert.equal(
    validateAnnouncement({ ...draft, matches: [first, first] }).url,
    "/partida/" + first,
  );
  assert.equal(
    validateAnnouncement({ ...draft, matches: [first, second] }).url,
    "/",
  );
  assert.equal(validateAnnouncement({ ...draft, matches: [] }).url, "/");
  assert.throws(
    () => validateAnnouncement({ ...draft, matches: ["https://other.test"] }),
    /Partida inválida/,
  );
  for (const [url, method] of [["/api/admin/announcements", "POST"]]) {
    const response = { setHeader() {}, end() {} };
    await handler({ url, method, headers: {} }, response);
    assert.equal(response.statusCode, 401);
  }
});
