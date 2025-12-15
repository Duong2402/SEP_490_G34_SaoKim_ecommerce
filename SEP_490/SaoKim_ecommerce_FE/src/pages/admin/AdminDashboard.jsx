import { Link } from "react-router-dom";

export default function AdminDashboard() {
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
        <Link
          to="/admin/banner"
          style={{
            textDecoration: "none",
            background: "#fff",
            border: "1px solid var(--wm-border)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "var(--wm-shadow)",
            color: "var(--wm-text)",
            fontWeight: 700,
          }}
        >
          Quản lý Banner
          <div style={{ marginTop: 8, color: "var(--wm-muted)", fontWeight: 500 }}>
            Tạo, sửa, ẩn/hiện banner
          </div>
        </Link>

        <Link
          to="/admin/users"
          style={{
            textDecoration: "none",
            background: "#fff",
            border: "1px solid var(--wm-border)",
            borderRadius: 16,
            padding: 16,
            boxShadow: "var(--wm-shadow)",
            color: "var(--wm-text)",
            fontWeight: 700,
          }}
        >
          Quản lý Users
          <div style={{ marginTop: 8, color: "var(--wm-muted)", fontWeight: 500 }}>
            Quản lý tài khoản và phân quyền
          </div>
        </Link>
      </div>
    </div>
  );
}
