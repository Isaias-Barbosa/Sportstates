import { createRemoteJWKSet, jwtVerify } from "jose";
import { authBaseUrl } from "./admin-auth.mjs";
let lastBase = "",
  keys;
export function sessionIdentity(payload) {
  if (
    !payload ||
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.sub.length > 200 ||
    typeof payload.email !== "string" ||
    !payload.email.includes("@") ||
    payload.banned === true ||
    payload.role === "anonymous"
  )
    return null;
  return {
    id: payload.sub,
    email: payload.email,
    name:
      typeof payload.name === "string"
        ? payload.name.slice(0, 100)
        : payload.email.split("@")[0],
    emailVerified: payload.emailVerified === true,
  };
}
export async function verifySessionToken(token, resolver, origin) {
  const { payload } = await jwtVerify(token, resolver, {
    issuer: origin,
    audience: origin,
    algorithms: ["RS256", "ES256", "EdDSA"],
    requiredClaims: ["sub", "exp", "iat"],
  });
  return sessionIdentity(payload);
}
export async function userIdentity(header) {
  const base = authBaseUrl();
  if (
    !base ||
    typeof header !== "string" ||
    !/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(header) ||
    header.length > 16000
  )
    return null;
  try {
    if (base !== lastBase) {
      keys = createRemoteJWKSet(new URL(base + "/.well-known/jwks.json"));
      lastBase = base;
    }
    const origin = new URL(base).origin;
    return await verifySessionToken(header.slice(7), keys, origin);
  } catch {
    return null;
  }
}
