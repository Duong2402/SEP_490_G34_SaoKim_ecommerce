import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Card, Toast, ToastContainer } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShoppingCart,
  faArrowRight,
  faStar,
  faLightbulb,
  faGem,
  faShieldAlt,
  faHeadset,
} from "@fortawesome/free-solid-svg-icons";
import "../../styles/home.css";
import { Link, useNavigate } from "react-router-dom";
import EcommerceFooter from "../../components/EcommerceFooter";
import HomepageHeader from "../../components/HomepageHeader";
import { ProductsAPI } from "../../api/products";
import { readCart, writeCart } from "../../api/cartStorage";
import ProductSkeleton from "../../components/common/ProductSkeleton";

const HomePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Mock Categories (Keep these static for now or fetch if API exists)
  const categories = [
    {
      id: 1,
      name: "Đèn Chùm Luxury",
      image: "https://anandecor.vn/wp-content/uploads/2022/06/58.png?auto=format&fit=crop&q=80&w=600",
      desc: "Sang trọng & Đẳng cấp",
    },
    {
      id: 2,
      name: "Đèn Tường Hiện Đại",
      image:
        "https://flexhouse.vn/wp-content/uploads/2023/05/Den-LED-cam-bien-gan-tuong-hien-dai-SY1018-19.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Tinh tế từng đường nét",
    },
    {
      id: 3,
      name: "Đèn Bàn Decor",
      image:
        "https://sanota.net/wp-content/uploads/2025/05/SNT5624-den-ban-decor-phong-khach-hien-dai.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Điểm nhấn không gian",
    },
    {
      id: 4,
      name: "Đèn Sàn Cao Cấp",
      image: "https://dentrangtrivirgo.com/wp-content/uploads/2022/09/10003.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Ánh sáng hoàn hảo",
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Try to get home products first
        const data = await ProductsAPI.getHomeProducts();

        // Handle different response structures
        let items = [];
        if (data?.newArrivals) {
          items = data.newArrivals;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data?.items) {
          items = data.items;
        }

        // Normalize data
        const normalized = items
          .map((p) => ({
            id: p.id || p.productID,
            name: p.name || p.productName,
            price: p.price,
            image: p.thumbnailUrl || p.image || "https://via.placeholder.com/600x450?text=No+Image",
            category: p.category || "Đèn trang trí",
          }))
          .slice(0, 8); // Limit to 8 items

        setProducts(normalized);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.1 }
    );

    const sections = document.querySelectorAll(".fade-in-section");
    sections.forEach((section) => observer.observe(section));

    return () => sections.forEach((section) => observer.unobserve(section));
  }, [products]); // Re-run when products load to catch new elements

  const formatCurrency = (value) => {
    if (!value) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  const handleAddToCart = (product) => {
    const currentCart = readCart();
    const existingItemIndex = currentCart.findIndex((item) => item.id === product.id);

    if (existingItemIndex > -1) {
      currentCart[existingItemIndex].quantity =
        (Number(currentCart[existingItemIndex].quantity) || 0) + 1;
    } else {
      currentCart.push({ ...product, quantity: 1 });
    }

    writeCart(currentCart);
    setToastMessage(`Đã thêm "${product.name}" vào giỏ hàng!`);
    setShowToast(true);
  };

  return (
    <div className="homepage-wrapper">
      <HomepageHeader />

      {/* Toast Notification */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: "fixed" }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success">
          <Toast.Header>
            <strong className="me-auto">Thông báo</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Hero Section */}
      <section className="hero-section fade-in-section">
        <div className="hero-overlay"></div>
        <Container fluid className="hero-inner">
          <Row className="align-items-center g-4">
            <Col lg={6} className="hero-copy">
              <span className="hero-kicker">
                <FontAwesomeIcon icon={faStar} className="me-2 text-warning" />
                Giải pháp ánh sáng chuyên sâu
              </span>
              <h1 className="hero-title">
                Giải pháp chiếu sáng cao cấp cho mọi không gian
              </h1>
              <p className="hero-subtitle">
                Sao Kim mang đến các dòng đèn hiện đại, tiết kiệm điện, phù hợp cho nhà ở,
                văn phòng và showroom. Thiết kế tinh xảo, công nghệ mới nhất, tối ưu trải nghiệm ánh sáng.
              </p>
              <div className="hero-actions d-flex flex-wrap align-items-center gap-3">
                <Button className="hero-cta-primary" onClick={() => navigate("/products")}>
                  Xem sản phẩm
                </Button>
                <Button className="hero-cta-secondary" variant="outline-light" href="#contact">
                  Nhận tư vấn chiếu sáng
                </Button>
              </div>
            </Col>
            <Col lg={6} className="hero-visual">
              <div className="hero-visual-card">
                <div className="hero-visual-gradient"></div>
                <img
                  src="https://luxlightdesigns.com/images/slider/1.webp?auto=format&fit=crop&q=80&w=1600"
                  alt="Modern lighting"
                  className="hero-visual-img"
                />
                <div className="hero-visual-stats">
                  <div>
                    <strong>450+</strong>
                    <span>Dự án showroom & văn phòng</span>
                  </div>
                  <div>
                    <strong>24/7</strong>
                    <span>Tư vấn & hỗ trợ kỹ thuật</span>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Stats Bar */}
      <div className="stats-bar fade-in-section">
        <Container>
          <Row className="justify-content-center text-center g-4">
            <Col md={3} sm={6}>
              <div className="stat-item">
                <FontAwesomeIcon icon={faGem} className="stat-icon" />
                <div className="stat-text">
                  <strong>Thiết Kế Độc Quyền</strong>
                  <span>Sang trọng & Tinh tế</span>
                </div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="stat-item">
                <FontAwesomeIcon icon={faShieldAlt} className="stat-icon" />
                <div className="stat-text">
                  <strong>Bảo Hành 5 Năm</strong>
                  <span>Cam kết chất lượng</span>
                </div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="stat-item">
                <FontAwesomeIcon icon={faLightbulb} className="stat-icon" />
                <div className="stat-text">
                  <strong>Công Nghệ LED</strong>
                  <span>Tiết kiệm & Bền bỉ</span>
                </div>
              </div>
            </Col>
            <Col md={3} sm={6}>
              <div className="stat-item">
                <FontAwesomeIcon icon={faHeadset} className="stat-icon" />
                <div className="stat-text">
                  <strong>Hỗ Trợ 24/7</strong>
                  <span>Tư vấn chuyên sâu</span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Categories Section */}
      <section className="section-padding fade-in-section">
        <Container>
          <div className="text-center mb-5">
            <h2 className="section-title">Danh Mục Nổi Bật</h2>
            <p className="section-subtitle">
              Lựa chọn phong cách ánh sáng cho ngôi nhà của bạn
            </p>
          </div>
          <Row className="g-4">
            {categories.map((cat) => (
              <Col lg={3} md={6} key={cat.id}>
                <div className="category-card">
                  <div
                    className="category-bg"
                    style={{ backgroundImage: `url(${cat.image})` }}
                  ></div>
                  <div className="category-overlay">
                    <h3 className="category-name">{cat.name}</h3>
                    <span className="category-desc">{cat.desc}</span>
                    <Link to={`/products?category=${cat.id}`} className="category-link">
                      Khám phá <FontAwesomeIcon icon={faArrowRight} />
                    </Link>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Featured Products Section */}
      <section
        className="section-padding fade-in-section"
        style={{ backgroundColor: "var(--light-bg)" }}
      >
        <Container>
          <div className="d-flex justify-content-between align-items-end mb-5">
            <div>
              <h2 className="section-title text-start">Sản Phẩm Mới Nhất</h2>
            </div>
            <Link
              to="/products"
              className="text-decoration-none fw-bold"
              style={{ color: "var(--primary)" }}
            >
              Xem tất cả <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          {loading ? (
            <Row className="g-4">
              {[...Array(8)].map((_, index) => (
                <Col lg={3} md={6} sm={6} key={`skeleton-${index}`}>
                  <ProductSkeleton />
                </Col>
              ))}
            </Row>
          ) : (
            <Row className="g-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <Col lg={3} md={6} sm={6} key={product.id}>
                    <Card className="luxury-card">
                      <div className="product-badge">New</div>
                      <div className="luxury-card-img-wrapper">
                        <Card.Img
                          variant="top"
                          src={product.image}
                          className="luxury-card-img cursor-pointer"
                          onClick={() => navigate(`/products/${product.id}`)}
                        />
                        <div className="product-actions">
                          <Button
                            className="action-btn"
                            title="Thêm vào giỏ"
                            onClick={() => handleAddToCart(product)}
                          >
                            <FontAwesomeIcon icon={faShoppingCart} />
                          </Button>
                          <Link
                            to={`/products/${product.id}`}
                            className="action-btn"
                            title="Xem chi tiết"
                          >
                            <FontAwesomeIcon icon={faArrowRight} />
                          </Link>
                        </div>
                      </div>
                      <Card.Body className="luxury-card-body">
                        <div className="luxury-card-cat">{product.category}</div>
                        <Card.Title
                          className="luxury-card-title cursor-pointer"
                          onClick={() => navigate(`/products/${product.id}`)}
                        >
                          {product.name}
                        </Card.Title>
                        <div className="luxury-card-price">
                          {formatCurrency(product.price)}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col className="text-center">
                  <p>Chưa có sản phẩm nào.</p>
                </Col>
              )}
            </Row>
          )}
        </Container>
      </section>

      {/* CTA Section */}
      <section className="cta-section fade-in-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center">
              <h2 className="cta-title">Bạn Cần Tư Vấn Giải Pháp Chiếu Sáng?</h2>
              <p className="cta-desc">
                Đội ngũ kỹ sư ánh sáng của Sao Kim sẵn sàng hỗ trợ bạn thiết kế
                và lựa chọn giải pháp tối ưu nhất cho công trình.
              </p>
              <Button className="hero-btn">
                Liên Hệ Ngay <FontAwesomeIcon icon={faHeadset} className="ms-2" />
              </Button>
            </Col>
          </Row>
        </Container>
      </section>

      <EcommerceFooter />
    </div>
  );
};

export default HomePage;

