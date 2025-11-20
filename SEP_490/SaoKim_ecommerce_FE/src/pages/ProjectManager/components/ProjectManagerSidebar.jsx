import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/projects/overview", label: "Tổng quan" },
  { to: "/projects", label: "Danh sách dự án" },
  { to: "/projects/create", label: "Tạo dự án" },
];

export default function ProjectManagerSidebar() {
  return (
    <nav className="pm-sidebar__nav" aria-label="Điều hướng Project Manager">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `pm-nav-link${isActive ? " pm-nav-link--active" : ""}`}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
