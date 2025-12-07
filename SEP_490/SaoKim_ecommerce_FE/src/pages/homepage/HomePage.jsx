import React, { useState, useEffect } from "react";
import { Container, Row, Col, Button, Toast, ToastContainer } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
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
import ProductCard from "../../components/products/ProductCard";

const HomePage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const categories = [
    {
      id: 1,
      name: "Đèn chùm Luxury",
      image: "https://anandecor.vn/wp-content/uploads/2022/06/58.png?auto=format&fit=crop&q=80&w=600",
      desc: "Sang trọng & đẳng cấp",
      badge: "Bán chạy",
    },
    {
      id: 2,
      name: "Đèn tường hiện đại",
      image:
        "https://flexhouse.vn/wp-content/uploads/2023/05/Den-LED-cam-bien-gan-tuong-hien-dai-SY1018-19.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Tinh tế từng đường nét",
      badge: "Mới",
    },
    {
      id: 3,
      name: "Đèn bàn decor",
      image:
        "https://sanota.net/wp-content/uploads/2025/05/SNT5624-den-ban-decor-phong-khach-hien-dai.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Điểm nhấn không gian",
    },
    {
      id: 4,
      name: "Đèn sân cao cấp",
      image: "https://dentrangtrivirgo.com/wp-content/uploads/2022/09/10003.jpg?auto=format&fit=crop&q=80&w=600",
      desc: "Ánh sáng hoàn hảo",
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await ProductsAPI.getHomeProducts();

        let items = [];
        if (data?.newArrivals) {
          items = data.newArrivals;
        } else if (Array.isArray(data)) {
          items = data;
        } else if (data?.items) {
          items = data.items;
        }

        const normalized = items
          .map((p) => ({
            id: p.id || p.productID,
            name: p.name || p.productName,
            price: p.price,
            image: p.thumbnailUrl || p.image || "https://via.placeholder.com/600x450?text=No+Image",
            category: p.category || "Đèn trang trí",
          }))
          .slice(0, 8); 

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
  }, [products]); 

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

      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999, position: "fixed" }}>
        <Toast onClose={() => setShowToast(false)} show={showToast} delay={3000} autohide bg="success">
          <Toast.Header>
            <strong className="me-auto">Thông báo</strong>
            <small>Vừa xong</small>
          </Toast.Header>
          <Toast.Body className="text-white">{toastMessage}</Toast.Body>
        </Toast>
      </ToastContainer>

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

      <section className="featured-categories section-padding fade-in-section">
        <Container fluid className="px-0">
          <Container className="featured-categories-inner">
            <div className="featured-header text-center text-lg-start">
              <span className="featured-kicker">Bộ sưu tập</span>
              <h2 className="section-title mb-2">Danh mục nổi bật</h2>
              <p className="section-subtitle mb-0">
                Lựa chọn nhanh dòng sản phẩm phù hợp với không gian của bạn.
              </p>
            </div>

            <Row className="g-4 g-lg-4 g-xl-4">
              {categories.map((cat) => (
                <Col xl={3} lg={4} md={6} sm={12} key={cat.id}>
                  <Link to={`/products?category=${cat.id}`} className="category-card">
                    <div
                      className="category-bg"
                      style={{ backgroundImage: `url(${cat.image})` }}
                    ></div>
                    <div className="category-gradient"></div>
                    {cat.badge && <span className="category-badge">{cat.badge}</span>}
                    <div className="category-overlay">
                      <div className="category-label">Danh mục</div>
                      <h3 className="category-name">{cat.name}</h3>
                      {cat.desc && <span className="category-desc">{cat.desc}</span>}
                      <div className="category-cta">
                        <span>Xem ngay</span>
                        <FontAwesomeIcon icon={faArrowRight} />
                      </div>
                    </div>
                  </Link>
                </Col>
              ))}
            </Row>
          </Container>
        </Container>
      </section>
      <section className="featured-products section-padding fade-in-section">
        <Container>
          <div className="featured-products-header d-flex flex-column flex-lg-row align-items-lg-end justify-content-between gap-3 mb-4">
            <div>
              <span className="featured-kicker">Bộ sưu tập</span>
              <h2 className="section-title text-start mb-2">Sản phẩm nổi bật</h2>
              <p className="section-subtitle mb-0">
                Khám phá những mẫu đèn được khách hàng lựa chọn nhiều nhất.
              </p>
            </div>
            <Link to="/products" className="view-all-link">
              Xem tất cả sản phẩm <FontAwesomeIcon icon={faArrowRight} />
            </Link>
          </div>

          {loading ? (
            <Row className="g-4">
              {[...Array(8)].map((_, index) => (
                <Col xl={3} lg={3} md={6} sm={6} key={`skeleton-${index}`}>
                  <ProductSkeleton />
                </Col>
              ))}
            </Row>
          ) : (
            <Row className="g-4">
              {products.length > 0 ? (
                products.map((product) => (
                  <Col xl={3} lg={3} md={6} sm={6} key={product.id}>
                    <ProductCard
                      product={product}
                      badgeText="Mới"
                      onView={() => navigate(`/products/${product.id}`)}
                      onAddToCart={handleAddToCart}
                      formatPrice={formatCurrency}
                    />
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

      <section className="cta-section fade-in-section" id="contact">
        <Container fluid className="px-0">
          <Container className="cta-inner">
            <Row className="align-items-center gy-4">
              <Col lg={7}>
                <div className="cta-copy text-lg-start text-center">
                  <span className="cta-kicker">Tư vấn chiếu sáng</span>
                  <h2 className="cta-title">Bạn cần tư vấn giải pháp chiếu sáng?</h2>
                  <p className="cta-subtitle">
                    Đội ngũ kỹ sư của Sao Kim sẵn sàng hỗ trợ bạn chọn đèn phù hợp với từng không gian
                    và ngân sách.
                  </p>
                  <div className="cta-actions d-flex flex-wrap justify-content-center justify-content-lg-start gap-3">
                    <Button className="cta-primary" onClick={() => navigate("/contact")}>
                      Liên hệ ngay <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
                    </Button>
                    <Link to="/contact" className="cta-secondary">
                      Tư vấn miễn phí 24/7
                    </Link>
                  </div>
                </div>
              </Col>
              <Col lg={5}>
                <div className="cta-visual">
                  <div className="cta-visual-glow"></div>
                  <img
                    src="https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=900"
                    alt="Lighting consultation"
                    className="cta-visual-img"
                  />
                  <div className="cta-visual-badge">
                    <span>Lighting Design</span>
                    <strong>Premium</strong>
                  </div>
                </div>
              </Col>
            </Row>
          </Container>
        </Container>
      </section>

      <EcommerceFooter />
    </div>
  );
};

export default HomePage;





