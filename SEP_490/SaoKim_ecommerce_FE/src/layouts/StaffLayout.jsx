import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faKey, faRightFromBracket, faUserPen } from "@fortawesome/free-solid-svg-icons";
import { Offcanvas } from "react-bootstrap";
import StaffSidebar from "../components/StaffSidebar";
import SaoKimLogo from "../components/SaoKimLogo";
import "../styles/staff.css";

const PAGE_TITLES = [
  { match: /^\/staff\/manager-dashboard/, label: "Tổng quan nhân viên" },
  { match: /^\/staff\/manager-products/, label: "Quản lý sản phẩm" },
  { match: /^\/staff\/manager-orders/, label: "Quản lý đơn hàng" },
  { match: /^\/staff\/manager-customers/, label: "Quản lý khách hàng" },
  { match: /^\/staff\/invoices/, label: "Hóa đơn" },
  { match: /^\/staff-view-customers/, label: "Hồ sơ khách hàng" },
];

const getIdentity = () => {
  if (typeof window === "undefined") return { name: "", email: "staff@saokim.vn" };
  const name = window.localStorage.getItem("userName") || "";
  const email = window.localStorage.getItem("userEmail") || "staff@saokim.vn";
  return { name, email };
};

const getInitials = (value) => {
  if (!value) return "SK";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const StaffLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);
  const [identity, setIdentity] = useState(() => getIdentity());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const pageTitle = useMemo(() => {
    const current = PAGE_TITLES.find((item) => item.match.test(location.pathname));
    return current?.label || "Khu vực nhân viên";
  }, [location.pathname]);

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

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?")) return;
    try {
      ["token", "userEmail", "userName", "role"].forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.error(err);
    }
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

  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="staff-shell">
      <aside className="staff-sidebar d-none d-lg-flex" aria-label="Khu vực Nhân viên">
        <div
          className="staff-sidebar__brand"
          role="button"
          tabIndex={0}
          onClick={() => navigate("/")}
          onKeyDown={(e) => e.key === "Enter" && navigate("/")}
        >
          <SaoKimLogo size="large" showText title="Sao Kim Staff" tagline="Vận hành bán hàng" />
        </div>

        <StaffSidebar />

        <div className="staff-sidebar__footer">
          Phiên làm việc an toàn
          <br />
          Hỗ trợ: 0963 811 369
        </div>
      </aside>

      <Offcanvas
        show={sidebarOpen}
        onHide={closeSidebar}
        placement="start"
        className="staff-offcanvas"
        restoreFocus={false}
      >
        <Offcanvas.Header closeButton closeVariant="white" className="staff-offcanvas__header">
          <div
            className="staff-sidebar__brand"
            role="button"
            tabIndex={0}
            onClick={() => navigate("/")}
            onKeyDown={(e) => e.key === "Enter" && navigate("/")}
          >
            <SaoKimLogo size="large" showText title="Sao Kim Staff" tagline="Vận hành bán hàng" />
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body className="staff-offcanvas__body">
          <StaffSidebar onNavigate={closeSidebar} />
          <div className="staff-sidebar__footer">
            Phiên làm việc an toàn
            <br />
            Hỗ trợ: 0963 811 369
          </div>
        </Offcanvas.Body>
      </Offcanvas>

      <div className="staff-main">
        <header className="staff-topbar">
          <div className="staff-topbar__left">
            <button
              type="button"
              className="staff-topbar__toggle d-lg-none"
              onClick={openSidebar}
              aria-label="Mở menu nhân viên"
            >
              <span />
              <span />
              <span />
            </button>
            <div className="staff-topbar__titles">
              <span className="staff-topbar__eyebrow">Nhân viên</span>
              <h1 className="staff-topbar__title">{pageTitle}</h1>
            </div>
          </div>

          <div className="staff-topbar__actions">
            <div className="staff-support">
              <div>
                <small>Hỗ trợ</small>
                <strong>0963 811 369</strong>
              </div>
            </div>

            <div className="staff-user" ref={userMenuRef}>
              <button
                type="button"
                className="staff-user__button"
                onClick={() => setUserMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
              >
                <span className="staff-user__avatar">{getInitials(identity.name || identity.email)}</span>
                <span className="staff-user__meta">
                  {identity.name || "Nhân viên Sao Kim"}
                  <span>{identity.email}</span>
                </span>
                <FontAwesomeIcon icon={faChevronDown} />
              </button>

              {userMenuOpen && (
                <div className="staff-user__dropdown" role="menu">
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

        <div className="staff-content">{children}</div>
      </div>
    </div>
  );
};

export default StaffLayout;
