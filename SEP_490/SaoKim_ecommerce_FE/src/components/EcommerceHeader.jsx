import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

import "../styles/EcommerceHeader.css";

const NAV_LINKS = [
  { to: "/#catalog", label: "San pham" },
  { to: "/#solutions", label: "Giai phap" },
  { to: "/#projects", label: "Du an tieu bieu" },
  { to: "/#contact", label: "Lien he" },
];

// Xác định "chủ giỏ hàng" theo email / username
function getCartOwnerKey() {
  if (typeof window === "undefined") return "guest";
  const email = localStorage.getItem("userEmail");
  const name = localStorage.getItem("userName");
  return (email || name || "guest").toString();
}

function getCartCountKeyForCurrentUser() {
  const owner = getCartOwnerKey();
  return `cartCount_${owner}`;
}

function getCartCountValue() {
  if (typeof window === "undefined") return 0;
  try {
    const key = getCartCountKeyForCurrentUser();
    const raw = Number(localStorage.getItem(key) || 0);
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

  const userMenuRef = useRef(null);

  const syncSession = () => {
    try {
      const token = localStorage.getItem("token");
      const name =
        localStorage.getItem("userName") || localStorage.getItem("userEmail");
      const cart = getCartCountValue();

      setIsLoggedIn(Boolean(token && name));
      setUserName(name || null);
      setCartCount(cart);
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

      // đổi token / thông tin user
      if (["token", "userName", "userEmail", "role"].includes(e.key)) {
        syncSession();
        return;
      }

      // bất kỳ cartCount_<owner> đổi
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

  // cuộn tới anchor khi route có hash
  useEffect(() => {
    if (location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location]);

  // đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    try {
      ["token", "userEmail", "userName", "role"].forEach((k) =>
        localStorage.removeItem(k)
      );
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
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startSearch();
    }
  };

  return (
    <header className="site-header">
      <div className="site-header__shell">
        <div className="site-header__brand-group">
          <Link
            to="/"
            className="site-header__brand"
            aria-label="Trang chu"
          >
            <span className="site-header__brand-mark">
              <span className="site-header__brand-glow" />
              <img
                src="/images/saokim-logo.jpg"
                alt="Sao Kim Lightning logo"
              />
            </span>
            <div className="site-header__brand-copy">
              <h1>Sao Kim Lightning</h1>
              <span>Giai phap chieu sang dong bo cho moi khong gian</span>
            </div>
          </Link>

          <nav className="site-header__nav" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="site-header__nav-link"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="site-header__utility">
          <div className="site-header__search">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKeyDown}
              placeholder="Tim kiem san pham, dong den, ma thiet bi..."
              aria-label="Search products"
            />
            <button
              type="button"
              aria-label="Start search"
              onClick={startSearch}
            >
              <i
                className="fa-solid fa-magnifying-glass"
                aria-hidden="true"
              />
            </button>
          </div>

          <div className="site-header__actions" ref={userMenuRef}>
            {isLoggedIn ? (
              <div className="site-header__user">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    cursor: "pointer",
                    color: "inherit",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                  }}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen ? "true" : "false"}
                >
                  <span className="site-header__user-name">
                    {userName}
                  </span>
                  <i
                    className={`fa-solid fa-chevron-${
                      menuOpen ? "up" : "down"
                    }`}
                    aria-hidden="true"
                  />
                </button>

                {menuOpen && (
                  <div
                    role="menu"
                    style={{
                      position: "absolute",
                      marginTop: "0.5rem",
                      right: 0,
                      background: "#fff",
                      border: "1px solid rgba(17,32,56,0.12)",
                      borderRadius: 12,
                      boxShadow: "0 10px 24px -12px rgba(18,49,87,0.28)",
                      minWidth: 200,
                      overflow: "hidden",
                      zIndex: 50,
                    }}
                  >
                    <Link
                      to="/account"
                      role="menuitem"
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 14px",
                        textDecoration: "none",
                        color: "var(--text-primary)",
                        fontWeight: 600,
                      }}
                    >
                      Thong tin tai khoan
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 14px",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                      }}
                    >
                      Dang xuat
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline btn-small">
                Dang nhap
              </Link>
            )}
            
            <Link
              to="/cart"
              className="site-header__cart"
              aria-label="Giỏ hàng"
            >
              <span className="site-header__cart-icon">
                <i
                  className="fa-solid fa-bag-shopping"
                  aria-hidden="true"
                />
                {cartCount > 0 && (
                  <span className="site-header__cart-badge">
                    {cartCount}
                  </span>
                )}
              </span>
              <span className="site-header__cart-label">Giỏ hàng</span>
            </Link>
            <Link
              to="/account/orders"
              className="site-header__cart"
              aria-label="Đơn hàng của tôi"
            >
              <span className="site-header__cart-icon">
                <i className="fa-solid fa-receipt" aria-hidden="true" />
              </span>
              <span className="site-header__cart-label">Đơn hàng của tôi</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
