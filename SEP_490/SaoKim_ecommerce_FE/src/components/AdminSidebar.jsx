import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import http from "../api/http";

export default function AdminSidebar() {
  const [overview, setOverview] = useState({
    totalUsers: null,
    newUsersToday: null,
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await http.get("/admin/dashboard/overview");
        if (cancelled) return;

        setOverview({
          totalUsers: Number(data?.totalUsers ?? data?.TotalUsers ?? 0),
          newUsersToday: Number(data?.newUsersToday ?? data?.NewUsersToday ?? 0),
        });
      } catch (e) {
        console.error("Load sidebar overview failed", e);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const itemStyle = ({ isActive }) => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 12,
    textDecoration: "none",
    color: "#fff",
    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
    border: "1px solid rgba(255,255,255,0.12)",
  });

  const badgeStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 22,
    padding: "0 8px",
    borderRadius: 999,
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.18)",
    fontWeight: 800,
    fontSize: 12,
    flex: "0 0 auto",
  };

  return (
    <div
  style={{
    width: 260,
    background: "#0e2a52",
    color: "#fff",
    padding: 14,
    borderRadius: 14,
    height: "calc(100vh - 28px)",
    position: "sticky",
    top: 14,
  }}
>
  {/* HEADER */}
  <div
    style={{
      padding: "16px 12px",
      borderRadius: 14,
      background: "rgba(255,255,255,0.08)",
      marginBottom: 16,
      textAlign: "center",
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 0.5 }}>
      Sao Kim Admin
    </div>
    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>
      Không gian quản trị
    </div>
  </div>


      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <NavLink to="/admin" style={itemStyle} end>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Dashboard</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Tổng quan hệ thống</div>
          </div>
        </NavLink>

        <NavLink to="/admin/banner" style={itemStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Banner</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Tạo, sửa, ẩn/hiện</div>
          </div>
        </NavLink>

        <NavLink to="/admin/users" style={itemStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>Users</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              {overview.newUsersToday == null ? "Quản lý tài khoản" : `Mới hôm nay: ${overview.newUsersToday}`}
            </div>
          </div>

          {overview.totalUsers != null && <span style={badgeStyle}>{overview.totalUsers}</span>}
        </NavLink>
      </div>

      <div style={{ position: "absolute", left: 14, right: 14, bottom: 14, opacity: 0.9, fontSize: 12 }}>
        <div>Quản trị hệ thống</div>
        <div>Hỗ trợ: 0963 811 369</div>
      </div>
    </div>
  );
}
