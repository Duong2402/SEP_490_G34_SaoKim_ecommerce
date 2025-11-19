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

      <NavLink to="/manager/promotions" style={navLinkStyle}>
        Promotions
      </NavLink>

      <NavLink to="/manager/coupons" style={navLinkStyle}>
        Coupons
      </NavLink>

      <NavLink to="/manager/employees" style={navLinkStyle}>
        Employees
      </NavLink>
    </nav>
  );
}
