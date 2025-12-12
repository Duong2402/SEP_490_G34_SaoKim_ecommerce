import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import ManagerSidebar from "../pages/manager/components/ManagerSidebar";
import SaoKimLogo from "../components/SaoKimLogo";
import "../styles/manager.css";

const PAGE_TITLES = [
  { match: /^\/manager(\/dashboard)?$/, label: "Tổng quan hoạt động" },
  { match: /^\/manager\/orders/, label: "Đơn hàng" },
  { match: /^\/manager\/products/, label: "Sản phẩm" },
  { match: /^\/manager\/projects/, label: "Dự án" },
  { match: /^\/manager\/promotions/, label: "Khuyến mãi" },
  { match: /^\/manager\/coupons/, label: "Mã giảm giá" },
  { match: /^\/manager\/employees/, label: "Nhân sự" },
];

const getIdentity = () => {
  if (typeof window === "undefined") {
    return { name: "", email: "manager@saokim.vn" };
  }
  const name = window.localStorage.getItem("userName") || "";
  const email = window.localStorage.getItem("userEmail") || "";
  return {
    name: name || "",
    email: email || "manager@saokim.vn",
  };
};

const getInitials = (value) => {
  if (!value) return "SK";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export default function ManagerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const userWrapperRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [identity, setIdentity] = useState(() => getIdentity());

  const pageTitle = useMemo(() => {
    const current = PAGE_TITLES.find((item) => item.match.test(location.pathname));
    return current?.label || "Điều hành kinh doanh";
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
    <div className="manager-shell">
      <aside className="manager-sidebar" aria-label="Điều hướng quản lý">
        <div
          className="manager-sidebar__brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/")}
        >
          <SaoKimLogo size="large" showText />
        </div>


        <ManagerSidebar />

        <div className="manager-sidebar__footer">
          Phiên làm việc an toàn
          <br />
          Hỗ trợ: 0963 811 369
        </div>
      </aside>

      <div className="manager-main">
        <header className="manager-topbar">
          <div className="manager-topbar__titles">
            <span className="manager-topbar__eyebrow">Khu vực quản lý</span>
            <h1 className="manager-topbar__title">{pageTitle}</h1>
          </div>
          <div className="manager-topbar__actions">
            <button type="button" className="manager-logout" onClick={handleLogout}>
              Đăng xuất
            </button>
            <div className="manager-user" ref={userWrapperRef}>
              <button
                type="button"
                className="manager-user__button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <span className="manager-user__avatar">
                  {getInitials(identity.name || identity.email)}
                </span>
                <span className="manager-user__meta">
                  {identity.name || "Quản lý Sao Kim"}
                  <span>{identity.email}</span>
                </span>
              </button>
              {userMenuOpen && (
                <div className="manager-user__dropdown" role="menu">
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

        <div className="manager-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
