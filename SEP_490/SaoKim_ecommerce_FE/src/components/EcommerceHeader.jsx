import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./EcommerceHeader.css";

export default function EcommerceHeader() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName");
      setIsLoggedIn(Boolean(token && name));
      setUserName(name || null);
    };

    checkAuth();
    window.addEventListener("localStorageChange", checkAuth);
    return () => window.removeEventListener("localStorageChange", checkAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setUserName(null);
    window.dispatchEvent(new Event("localStorageChange"));
  };

  return (
    <header className="site-header">
      <div className="site-header__top">
        <div className="site-header__top-inner">
          <div className="site-header__contact">
            <span>
              <i className="fa-solid fa-phone-volume" aria-hidden="true" />
              Hotline: 0918 113 559
            </span>
            <span>
              <i className="fa-solid fa-envelope" aria-hidden="true" />
              hello@saokim.vn
            </span>
          </div>
          <Link to="/track-order">Track your order</Link>
        </div>
      </div>

      <div className="site-header__main">
        <Link to="/" className="site-header__brand">
          <img src="/images/saokim-logo.jpg" alt="SaoKim logo" />
          <div>
            <h1>SaoKim Commerce</h1>
            <span>Lighting solutions for modern spaces</span>
          </div>
        </Link>

        <div className="site-header__search">
          <select aria-label="Search scope">
            <option value="all">All</option>
            <option value="product">Products</option>
            <option value="category">Categories</option>
          </select>
          <input type="search" placeholder="Search for pendant lights, track lights, accessories..." />
          <i className="fa-solid fa-magnifying-glass text-muted" aria-hidden="true" />
        </div>

        <div className="site-header__actions">
          {isLoggedIn ? (
            <div className="site-header__user">
              <span>Welcome back</span>
              <strong>{userName}</strong>
              <button onClick={handleLogout} className="btn btn-outline-primary btn-sm">
                Sign out
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-outline-primary btn-sm">
              Sign in / Register
            </Link>
          )}

          <div className="site-header__cart">
            <span className="text-secondary d-block text-end small">Cart</span>
            <Link to="/cart" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-bag-shopping" aria-hidden="true" />
              <span>{cartCount > 0 ? `${cartCount} items` : "View cart"}</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
