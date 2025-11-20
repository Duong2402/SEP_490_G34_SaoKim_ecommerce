import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import ProjectManagerSidebar from "../pages/ProjectManager/components/ProjectManagerSidebar";
import "../styles/project-manager.css";

const PAGE_TITLES = [
  { match: /^\/projects(\/)?$/, label: "Danh sách dự án" },
  { match: /^\/projects\/create/, label: "Tạo dự án" },
  { match: /^\/projects\/\d+$/, label: "Chi tiết dự án" },
  { match: /^\/projects\/.+\/edit/, label: "Chỉnh sửa dự án" },
  { match: /^\/projects\/.+\/report/, label: "Báo cáo dự án" },
];

const getIdentity = () => {
  if (typeof window === "undefined") {
    return { name: "", email: "pm@saokim.vn" };
  }
  const name = window.localStorage.getItem("userName") || "";
  const email = window.localStorage.getItem("userEmail") || "pm@saokim.vn";
  return { name, email };
};

const getInitials = (value) => {
  if (!value) return "PM";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ProjectManagerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [identity, setIdentity] = useState(() => getIdentity());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const sync = () => setIdentity(getIdentity());
    window.addEventListener("storage", sync);
    window.addEventListener("localStorageChange", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("localStorageChange", sync);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!userMenuOpen) return;
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const pageTitle = useMemo(() => {
    const current = PAGE_TITLES.find((item) => item.match.test(location.pathname));
    return current?.label || "Quản lý dự án";
  }, [location.pathname]);

  const handleLogout = () => {
    if (!window.confirm("Bạn chắc chắn muốn đăng xuất khỏi hệ thống?")) return;
    ["token", "role", "userEmail", "userName"].forEach((key) => localStorage.removeItem(key));
    navigate("/login", { replace: true });
  };

  const goToProfile = () => {
    setUserMenuOpen(false);
    navigate("/account");
  };

  const goToChangePassword = () => {
    setUserMenuOpen(false);
    navigate("/change-password");
  };

  const goToCreateProject = () => navigate("/projects/create");

  return (
    <div className="pm-shell">
      <aside className="pm-sidebar" aria-label="Điều hướng Project Manager">
        <div className="pm-sidebar__brand">
          <span className="pm-sidebar__mark">SK</span>
          <div className="pm-sidebar__title">
            <strong>Sao Kim Projects</strong>
            <span>Khu vực Project Manager</span>
          </div>
        </div>

        <ProjectManagerSidebar />

        <div className="pm-sidebar__footer">
          Phiên làm việc an toàn
          <br />
          Hỗ trợ: 0963 811 369
        </div>
      </aside>

      <div className="pm-main">
        <header className="pm-topbar">
          <div className="pm-topbar__titles">
            <span className="pm-topbar__eyebrow">Quản lý dự án</span>
            <h1 className="pm-topbar__title">{pageTitle}</h1>
          </div>

          <div className="pm-topbar__actions">
            <button type="button" className="btn btn-outline pm-topbar__cta" onClick={goToCreateProject}>
              + Tạo dự án
            </button>
            <div className="pm-user" ref={userMenuRef}>
              <button
                type="button"
                className="pm-user__button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <span className="pm-user__avatar">{getInitials(identity.name || identity.email)}</span>
                <span className="pm-user__meta">
                  {identity.name || "Project Manager"}
                  <span>{identity.email}</span>
                </span>
              </button>

              {userMenuOpen && (
                <div className="pm-user__dropdown" role="menu">
                  <button type="button" onClick={goToProfile}>
                    Hồ sơ cá nhân
                  </button>
                  <button type="button" onClick={goToChangePassword}>
                    Đổi mật khẩu
                  </button>
                  <button type="button" onClick={handleLogout}>
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="pm-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
