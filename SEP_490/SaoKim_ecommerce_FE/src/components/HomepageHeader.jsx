import React, { useEffect, useRef, useState } from "react";
import { Navbar, Container, Nav, Form, Button, InputGroup, Dropdown, Badge } from "react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faShoppingCart, faUser } from "@fortawesome/free-solid-svg-icons";
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
  const [query, setQuery] = useState("");
  const fetchingNameRef = useRef(false);

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

  const syncSession = () => {
    try {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName") || "";
      const email = localStorage.getItem("userEmail") || "";
      const displayName = formatDisplayName(name) || deriveNameFromEmail(email) || email;

      setUserName(token && displayName ? displayName : null);

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
    if (query.trim()) {
      navigate(`/products?search=${encodeURIComponent(query.trim())}`);
    }
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
    <Navbar
      expand="lg"
      sticky="top"
      className={`homepage-navbar ${isScrolled ? "is-sticky" : ""}`}
    >
      <Container fluid className="header-shell">
        <Navbar.Brand as={Link} to="/" className="brand-area">
          <div className="logo-wrapper">
            <img src="/images/saokim-logo.jpg" alt="Sao Kim Lighting" />
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
              <Nav.Link
                key={to}
                as={Link}
                to={to}
                className={`nav-pill ${isActive(to) ? "active" : ""}`}
              >
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

            {userName ? (
              <Dropdown align="end" className="user-dropdown">
                <Dropdown.Toggle variant="link" className="user-toggle p-0 border-0">
                  <div className="avatar-circle">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                </Dropdown.Toggle>

                <Dropdown.Menu className="user-dropdown-menu shadow">
                  <div className="user-meta">
                  <div className="user-meta__label">Xin chào</div>
                  <div className="user-meta__name">{userName}</div>
                </div>
                  <Dropdown.Item as={Link} to="/account/orders">
                    Đơn hàng của tôi
                  </Dropdown.Item>
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
