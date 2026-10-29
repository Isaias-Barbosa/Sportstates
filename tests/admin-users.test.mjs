import test from "node:test";
import assert from "node:assert/strict";
import { userListOptions } from "../server/admin-users.mjs";
import { handler } from "../server/api.mjs";
test("admin user list bounds pagination and search and whitelists status", () => {
  assert.deepEqual(userListOptions(new URLSearchParams()), {
    q: "",
    page: 1,
    status: "all",
    limit: 25,
  });
  assert.equal(
    userListOptions(new URLSearchParams({ page: "-1", status: "admin" })).page,
    1,
  );
  assert.equal(
    userListOptions(new URLSearchParams({ page: "999999" })).page,
    100000,
  );
  assert.equal(
    userListOptions(new URLSearchParams({ q: "x".repeat(200) })).q.length,
    100,
  );
  assert.equal(
    userListOptions(new URLSearchParams({ q: " %_ ", status: "pending" })).q,
    "%_",
  );
  assert.equal(
    userListOptions(new URLSearchParams({ status: "pending" })).status,
    "pending",
  );
});
test("user directory requires admin authorization and cannot mutate accounts", async () => {
  const previous = process.env.ADMIN_ACCESS_KEY;
  process.env.ADMIN_ACCESS_KEY = "u".repeat(32);
  try {
    for (const path of ["/api/admin/users", "/api/index?path=admin/users"]) {
      const headers = {};
      let body;
      const res = {
        statusCode: 200,
        setHeader: (k, v) => (headers[k] = v),
        end: (s) => (body = JSON.parse(s)),
      };
      await handler({ url: path, method: "GET", headers: {} }, res);
      assert.equal(res.statusCode, 401);
      assert.match(headers["Cache-Control"], /private.*no-store/);
      assert.equal(headers["Vercel-CDN-Cache-Control"], "no-store");
      assert.ok(!body.users);
      await handler(
        {
          url: path,
          method: "POST",
          headers: { authorization: "Bearer " + "u".repeat(32) },
        },
        res,
      );
      assert.equal(res.statusCode, 405);
      assert.equal(headers.Allow, "GET");
      assert.ok(!body.users);
    }
  } finally {
    if (previous === undefined) delete process.env.ADMIN_ACCESS_KEY;
    else process.env.ADMIN_ACCESS_KEY = previous;
  }
});
