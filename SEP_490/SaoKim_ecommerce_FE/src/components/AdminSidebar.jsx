import { NavLink } from "react-router-dom";

const links = [
  { to: "/admin", label: "Dashboard" },
  { to: "/admin/banner", label: "Banner" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/chatbot-analytics", label: "Chatbot" },
];

export default function AdminSidebar() {
  return (
    <nav className="admin-nav">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/admin"}
          className={({ isActive }) => (isActive ? "admin-nav__link is-active" : "admin-nav__link")}
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
