import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faChevronDown,
  faHeadset,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { Offcanvas } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";
import WarehouseSidebar from "../components/WarehouseSidebar";
import "../assets/css/Warehouse.css";

const RAW_API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";

const normalizeBase = (u) => (u ? String(u).replace(/\/+$/, "") : "");

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

const getToken = () => {
  try {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("Token") ||
      localStorage.getItem("accessToken") ||
      localStorage.getItem("AccessToken") ||
      localStorage.getItem("jwt") ||
      localStorage.getItem("JWT") ||
      ""
    );
  } catch {
    return "";
  }
};

const authHeaders = () => {
  const token = getToken().trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const WarehouseLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [identity, setIdentity] = useState(() => getIdentity());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const userMenuRef = useRef(null);

  const [notiOpen, setNotiOpen] = useState(false);
  const notiRef = useRef(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notiItems, setNotiItems] = useState([]);
  const [loadingNoti, setLoadingNoti] = useState(false);

  const baseUrl = useMemo(() => {
    const normalized = normalizeBase(RAW_API_BASE);
    return normalized || "https://localhost:7278";
  }, []);

  const hardLogout = () => {
    [
      "token",
      "Token",
      "accessToken",
      "AccessToken",
      "jwt",
      "JWT",
      "role",
      "userEmail",
      "userName",
    ].forEach((key) => localStorage.removeItem(key));

    setUserMenuOpen(false);
    setNotiOpen(false);
    navigate("/login", { replace: true });
  };

  const handleLogout = () => {
    if (!window.confirm("Bạn có chắc muốn đăng xuất?")) return;
    hardLogout();
  };

  const goToProfile = () => {
    setUserMenuOpen(false);
    navigate("/account");
  };

  const goToChangePassword = () => {
    setUserMenuOpen(false);
    navigate("/change-password");
  };

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
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notiOpen && notiRef.current && !notiRef.current.contains(event.target)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen, notiOpen]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    setNotiOpen(false);
  }, [location.pathname]);

  const fetchUnreadCount = async () => {
    try {
      const headers = { ...authHeaders() };

      const res = await fetch(`${baseUrl}/api/notifications/unread-count`, {
        method: "GET",
        headers,
      });

      if (res.status === 401) {
        let body = "";
        try {
          body = await res.text();
        } catch {}
        console.warn("[API] 401 unread-count. Body =", body);
        return;
      }

      if (!res.ok) return;

      const json = await res.json();
      setUnreadCount(json?.data?.count ?? json?.count ?? 0);
    } catch {
    }
  };

  const fetchNotifications = async () => {
    setLoadingNoti(true);
    try {
      const res = await fetch(
        `${baseUrl}/api/notifications?onlyUnread=false&page=1&pageSize=10000`,
        { method: "GET", headers: { ...authHeaders() } }
      );

      if (res.status === 401) {
        let body = "";
        try {
          body = await res.text();
        } catch {}
        console.warn("[API] 401 list notifications. Body =", body);
        return;
      }

      if (!res.ok) return;

      const json = await res.json();
      const items = json?.data?.items ?? json?.items ?? [];
      setNotiItems(items);
    } catch {
    } finally {
      setLoadingNoti(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(timer);
  }, [baseUrl]);

  const openNoti = async () => {
    const next = !notiOpen;
    setNotiOpen(next);
    if (next) {
      await fetchUnreadCount();
      await fetchNotifications();
    }
  };

  const markRead = async (userNotificationId) => {
    try {
      const res = await fetch(`${baseUrl}/api/notifications/${userNotificationId}/read`, {
        method: "POST",
        headers: { ...authHeaders() },
      });

      if (res.status === 401) {
        let body = "";
        try {
          body = await res.text();
        } catch {}
        console.warn("[API] 401 mark read. Body =", body);
        return;
      }
    } catch {
    } finally {
      fetchUnreadCount();
      fetchNotifications();
    }
  };

  const handleClickNotiItem = async (item) => {
    const userNotificationId = item?.userNotificationId;
    const linkUrl = item?.notification?.linkUrl;

    if (userNotificationId) await markRead(userNotificationId);

    setNotiOpen(false);

    if (linkUrl) {
      const normalized = /^https?:\/\//i.test(linkUrl)
        ? linkUrl
        : linkUrl.startsWith("/")
          ? linkUrl
          : `/${linkUrl}`;

      if (/^https?:\/\//i.test(normalized)) {
        window.location.href = normalized;
      } else {
        navigate(normalized);
      }
    }
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

            <div className="warehouse-noti" ref={notiRef}>
              <button
                type="button"
                className="warehouse-noti__btn"
                aria-haspopup="true"
                aria-expanded={notiOpen}
                onClick={openNoti}
                title="Thông báo"
              >
                <FontAwesomeIcon icon={faBell} />
                {unreadCount > 0 && (
                  <span className="warehouse-noti__badge">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notiOpen && (
                <div className="warehouse-noti__menu" role="menu">
                  <div className="warehouse-noti__header">
                    <div className="warehouse-noti__title">Thông báo</div>
                  </div>

                  <div className="warehouse-noti__list">
                    {loadingNoti ? (
                      <div className="warehouse-noti__empty">Đang tải...</div>
                    ) : notiItems.length === 0 ? (
                      <div className="warehouse-noti__empty">Không có thông báo</div>
                    ) : (
                      notiItems.map((it) => (
                        <button
                          key={it.userNotificationId}
                          type="button"
                          className={"warehouse-noti__item " + (!it.isRead ? "is-unread" : "")}
                          onClick={() => handleClickNotiItem(it)}
                        >
                          <div className="warehouse-noti__itemTitle">
                            {it.notification?.title || "Thông báo"}
                          </div>
                          {it.notification?.body && (
                            <div className="warehouse-noti__itemBody">{it.notification.body}</div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
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
