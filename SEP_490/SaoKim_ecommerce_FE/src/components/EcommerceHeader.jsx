import React, { useEffect, useState } from "react";
import { Navbar, Container, Nav, Form, Button, InputGroup, Dropdown, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faShoppingCart,
  faUser,
  faBars,
  faSignOutAlt,
  faUserCircle,
  faKey
} from "@fortawesome/free-solid-svg-icons";
import "../styles/EcommerceHeader.css";
import { readCart } from "../api/cartStorage";

const EcommerceHeader = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [userName, setUserName] = useState(null);
  const [query, setQuery] = useState("");

  // Handle scroll for shadow effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Sync session and cart
  const syncSession = () => {
    try {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || localStorage.getItem("userEmail");
      setUserName(token && name ? name : null);

      // Update cart count from storage
      const cart = readCart();
      const count = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      setCartCount(count);
    } catch (e) {
      console.error("Session sync error", e);
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

  const handleLogout = () => {
    ["token", "userEmail", "userName", "role"].forEach((k) => localStorage.removeItem(k));
    window.dispatchEvent(new Event("auth:changed"));
    navigate("/login");
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <Navbar
      expand="lg"
      sticky="top"
      className={`ecommerce-header ${isScrolled ? "scrolled" : ""}`}
    >
      <Container>
        {/* Brand */}
        <Navbar.Brand as={Link} to="/" className="brand-logo">
          <img
            src="/images/saokim-logo.jpg"
            alt="Sao Kim Lighting"
            className="brand-image"
            style={{ height: '80px', objectFit: 'contain' }}
          />
          <span className="brand-text ms-2">Sao Kim Lighting</span>
        </Navbar.Brand>

        {/* Mobile Toggle */}
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <FontAwesomeIcon icon={faBars} />
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          {/* Search Bar (Center) */}
          <div className="mx-auto my-3 my-lg-0 search-container">
            <Form onSubmit={handleSearch} className="d-flex w-100">
              <InputGroup>
                <Form.Control
                  type="search"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <Button type="submit" variant="warning" className="search-btn">
                  <FontAwesomeIcon icon={faSearch} />
                </Button>
              </InputGroup>
            </Form>
          </div>

          {/* Navigation & Icons (Right) */}
          <Nav className="ms-auto align-items-center gap-3">
            <Nav.Link as={Link} to="/" className="nav-item-link">
              Trang chủ
            </Nav.Link>
            <Nav.Link as={Link} to="/products" className="nav-item-link">
              Sản phẩm
            </Nav.Link>
            <Nav.Link as={Link} to="/about" className="nav-item-link">
              Giới thiệu
            </Nav.Link>

            {/* Cart */}
            <Nav.Link as={Link} to="/cart" className="icon-link position-relative">
              <FontAwesomeIcon icon={faShoppingCart} size="lg" />
              {cartCount > 0 && (
                <Badge bg="danger" pill className="cart-badge">
                  {cartCount}
                </Badge>
              )}
            </Nav.Link>

            {/* User Account */}
            {userName ? (
              <Dropdown align="end">
                <Dropdown.Toggle variant="link" className="user-dropdown-toggle p-0 border-0">
                  <div className="user-avatar">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="user-menu shadow">
                  <div className="px-3 py-2 border-bottom">
                    <small className="text-muted">Xin chào,</small>
                    <div className="fw-bold text-truncate" style={{ maxWidth: "150px" }}>
                      {userName}
                    </div>
                  </div>
                  <Dropdown.Item as={Link} to="/account">
                    <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                    Tài khoản
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/change-password">
                    <FontAwesomeIcon icon={faKey} className="me-2" />
                    Đổi mật khẩu
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <FontAwesomeIcon icon={faSignOutAlt} className="me-2" />
                    Đăng xuất
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            ) : (
              <Link to="/login" className="btn btn-outline-primary rounded-pill px-4 ms-2">
                Đăng nhập
              </Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default EcommerceHeader;
