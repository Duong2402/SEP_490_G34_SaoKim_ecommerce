import { NavLink, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <>
      <style>{`
        .admin-layout {
          display: flex;
          min-height: 100vh;
          background: #f7f9fc;
          font-family: Arial, sans-serif;
        }

        .admin-sidebar {
          width: 260px;
          background: #ffffff;
          border-right: 1px solid #e4e4e4;
          padding: 20px;
        }

        .admin-title {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 20px;
        }

        .admin-menu .menu-item {
          display: block;
          padding: 10px 14px;
          background: #eef1f6;
          color: #333;
          border-radius: 6px;
          text-decoration: none;
          margin-bottom: 10px;
          transition: all 0.2s ease;
        }

        .admin-menu .menu-item:hover {
          background: #dfe6ef;
        }

        .admin-menu .menu-item.active {
          background: #2563eb;
          color: white;
          font-weight: 600;
        }

        .admin-content {
          flex: 1;
          padding: 32px;
          background: #fdfdfd;
        }
      `}</style>

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
    </>
  );
}
