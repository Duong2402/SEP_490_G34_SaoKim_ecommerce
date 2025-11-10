import { Outlet } from "react-router-dom";
import ManagerSidebar from "../pages/manager/components/ManagerSidebar";

const SIDEBAR_WIDTH = 260;

export default function ManagerLayout() {
  return (
    <div>
      {/* Sidebar cố định bên trái */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          background: "#0b1f3a",
          color: "#fff",
          padding: 16,
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 16 }}>Manager Console</div>
        <ManagerSidebar />
      </aside>

      {/* Nội dung */}
      <main
        style={{
          marginLeft: SIDEBAR_WIDTH,
          minHeight: "100vh",
          background: "#f6f8fb",
        }}
      >
        <div style={{ padding: 24 }}>
          <div
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: 12,
              padding: 16,
              marginBottom: 16,
              fontWeight: 700,
            }}
          >
            Dashboard
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
