import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/projects/overview", label: "Tá»•ng quan" },
  { to: "/projects", label: "Danh sÃ¡ch dá»± Ã¡n" },
  { to: "/projects/create", label: "Táº¡o dá»± Ã¡n" },
];

export default function ProjectManagerSidebar() {
  return (
    <nav className="pm-sidebar__nav" aria-label="Äiá»u hÆ°á»›ng Project Manager">
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

