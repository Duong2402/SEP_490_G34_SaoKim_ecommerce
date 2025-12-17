import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import http from "../../api/http";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({
    totalUsers: 0,
    newUsersToday: 0,
    newUsersThisMonth: 0,
    last6MonthsUsers: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const data = await http.get("/admin/dashboard/overview");
        if (cancelled) return;

        const last6 = Array.isArray(data?.last6MonthsUsers)
          ? data.last6MonthsUsers
          : Array.isArray(data?.Last6MonthsUsers)
          ? data.Last6MonthsUsers
          : [];

        setOverview({
          totalUsers: Number(data?.totalUsers ?? data?.TotalUsers ?? 0),
          newUsersToday: Number(data?.newUsersToday ?? data?.NewUsersToday ?? 0),
          newUsersThisMonth: Number(data?.newUsersThisMonth ?? data?.NewUsersThisMonth ?? 0),
          last6MonthsUsers: last6,
        });
      } catch (e) {
        console.error("Load dashboard overview failed", e);
        if (!cancelled) {
          setOverview({
            totalUsers: 0,
            newUsersToday: 0,
            newUsersThisMonth: 0,
            last6MonthsUsers: [],
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const cardStyle = {
    background: "#fff",
    border: "1px solid var(--wm-border)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "var(--wm-shadow)",
  };

  const labelStyle = { color: "var(--wm-muted)", fontSize: 13 };
  const valueStyle = { fontSize: 28, fontWeight: 800, marginTop: 6 };

  const chartData = useMemo(() => {
    const list = overview.last6MonthsUsers || [];
    return list.map((x) => ({
      name: x?.label ?? x?.Label ?? `${String(x?.month ?? x?.Month ?? "").padStart(2, "0")}/${x?.year ?? x?.Year ?? ""}`,
      users: Number(x?.count ?? x?.Count ?? 0),
    }));
  }, [overview.last6MonthsUsers]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          background: "#fff",
          border: "1px solid var(--wm-border)",
          borderRadius: 16,
          padding: 18,
          boxShadow: "var(--wm-shadow)",
        }}
      >
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <p style={{ margin: "8px 0 0", color: "var(--wm-muted)" }}>
          Chọn chức năng từ menu bên trái.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <div style={cardStyle}>
          <div style={labelStyle}>Tổng số người dùng</div>
          <div style={valueStyle}>{loading ? "..." : overview.totalUsers}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Người dùng đăng ký hôm nay</div>
          <div style={valueStyle}>{loading ? "..." : overview.newUsersToday}</div>
        </div>

        <div style={cardStyle}>
          <div style={labelStyle}>Người dùng đăng ký tháng này</div>
          <div style={valueStyle}>{loading ? "..." : overview.newUsersThisMonth}</div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>So sánh user đăng ký 6 tháng gần nhất</div>

        {loading ? (
          <div style={{ color: "var(--wm-muted)" }}>Đang tải dữ liệu...</div>
        ) : chartData.length === 0 ? (
          <div style={{ color: "var(--wm-muted)" }}>Chưa có dữ liệu để hiển thị.</div>
        ) : (
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        <Link
          to="/admin/banner"
          style={{
            ...cardStyle,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 800 }}>Quản lý Banner</div>
          <div style={{ color: "var(--wm-muted)", marginTop: 6 }}>Tạo, sửa, ẩn/hiện sự kiện</div>
        </Link>

        <Link
          to="/admin/users"
          style={{
            ...cardStyle,
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <div style={{ fontWeight: 800 }}>Quản lý Users</div>
          <div style={{ color: "var(--wm-muted)", marginTop: 6 }}>Quản lý tài khoản và phân quyền</div>
        </Link>
      </div>
    </div>
  );
}
