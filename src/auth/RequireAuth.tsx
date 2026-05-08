import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
