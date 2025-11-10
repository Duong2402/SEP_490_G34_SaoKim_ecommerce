import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allow = [] }) {
  const token = localStorage.getItem("token");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  if (!token) return <Navigate to="/login" replace />;

  if (allow.length && !allow.map(r => r.toLowerCase()).includes(role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return <Outlet />;
}
