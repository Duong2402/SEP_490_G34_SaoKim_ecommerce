import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faHeadset, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import { Offcanvas } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import WarehouseSidebar from "../components/WarehouseSidebar";
import "../assets/css/Warehouse.css";

const getIdentity = () => {
  if (typeof window === "undefined") {
    return { name: "", email: "warehouse@saokim.vn" };
  }
  const name = window.localStorage.getItem("userName") || "";
  const email = window.localStorage.getItem("userEmail") || "warehouse@saokim.vn";
  return { name, email };
};

const getInitials = (value) => {
  if (!value) return "WM";
  const parts = value.trim().split(/\s+/);
  if (parts.length === 1) return (parts[0].slice(0, 2) || "WM").toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const WarehouseLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [identity, setIdentity] = useState(() => getIdentity());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const syncIdentity = () => setIdentity(getIdentity());
    window.addEventListener("storage", syncIdentity);
    window.addEventListener("localStorageChange", syncIdentity);
    return () => {
      window.removeEventListener("storage", syncIdentity);
      window.removeEventListener("localStorageChange", syncIdentity);
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
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;
    ["token", "role", "userEmail", "userName"].forEach((key) => localStorage.removeItem(key));
    setUserMenuOpen(false);
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
    <div className="warehouse-shell">
      <WarehouseSidebar />

      <div className="warehouse-main">
        <header className="warehouse-topbar">
          <div className="warehouse-topbar__left">
            <button
              type="button"
              className="warehouse-topbar__toggle d-lg-none"
              onClick={openSidebar}
              aria-label="Mở menu quản lý kho"
            >
              <span />
              <span />
              <span />
            </button>
            <div className="warehouse-topbar__titles">
              <span className="warehouse-topbar__subtitle">Sao Kim Lighting</span>
              <h2 className="warehouse-topbar__title">Điều hành quản lý kho</h2>
            </div>
          </div>

          <div className="warehouse-topbar__actions">
            <div className="warehouse-topbar__support">
              <span className="warehouse-topbar__support-icon">
                <FontAwesomeIcon icon={faHeadset} />
              </span>
              <div>
                <small>Hỗ trợ</small>
                <strong>0963 811 369</strong>
              </div>
            </div>

            <div className="warehouse-topbar__user" ref={userMenuRef}>
              <button
                type="button"
                className="warehouse-topbar__profile"
                aria-haspopup="true"
                aria-expanded={userMenuOpen}
                onClick={() => setUserMenuOpen((open) => !open)}
              >
                <span className="warehouse-topbar__avatar">
                  {getInitials(identity.name || identity.email)}
                </span>
                <span className="warehouse-topbar__profile-text">
                  <strong>{identity.name || "Quản lý kho"}</strong>
                  <small>{identity.email}</small>
                </span>
                <FontAwesomeIcon icon={faChevronDown} className="warehouse-topbar__chevron" />
              </button>

              {userMenuOpen && (
                <div className="warehouse-topbar__menu" role="menu">
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

            <button type="button" className="warehouse-topbar__btn" onClick={handleLogout}>
              <FontAwesomeIcon icon={faRightFromBracket} />
              Đăng xuất
            </button>
          </div>
        </header>

        <div className="warehouse-content">{children}</div>
      </div>

      <Offcanvas
        show={sidebarOpen}
        onHide={closeSidebar}
        placement="start"
        className="warehouse-offcanvas"
        restoreFocus={false}
      >
        <Offcanvas.Header closeButton closeVariant="white" className="warehouse-offcanvas__header" />
        <Offcanvas.Body className="warehouse-offcanvas__body">
          <WarehouseSidebar onNavigate={closeSidebar} />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
};

export default WarehouseLayout;
