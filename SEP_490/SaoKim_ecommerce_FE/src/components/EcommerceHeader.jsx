import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../styles/EcommerceHeader.css";

const NAV_LINKS = [
  { to: "/#catalog", label: "Sản phẩm" },
  { to: "/#solutions", label: "Giải pháp" },
  { to: "/#projects", label: "Bộ sưu tập" },
  { to: "/#contact", label: "Liên hệ" },
];

function getCartOwnerKey() {
  if (typeof window === "undefined") return "guest";
  const email = localStorage.getItem("userEmail");
  const name = localStorage.getItem("userName");
  return (email || name || "guest").toString();
}

function getCartCountValue() {
  if (typeof window === "undefined") return 0;
  try {
    const ownerKey = `cartCount_${getCartOwnerKey()}`;
    const raw = Number(localStorage.getItem(ownerKey) || 0);
    return Number.isFinite(raw) && raw > 0 ? raw : 0;
  } catch {
    return 0;
  }
}

export default function EcommerceHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef(null);

  const syncSession = () => {
    try {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || localStorage.getItem("userEmail");
      setIsLoggedIn(Boolean(token && name));
      setUserName(name || null);
      setCartCount(getCartCountValue());
    } catch {
      setIsLoggedIn(false);
      setUserName(null);
      setCartCount(0);
    }
  };

  useEffect(() => {
    syncSession();

    const onStorage = (e) => {
      if (!e || !e.key) {
        syncSession();
        return;
      }
      if (["token", "userName", "userEmail", "role"].includes(e.key)) {
        syncSession();
      }
      if (e.key && e.key.startsWith("cartCount_")) {
        syncSession();
      }
    };

    const onAuthChanged = () => syncSession();
    const onLocalStorageChange = () => syncSession();

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);
    window.addEventListener("localStorageChange", onLocalStorageChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
      window.removeEventListener("localStorageChange", onLocalStorageChange);
    };
  }, []);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setMobileOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    try {
      ["token", "userEmail", "userName", "role"].forEach((k) => localStorage.removeItem(k));
    } catch {}
    setIsLoggedIn(false);
    setUserName(null);
    setCartCount(0);
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  const startSearch = () => {
    const q = (query || "").trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setMobileOpen(false);
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startSearch();
    }
  };

  return (
    <header className="sk-header">
      <div className="sk-header__glow" />
      <div className="sk-header__bar">
        <Link to="/" className="sk-header__brand" aria-label="Trang chủ Sao Kim">
          <span className="sk-header__logo">
            <img src="/images/saokim-logo.jpg" alt="Sao Kim" />
          </span>
          <div className="sk-header__brand-text">
            <span className="sk-header__brand-title">Sao Kim Lighting</span>
            <span className="sk-header__brand-sub">Giải pháp chiếu sáng đồng bộ</span>
          </div>
        </Link>

        <button
          type="button"
          className="sk-header__menu-btn"
          aria-label="Mở menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <i className={`fa-solid fa-${mobileOpen ? "xmark" : "bars"}`} aria-hidden="true" />
        </button>

        <div className={`sk-header__group${mobileOpen ? " is-open" : ""}`}>
          <nav className={`sk-header__nav${mobileOpen ? " is-open" : ""}`} aria-label="Điều hướng chính">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="sk-header__nav-link"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className={`sk-header__actions${mobileOpen ? " is-open" : ""}`}>
            <div className="sk-header__search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Tìm kiếm sản phẩm, mã thiết bị..."
                aria-label="Tìm kiếm sản phẩm"
              />
              <button type="button" aria-label="Bắt đầu tìm kiếm" onClick={startSearch}>
                Tìm
              </button>
            </div>

            <Link to="/cart" className="sk-header__icon-btn" aria-label="Giỏ hàng" onClick={() => setMobileOpen(false)}>
              <span className="sk-header__icon-badge">
                <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                {cartCount > 0 && <span className="sk-header__badge">{cartCount}</span>}
              </span>
              <span className="sk-header__icon-label">Giỏ hàng</span>
            </Link>

            <Link
              to="/account/orders"
              className="sk-header__icon-btn"
              aria-label="Đơn hàng của tôi"
              onClick={() => setMobileOpen(false)}
            >
              <span className="sk-header__icon-badge">
                <i className="fa-solid fa-receipt" aria-hidden="true" />
              </span>
              <span className="sk-header__icon-label">Đơn hàng</span>
            </Link>

            <div className="sk-header__user" ref={menuRef}>
              {isLoggedIn ? (
                <>
                  <button
                    type="button"
                    className="sk-header__user-icon"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen ? "true" : "false"}
                  >
                    <span className="sk-header__avatar-circle">
                      {(userName || "U").slice(0, 1).toUpperCase()}
                    </span>
                    <i className={`fa-solid fa-chevron-${menuOpen ? "up" : "down"}`} aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <div className="sk-header__dropdown" role="menu">
                      <div className="sk-header__dropdown-header">
                        <div className="sk-header__avatar-circle">
                          {(userName || "U").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="sk-header__dropdown-meta">
                          <strong>{userName}</strong>
                          <span>Tài khoản của bạn</span>
                        </div>
                      </div>
                      <Link to="/account" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Thông tin cá nhân
                      </Link>
                      <Link to="/change-password" role="menuitem" onClick={() => setMenuOpen(false)}>
                        Đổi mật khẩu
                      </Link>
                      <button type="button" role="menuitem" onClick={handleLogout}>
                        Đăng xuất
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <Link to="/login" className="sk-header__login" aria-label="Đăng nhập">
                  <i className="fa-solid fa-user" aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
