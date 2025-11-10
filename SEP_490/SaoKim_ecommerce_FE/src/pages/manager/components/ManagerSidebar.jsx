// src/pages/manager/components/ManagerSidebar.jsx
import { NavLink } from "react-router-dom";

const linkBase = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 8,
  color: "#d7e3ff",
  textDecoration: "none",
  fontSize: 14,
  marginBottom: 6,
};

export default function ManagerSidebar() {
  const navLinkStyle = ({ isActive }) => ({
    ...linkBase,
    background: isActive ? "rgba(255,255,255,0.12)" : "transparent",
    color: isActive ? "#fff" : "#d7e3ff",
  });

  return (
    <nav>
      <NavLink to="/manager/dashboard" style={navLinkStyle}>
        Overview
      </NavLink>
      <NavLink to="/manager/products" style={navLinkStyle}>
        Products
      </NavLink>
      <NavLink to="/manager/projects" style={navLinkStyle}>
        Projects
      </NavLink>
      {/* bạn có thể mở thêm khi cần:
      <NavLink to="/manager/orders" style={navLinkStyle}>Orders</NavLink>
      <NavLink to="/manager/reports" style={navLinkStyle}>Reports</NavLink>
      */}
    </nav>
  );
}
