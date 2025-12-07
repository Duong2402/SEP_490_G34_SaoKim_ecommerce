import { NavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChartPie, faListCheck, faPlusCircle } from "@fortawesome/free-solid-svg-icons";

const NAV_ITEMS = [
  { to: "/projects/overview", label: "Tổng quan", icon: faChartPie },
  { to: "/projects", label: "Danh sách dự án", icon: faListCheck, exact: true },
];

export default function ProjectManagerSidebar() {
  return (
    <nav className="pm-sidebar__nav" aria-label="Điều hướng Project Manager">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.exact || false}
          className={({ isActive }) => `pm-nav-link${isActive ? " pm-nav-link--active" : ""}`}
        >
          <span className="pm-nav-link__icon" aria-hidden="true">
            <FontAwesomeIcon icon={item.icon} />
          </span>
          <span className="pm-nav-link__label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
