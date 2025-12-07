import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faKey, faRightFromBracket, faUserPen } from "@fortawesome/free-solid-svg-icons";
import ProjectManagerSidebar from "../pages/ProjectManager/components/ProjectManagerSidebar";
import SaoKimLogo from "../components/SaoKimLogo";
import "../styles/project-manager.css";

const PAGE_TITLES = [
  { match: /^\/projects\/?$/, label: "Danh sách dự án" },
  { match: /^\/projects\/overview/, label: "Tổng quan dự án" },
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
    window.addEventListener("auth:changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("localStorageChange", sync);
      window.removeEventListener("auth:changed", sync);
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
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) return;
    ["token", "role", "userEmail", "userName"].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("auth:changed"));
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

  return (
    <div className="pm-shell">
      <aside className="pm-sidebar" aria-label="Khu vực Project Manager">
        <div className="pm-sidebar__brand">
          <SaoKimLogo size="large" showText title="Sao Kim Projects" tagline="Khu vực Quản lý dự án" />
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
                <FontAwesomeIcon icon={faChevronDown} />
              </button>

              {userMenuOpen && (
                <div className="pm-user__dropdown" role="menu">
                  <button type="button" onClick={goToProfile}>
                    <FontAwesomeIcon icon={faUserPen} className="me-2" />
                    Hồ sơ cá nhân
                  </button>
                  <button type="button" onClick={goToChangePassword}>
                    <FontAwesomeIcon icon={faKey} className="me-2" />
                    Đổi mật khẩu
                  </button>
                  <button type="button" onClick={handleLogout}>
                    <FontAwesomeIcon icon={faRightFromBracket} className="me-2" />
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
