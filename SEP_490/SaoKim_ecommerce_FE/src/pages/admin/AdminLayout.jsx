import { NavLink, Outlet } from "react-router-dom";
import "./AdminLayout.css"; // nhớ import CSS

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <h2 className="admin-title">Admin Menu</h2>

        <nav className="admin-menu">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              "menu-item" + (isActive ? " active" : "")
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/admin/banner"
            className={({ isActive }) =>
              "menu-item" + (isActive ? " active" : "")
            }
          >
            Quản lý Banner
          </NavLink>

          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              "menu-item" + (isActive ? " active" : "")
            }
          >
            Quản lý Users
          </NavLink>
        </nav>
      </aside>

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}
