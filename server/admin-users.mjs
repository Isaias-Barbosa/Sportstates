import { neon } from "@neondatabase/serverless";
export function userListOptions(params) {
  const q = (params.get("q") || "").trim().slice(0, 100);
  const raw = params.get("page") || "1";
  const page = /^\d{1,6}$/.test(raw)
    ? Math.max(1, Math.min(100000, Number(raw)))
    : 1;
  const status = ["verified", "pending"].includes(params.get("status"))
    ? params.get("status")
    : "all";
  return { q, page, status, limit: 25 };
}
export async function listAdminUsers(options) {
  if (!process.env.DATABASE_URL) throw Error("Banco indisponível.");
  const sql = neon(process.env.DATABASE_URL);
  const { q, page, status, limit } = options;
  // strpos treats %, _ and backslashes as literal search text; no dynamic SQL.
  const search = q.toLowerCase();
  const [counts, rows] = await Promise.all([
    sql`SELECT count(*)::int AS total, count(*) FILTER (WHERE "emailVerified"=true)::int AS verified FROM neon_auth."user" WHERE (${search}='' OR strpos(lower(coalesce(name,'') || ' ' || email),${search})>0) AND (${status}='all' OR (${status}='verified' AND "emailVerified"=true) OR (${status}='pending' AND "emailVerified" IS NOT TRUE))`,
    sql`SELECT id,name,email,"emailVerified","createdAt",coalesce(to_jsonb(u)->>'banned','false')='true' AS banned FROM neon_auth."user" u WHERE (${search}='' OR strpos(lower(coalesce(name,'') || ' ' || email),${search})>0) AND (${status}='all' OR (${status}='verified' AND "emailVerified"=true) OR (${status}='pending' AND "emailVerified" IS NOT TRUE)) ORDER BY "createdAt" DESC,id LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
  ]);
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return {
    users: rows.map((row) => ({
      ...row,
      role: row.email?.toLowerCase() === adminEmail ? "admin" : "user",
    })),
    page,
    pageSize: limit,
    total: counts[0].total,
    verified: counts[0].verified,
  };
}
