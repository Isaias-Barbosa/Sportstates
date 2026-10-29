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
export async function accountToken() {
  const auth = await accountClient();
  let token: string | null = null;
  const session = await auth.getSession({
    fetchOptions: {
      onSuccess(ctx) {
        token = ctx.response.headers.get("set-auth-jwt");
      },
    },
  });
  if (session.error || !session.data?.user) return null;
  if (token) return token;
  const result = await auth.token();
  return result.error ? null : result.data?.token || null;
}
