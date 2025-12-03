import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div style={{
      width: "100%",
      minHeight: "100vh",
      display: "flex",
      background: "#f7f9fc"
    }}>
      
      {/* Menu bên trái */}
      <aside style={{
        width: "250px",
        background: "#ffffff",
        borderRight: "1px solid #e4e4e4",
        padding: "20px"
      }}>
        <h3 style={{ marginBottom: "20px" }}>Admin Menu</h3>

        <nav style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link to="/admin/banner" style={linkStyle}>
            Quản lý Banner
          </Link>

          <Link to="/admin/users" style={linkStyle}>
            Quản lý Users
          </Link>
        </nav>
      </aside>

      {/* Nội dung bên phải */}
      <main style={{
        flex: 1,
        padding: "40px"
      }}>
        <h1>Dashboard</h1>
        <p>Chọn chức năng từ menu bên trái.</p>
      </main>

    </div>
  );
}

const linkStyle = {
  padding: "10px 14px",
  background: "#f0f2f5",
  borderRadius: "6px",
  textDecoration: "none",
  color: "#333",
  fontSize: "15px",
};
