import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

export default function EcommerceHeader() {
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName");
      setIsLoggedIn(!!(token && name));
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
    <header className="bg-white shadow-sm">
      {/* Top bar - Thông tin liên hệ */}
      <div className="bg-gray-100 py-2 border-b">
        <div className="container-fluid px-4 d-flex justify-content-between align-items-center">
          <div className="d-flex gap-4 text-sm">
            <span>Đường dây nóng: <strong>0918113559</strong></span>
            <span>Email: <strong>dungnqhe161764@fpt.edu.vn</strong></span>
          </div>
          <div className="text-sm">
            <Link to="/track-order" className="text-dark text-decoration-none">Theo dõi đơn hàng</Link>
          </div>
        </div>
      </div>

      {/* Main header - Logo, Search, Cart */}
      <div className="py-3">
        <div className="container-fluid px-4">
          <div className="row align-items-center">
            {/* Logo và Slogan */}
            <div className="col-md-3">
              <Link to="/" className="text-decoration-none d-flex align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <img
                    src="/images/saokim-logo.jpg"
                    alt="SaoKim Logo"
                    style={{ height: 50 }}
                  />
                  <div className="d-flex flex-column">
                    <div className="fw-bold text-dark">SaoKim E-commerce</div>
                    <small className="text-muted">KHÔNG BAO GIỜ TẮT</small>
                  </div>
                </div>
              </Link>
            </div>

            {/* Search Bar */}
            <div className="col-md-6">
              <div className="input-group">
                <select className="form-select" style={{ maxWidth: 100 }}>
                  <option>All</option>
                  <option>Sản phẩm</option>
                  <option>Danh mục</option>
                </select>
                <input
                  type="search"
                  className="form-control"
                  placeholder="Tìm kiếm..."
                />
              </div>
            </div>

            {/* User & Cart */}
            <div className="col-md-3 d-flex justify-content-end gap-3 align-items-center">
              {isLoggedIn ? (
                <>
                  <span className="text-dark">Xin chào, {userName}</span>
                  <button onClick={handleLogout} className="btn btn-outline-secondary btn-sm">
                    Đăng xuất
                  </button>
                </>
              ) : (
                <Link to="/login" className="btn btn-outline-primary btn-sm">
                  ĐĂNG NHẬP / ĐĂNG KÝ
                </Link>
              )}
              <div className="d-flex align-items-center gap-2">
                <span className="text-dark">{cartCount} VND</span>
                <Link to="/cart" className="btn btn-outline-secondary btn-sm">
                  🛒
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

