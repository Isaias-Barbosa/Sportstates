
import { neon } from "@neondatabase/serverless";
import { userIdentity } from "./user-auth.mjs";

const VALID_ROLES = new Set(["admin", "moderator", "user"]);

export async function getLancePermission(header) {
  const identity = await userIdentity(header);

  // Token inválido ou sessão ausente.
  if (!identity) {
    return {
      authenticated: false,
      role: "guest",
      canManageLances: false,
      userId: null,
    };
  }

  const adminEmail = process.env.ADMIN_EMAIL
    ?.trim()
    .toLowerCase();

  // Compatibilidade com o administrador atual.
  if (
    adminEmail &&
    identity.email.toLowerCase() === adminEmail &&
    identity.emailVerified
  ) {
    return {
      authenticated: true,
      role: "admin",
      canManageLances: true,
      userId: identity.id,
    };
  }

  // Usuários sem e-mail verificado não recebem
  // permissões de moderação.
  if (!identity.emailVerified) {
    return {
      authenticated: true,
      role: "user",
      canManageLances: false,
      userId: identity.id,
    };
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("Banco Neon não configurado.");
  }

  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql`
    SELECT role
    FROM sportstates_user_roles
    WHERE user_id = ${identity.id}
    LIMIT 1
  `;

  const storedRole = rows[0]?.role;
  const role = VALID_ROLES.has(storedRole)
    ? storedRole
    : "user";

  return {
    authenticated: true,
    role,
    canManageLances:
      role === "admin" || role === "moderator",
    userId: identity.id,
  };
}

// Função que utilizaremos nas rotas protegidas.
export async function lanceAuthorized(header) {
  const permission = await getLancePermission(header);
  return permission.canManageLances;
}
