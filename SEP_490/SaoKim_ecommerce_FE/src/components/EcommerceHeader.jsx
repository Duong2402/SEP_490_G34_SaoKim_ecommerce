import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../styles/EcommerceHeader.css";

const NAV_LINKS = [
  { to: "/#catalog", label: "San pham" },
  { to: "/#solutions", label: "Giai phap" },
  { to: "/#projects", label: "Du an tieu bieu" },
  { to: "/#contact", label: "Lien he" },
];

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
      const name = localStorage.getItem("userName") || localStorage.getItem("userEmail");
      const cart = Number(localStorage.getItem("cartCount") || 0);
      setIsLoggedIn(Boolean(token && name));
      setUserName(name || null);
      setCartCount(Number.isFinite(cart) && cart > 0 ? cart : 0);
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
      if (["token", "userName", "userEmail", "cartCount", "role"].includes(e.key)) {
        syncSession();
      }
    };

    const onAuthChanged = () => syncSession();

    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:changed", onAuthChanged);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:changed", onAuthChanged);
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  };

  const onSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startSearch();
    }
  };

  return (
    <header className="site-header">
      <div className="site-header__announcement">
        <div className="site-header__announcement-inner">
          <span className="site-header__announcement-badge">Sao Kim Lightning</span>
          <p>
            Thiet bi chieu sang chuyen nghiep cho showroom, khach san va nha o cao cap. Nhan tu van thiet ke mien phi
            cung doi ngu ky su Sao Kim.
          </p>
          <a href="tel:0918113559" className="site-header__announcement-link">
            0918 113 559
          </a>
        </div>
      </div>

      <div className="site-header__shell">
        <div className="site-header__brand-group">
          <Link to="/" className="site-header__brand" aria-label="Trang chu">
            <span className="site-header__brand-mark">
              <span className="site-header__brand-glow" />
              <img src="/images/saokim-logo.jpg" alt="Sao Kim Lightning logo" />
            </span>
            <div className="site-header__brand-copy">
              <h1>Sao Kim Lightning</h1>
              <span>Giai phap chieu sang dong bo cho moi khong gian</span>
            </div>
          </Link>

          <nav className="site-header__nav" aria-label="Main navigation">
            {NAV_LINKS.map((item) => (
              <Link key={item.to} to={item.to} className="site-header__nav-link">
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
            <button type="button" aria-label="Start search" onClick={startSearch}>
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
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
                  <span className="site-header__user-name">{userName}</span>
                  <i className={`fa-solid fa-chevron-${menuOpen ? "up" : "down"}`} aria-hidden="true" />
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

            <Link to="/cart" className="site-header__cart" aria-label="Gio hang">
              <span className="site-header__cart-icon">
                <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
                {cartCount > 0 && <span className="site-header__cart-badge">{cartCount}</span>}
              </span>
              <span className="site-header__cart-label">Gio hang</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
