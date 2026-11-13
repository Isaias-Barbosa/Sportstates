import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAccount } from "../account/AccountProvider";
import { accountToken } from "../account/client";
import { Loading, Notice } from "../components/shared";
import AdminGames from "./AdminGames";

export default function AdminAccess() {
  const { user, loading } = useAccount();
  const [access, setAccess] = useState<{
    id: string;
    token?: string;
    error?: boolean;
  }>();
  const id = user?.id;

  useEffect(() => {
    setAccess(undefined);
    if (loading || !id) return;
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await accountToken();
        if (!token) {
          if (!controller.signal.aborted) setAccess({ id });
          return;
        }
        const response = await fetch("/api/admin/session", {
          cache: "no-store",
          signal: controller.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
        if (controller.signal.aborted) return;
        if (!response.ok && ![401, 403].includes(response.status))
          throw Error();
        setAccess({ id, token: response.ok ? token : undefined });
      } catch {
        if (!controller.signal.aborted) setAccess({ id, error: true });
      }
    })();
    return () => controller.abort();
  }, [loading, id]);

  if (loading) return <Loading />;
  if (!id) return <Navigate to="/conta" replace />;
  if (access?.id !== id) return <Loading />;
  if (access.error)
    return (
      <Notice error>
        Não foi possível verificar o acesso. Recarregue a página para tentar
        novamente.
      </Notice>
    );
  if (!access.token) return <Navigate to="/" replace />;
  return <AdminGames secret={access.token} />;
}
