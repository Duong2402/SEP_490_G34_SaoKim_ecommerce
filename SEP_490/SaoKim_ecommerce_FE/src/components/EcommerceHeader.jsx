import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./EcommerceHeader.css";

const NAV_LINKS = [
  { to: "/#catalog", label: "San pham" },
  { to: "/#solutions", label: "Giai phap" },
  { to: "/#projects", label: "Du an tieu bieu" },
  { to: "/#contact", label: "Lien he" },
];

export default function EcommerceHeader() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const syncSession = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || localStorage.getItem("userEmail");
      const cart = Number(localStorage.getItem("cartCount") || 0);
      setIsLoggedIn(Boolean(token && name));
      setUserName(name || null);
      setCartCount(Number.isFinite(cart) ? cart : 0);
    };

    syncSession();
    window.addEventListener("localStorageChange", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("localStorageChange", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  const handleLogout = () => {
    ["token", "userEmail", "userName", "role"].forEach((key) => localStorage.removeItem(key));
    setIsLoggedIn(false);
    setUserName(null);
    setCartCount(0);
    window.dispatchEvent(new Event("localStorageChange"));
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
          <Link to="/" className="site-header__brand">
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
            <input type="search" placeholder="Tim kiem san pham, dong den, ma thiet bi..." aria-label="Search products" />
            <button type="button" aria-label="Start search">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </button>
          </div>

          <div className="site-header__actions">
            {isLoggedIn ? (
              <div className="site-header__user">
                <span className="site-header__user-hello">Xin chao</span>
                <strong className="site-header__user-name">{userName}</strong>
                <button type="button" className="btn btn-outline btn-small" onClick={handleLogout}>
                  Dang xuat
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-outline btn-small">
                Dang nhap
              </Link>
            )}

            <Link to="/cart" className="site-header__cart">
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
