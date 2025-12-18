import React, { useEffect, useRef, useState } from "react";
import { Navbar, Container, Nav, Form, Button, InputGroup, Dropdown, Badge } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faShoppingCart, faUser, faBell } from "@fortawesome/free-solid-svg-icons";
import "../styles/HomepageHeader.css";
import { readCart } from "../api/cartStorage";

let API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

const HomepageHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState(null);
  const [role, setRole] = useState(null);
  const [query, setQuery] = useState("");
  const fetchingNameRef = useRef(false);

  // Notification state
  const [notificationCount, setNotificationCount] = useState(0);
  const [notiItems, setNotiItems] = useState([]);
  const [tab, setTab] = useState("all");
  const [notiOpen, setNotiOpen] = useState(false);
  const [loadingNoti, setLoadingNoti] = useState(false);
  const notiRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const formatDisplayName = (value) => {
    if (!value) return "";
    return value
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const deriveNameFromEmail = (email) => formatDisplayName(email?.split("@")[0] || "");
  const authToken = () => localStorage.getItem("token") || "";

  const isCustomerRole = (r) => String(r || "").trim().toLowerCase() === "customer";

  const getHomePathByRole = (r) => {
    const roleNorm = String(r || "").trim().toLowerCase();

    if (roleNorm === "warehouse_manager") return "/warehouse-dashboard";
    if (roleNorm === "admin" || roleNorm === "administrator") return "/admin";
    if (roleNorm === "customer") return "/";
    if (roleNorm === "manager") return "/manager";
    if (roleNorm === "project_manager") return "/projects";
    if (roleNorm === "staff") return "/staff/manager-dashboard";

    return "/";
  };

  const fetchUnreadCount = async () => {
    const token = authToken();
    if (!token) {
      setNotificationCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const json = await res.json();
      setNotificationCount(json?.data?.count ?? json?.count ?? 0);
    } catch {
      // ignore
    }
  };

  const fetchNotiList = async () => {
    const token = authToken();
    if (!token) return;

    setLoadingNoti(true);
    try {
      const unreadParam = tab === "unread" ? "&onlyUnread=true" : "";
      const res = await fetch(`${API_BASE}/api/notifications?page=1&pageSize=10${unreadParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const json = await res.json();
      setNotiItems(json?.data?.items ?? json?.items ?? []);
    } catch {
      // ignore
    } finally {
      setLoadingNoti(false);
    }
  };

  useEffect(() => {
    fetchNotiList();
  }, [tab]);

  useEffect(() => {
    fetchUnreadCount();
    const t = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notiOpen && notiRef.current && !notiRef.current.contains(e.target)) {
        setNotiOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notiOpen]);

  const goByLink = (linkUrl) => {
    if (!linkUrl) return;

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
  };

  const handleOpenNotiItem = async (x) => {
    const token = authToken();
    if (!token) return;

    try {
      if (!x.isRead) {
        await fetch(`${API_BASE}/api/notifications/${x.userNotificationId}/read`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchUnreadCount();
      }
    } catch {
      // ignore
    }

    setNotiOpen(false);
    goByLink(x?.notification?.linkUrl);
  };

  const openNoti = async () => {
    const token = authToken();
    if (!token) return;

    const next = !notiOpen;
    setNotiOpen(next);

    if (next) {
      await fetchUnreadCount();
      await fetchNotiList();
    }
  };

  const syncSession = () => {
    try {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || "";
      const email = localStorage.getItem("userEmail") || "";
      const savedRole = localStorage.getItem("role") || "";

      const displayName = formatDisplayName(name) || deriveNameFromEmail(email) || email;

      setUserName(token && displayName ? displayName : null);
      setRole(token ? savedRole : null);

      const cart = readCart();
      const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      setCartCount(count);
    } catch (error) {
      console.error("Session sync error", error);
    }
  };

  useEffect(() => {
    syncSession();
    const handleStorageChange = () => syncSession();

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", handleStorageChange);
    window.addEventListener("auth:changed", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", handleStorageChange);
      window.removeEventListener("auth:changed", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const email = localStorage.getItem("userEmail");
    if (!token || !email || userName || fetchingNameRef.current) return;

    const fetchName = async () => {
      try {
        fetchingNameRef.current = true;
        const res = await fetch(`${API_BASE}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;

        const data = await res.json();
        const name = formatDisplayName(data?.name || "");
        if (name) {
          localStorage.setItem("userName", name);
          setUserName(name);
          window.dispatchEvent(new Event("localStorageChange"));
        }
      } catch (error) {
        console.error("Fetch profile name error", error);
      } finally {
        fetchingNameRef.current = false;
      }
    };

    fetchName();
  }, [userName]);

  const handleLogout = () => {
    ["token", "userEmail", "userName", "role"].forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  const handleSearch = (event) => {
    event.preventDefault();
    if (query.trim()) navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  const navLinks = [
    { to: "/", label: "Trang chủ" },
    { to: "/products", label: "Sản phẩm" },
    { to: "/about", label: "Giới thiệu" },
  ];

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <Navbar expand="lg" sticky="top" className={`homepage-navbar ${isScrolled ? "is-sticky" : ""}`}>
      <Container fluid className="header-shell">
        <Navbar.Brand as={Link} to="/" className="brand-area">
          <div className="logo-wrapper">
            <img src="/assets/images/saokim-logo.png" alt="Sao Kim Lighting" />
          </div>
          <div>
            <span className="brand-name d-block">Sao Kim Lighting</span>
            <small className="brand-tagline">Premium Lighting Boutique</small>
          </div>
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="homepage-nav" className="toggler-custom shadow-none border-0">
          <span className="navbar-toggler-icon" />
        </Navbar.Toggle>

        <Navbar.Collapse id="homepage-nav" className="mt-3 mt-lg-0">
          <div className="header-search flex-grow-1 mx-lg-4">
            <Form onSubmit={handleSearch} className="w-100">
              <InputGroup className="search-group">
                <Form.Control
                  type="search"
                  placeholder="Tìm kiếm sản phẩm..."
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <Button type="submit" variant="warning" className="search-button">
                  <FontAwesomeIcon icon={faSearch} />
                </Button>
              </InputGroup>
            </Form>
          </div>

          <Nav className="ms-auto align-items-center header-nav">
            {navLinks.map(({ to, label }) => (
              <Nav.Link key={to} as={Link} to={to} className={`nav-pill ${isActive(to) ? "active" : ""}`}>
                {label}
              </Nav.Link>
            ))}

            <Nav.Link as={Link} to="/cart" className="icon-link cart-link position-relative">
              <FontAwesomeIcon icon={faShoppingCart} />
              {cartCount > 0 && (
                <Badge bg="warning" pill className="cart-count">
                  {cartCount}
                </Badge>
              )}
            </Nav.Link>

            <div className="header-noti" ref={notiRef}>
              <button
                type="button"
                className="header-noti__btn"
                aria-haspopup="true"
                aria-expanded={notiOpen}
                onClick={openNoti}
                title="Thông báo"
              >
                <FontAwesomeIcon icon={faBell} />
                {notificationCount > 0 && (
                  <span className="header-noti__badge">{notificationCount > 99 ? "99+" : notificationCount}</span>
                )}
              </button>

              {notiOpen && (
                <div className="header-noti__menu" role="menu">
                  <div className="header-noti__header">
                    <div className="header-noti__title">Thông báo</div>

                    <div className="header-noti__tabs">
                      <button
                        type="button"
                        className={"header-noti__tab " + (tab === "all" ? "is-active" : "")}
                        onClick={() => setTab("all")}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        className={"header-noti__tab " + (tab === "unread" ? "is-active" : "")}
                        onClick={() => setTab("unread")}
                      >
                        Chưa đọc
                      </button>
                    </div>
                  </div>

                  <div className="header-noti__list">
                    {loadingNoti ? (
                      <div className="header-noti__empty">Đang tải...</div>
                    ) : notiItems.length === 0 ? (
                      <div className="header-noti__empty">Chưa có thông báo</div>
                    ) : (
                      notiItems.map((x) => (
                        <button
                          key={x.userNotificationId}
                          type="button"
                          className={"header-noti__item " + (!x.isRead ? "is-unread" : "")}
                          onClick={() => handleOpenNotiItem(x)}
                        >
                          <div className="header-noti__itemTitle">{x.notification?.title || "Thông báo"}</div>
                          {x.notification?.body && <div className="header-noti__itemBody">{x.notification.body}</div>}
                          <div className="header-noti__time">
                            {x.notification?.createdAt ? new Date(x.notification.createdAt).toLocaleString() : ""}
                          </div>
                          {!x.isRead && <span className="header-noti__dot" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {userName ? (
              <Dropdown align="end" className="user-dropdown">
                <Dropdown.Toggle variant="link" className="user-toggle p-0 border-0">
                  <div className="avatar-circle">{userName.charAt(0).toUpperCase()}</div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="user-dropdown-menu shadow">
                  <div className="user-meta">
                    <div className="user-meta__label">Xin chào</div>
                    <div className="user-meta__name">{userName}</div>
                  </div>

                  {isCustomerRole(role) ? (
                    <Dropdown.Item as={Link} to="/account/orders">
                      Đơn hàng của tôi
                    </Dropdown.Item>
                  ) : (
                    <Dropdown.Item onClick={() => navigate(getHomePathByRole(role))}>
                      Dashboard
                    </Dropdown.Item>
                  )}

                  <Dropdown.Item as={Link} to="/account">
                    Hồ sơ cá nhân
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/change-password">
                    Đổi mật khẩu
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Link to="/login" className="btn cta-login ms-lg-2">
                <FontAwesomeIcon icon={faUser} className="me-2" />
                Đăng nhập
              </Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default HomepageHeader;
