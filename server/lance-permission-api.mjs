
import {
  getLancePermission,
} from "./lance-permissions.mjs";

function sendJson(res, status, data) {
  res.statusCode = status;

  res.setHeader(
    "Content-Type",
    "application/json; charset=utf-8"
  );
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Vary", "Authorization");

  res.end(JSON.stringify(data));
}

export async function handleLancePermissionRequest(
  req,
  res
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    sendJson(res, 405, {
      error: "Método não permitido.",
    });

    return;
  }

  try {
    const permission = await getLancePermission(
      req.headers.authorization
    );

    sendJson(res, 200, {
      authenticated: permission.authenticated,
      role: permission.role,
      canManageLances: permission.canManageLances,
    });
  } catch (error) {
    console.error(
      "[lance-permissions]",
      error
    );

    sendJson(res, 503, {
      error: "Não foi possível verificar as permissões.",
    });
  }
}
