async function loadClient() {
  const r = await fetch("/api/admin-auth-config", { cache: "no-store" });
  const d = await r.json();
  if (!r.ok || !d.url)
    throw Error("O login está temporariamente indisponível.");
  const { createAuthClient } = await import("@neondatabase/neon-js/auth");
  return createAuthClient(d.url);
}
let clientPromise: ReturnType<typeof loadClient> | undefined;
export function accountClient() {
  if (!clientPromise)
    clientPromise = loadClient().catch((error) => {
      clientPromise = undefined;
      throw error;
    });
  return clientPromise;
}
export async function sessionToken(auth: Awaited<ReturnType<typeof accountClient>>) {
  let token: string | null = null;
  const session = await auth.getSession({
    fetchOptions: {
      onSuccess(ctx) {
        token = ctx.response.headers.get("set-auth-jwt");
      },
    },
  });
  if (session.error || !session.data?.user) return null;
  // Cached Neon sessions carry the JWT in session.token without a response header.
  const cached = session.data.session?.token;
  const compact = (value: unknown): value is string =>
    typeof value === "string" && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value);
  if (compact(token)) return token;
  if (compact(cached)) return cached;
  const result = await auth.token();
  return !result.error && compact(result.data?.token) ? result.data.token : null;
}

export async function accountToken() {
  return sessionToken(await accountClient());
}
