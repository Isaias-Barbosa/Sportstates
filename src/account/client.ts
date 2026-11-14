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
export async function sessionToken(auth: Awaited<ReturnType<typeof accountClient>>, reportTransientError = false) {
  let token: string | null = null;
  const session = await auth.getSession({
    fetchOptions: {
      onSuccess(ctx) {
        token = ctx.response.headers.get("set-auth-jwt");
      },
    },
  });
  if (reportTransientError && session.error && ![401, 403].includes(session.error.status))
    throw Error("Não foi possível consultar a sessão.");
  if (session.error || !session.data?.user) return null;
  // Cached Neon sessions carry the JWT in session.token without a response header.
  const cached = session.data.session?.token;
  const compact = (value: unknown): value is string =>
    typeof value === "string" && /^[\w-]+\.[\w-]+\.[\w-]+$/.test(value);
  if (compact(token)) return token;
  if (compact(cached)) return cached;
  const result = await auth.token();
  if (reportTransientError && result.error && ![401, 403].includes(result.error.status))
    throw Error("Não foi possível renovar a sessão.");
  return !result.error && compact(result.data?.token) ? result.data.token : null;
}

export async function accountToken(reportTransientError = false) {
  return sessionToken(await accountClient(), reportTransientError);
}

export type LancePermissions = {
  authenticated: boolean;
  role: "admin" | "moderator" | "user" | "guest";
  canManageLances: boolean;
};

export async function getLancePermissions(
  signal?: AbortSignal
): Promise<LancePermissions> {
  const token = await accountToken();

  if (!token) {
    return {
      authenticated: false,
      role: "guest",
      canManageLances: false,
    };
  }

  const response = await fetch(
    "/api/lances/permissions",
    {
      method: "GET",
      cache: "no-store",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      "Não foi possível consultar as permissões."
    );
  }

  return response.json();
}


// Retry a rejected credential without changing the mounted editor or replaying
// writes that reached an authenticated handler.
export async function adminFetch(path: string, init: RequestInit) {
  const response = await fetch(path, init);
  if (![401, 403].includes(response.status) || init.signal?.aborted) return response;
  const headers = new Headers(init.headers);
  const token = await accountToken().catch(() => null);
  if (!token || init.signal?.aborted || headers.get("Authorization") === `Bearer ${token}`) return response;
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers });
}
