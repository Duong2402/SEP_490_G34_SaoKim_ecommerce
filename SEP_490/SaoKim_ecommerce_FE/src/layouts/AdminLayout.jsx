import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import SaoKimLogo from "../components/SaoKimLogo";
import AdminSidebar from "../components/AdminSidebar";
import "../styles/admin.css";

const PAGE_TITLES = [
  { match: /^\/admin(\/dashboard)?$/, label: "Tổng quan hệ thống" },
  { match: /^\/admin\/banner/, label: "Quản lý Banner" },
  { match: /^\/admin\/users/, label: "Quản lý người dùng" },
  { match: /^\/admin\/roles/, label: "Quản lý vai trò" },
];

const getIdentity = () => {
  if (typeof window === "undefined") return { name: "", email: "admin@saokim.vn" };
  const name = window.localStorage.getItem("userName") || "";
  const email = window.localStorage.getItem("userEmail") || "";
  return { name, email: email || "admin@saokim.vn" };
};

const getInitials = (value) => {
  if (!value) return "AD";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const userWrapperRef = useRef(null);

  const [identity, setIdentity] = useState(() => getIdentity());
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const current = PAGE_TITLES.find((item) => item.match.test(location.pathname));
    return current?.label || "Quản trị hệ thống";
  }, [location.pathname]);

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
      if (userWrapperRef.current && !userWrapperRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) return;
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

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Điều hướng admin">
        <div
          className="admin-sidebar__brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/")}
        >
          <SaoKimLogo size="large" showText />
        </div>


        <AdminSidebar />

        <div className="admin-sidebar__footer">
          Quản trị hệ thống
          <br />
          Hỗ trợ: 0963 811 369
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__titles">
            <span className="admin-topbar__eyebrow">Khu vực quản trị</span>
            <h1 className="admin-topbar__title">{pageTitle}</h1>
          </div>

          <div className="admin-topbar__actions">
            <button type="button" className="admin-logout" onClick={handleLogout}>
              Đăng xuất
            </button>

            <div className="admin-user" ref={userWrapperRef}>
              <button
                type="button"
                className="admin-user__button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <span className="admin-user__avatar">
                  {getInitials(identity.name || identity.email)}
                </span>
                <span className="admin-user__meta">
                  {identity.name || "Admin Sao Kim"}
                  <span>{identity.email}</span>
                </span>
              </button>

              {userMenuOpen && (
                <div className="admin-user__dropdown" role="menu">
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

        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
