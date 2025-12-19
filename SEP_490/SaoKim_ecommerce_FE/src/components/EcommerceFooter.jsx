import React, { useState } from "react";
import { Container, Row, Col, Form, InputGroup, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faMapMarkerAlt,
  faPhoneAlt,
  faEnvelope,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { faFacebookF, faInstagram, faYoutube } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";
import "../styles/EcommerceFooter.css";

const EcommerceFooter = () => {
  const [logoFailed, setLogoFailed] = useState(false);

  const renderLogo = () =>
    !logoFailed ? (
      <img
        src="/assets/images/saokim-logo.jpg"
        alt="Sao Kim Lighting"
        className="footer-logo-img"
        onError={() => setLogoFailed(true)}
      />
    ) : (
      <div className="footer-logo-mark">SK</div>
    );

  return (
    <footer className="ecommerce-footer">
      <Container fluid className="px-0">
        <Container className="footer-inner">
          <Row className="g-4 g-lg-4">
            {/* Brand Column */}
            <Col lg={4} md={6}>
              <div className="footer-brand">
                {renderLogo()}
                <div>
                  <h2 className="footer-brand-title">Sao Kim Lighting</h2>
                  <p className="footer-intro">
                    Giải pháp chiếu sáng cao cấp cho nhà ở, văn phòng và công trình thương mại. Kết
                    hợp thiết kế tinh tế với công nghệ hiện đại để nâng tầm không gian của bạn.
                  </p>
                </div>
              </div>
            </Col>

            {/* Quick Links */}
            <Col lg={2} md={6} sm={6}>
              <h4 className="footer-heading">Liên kết</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/about">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Về chúng tôi
                  </Link>
                </li>
                <li>
                  <Link to="/products">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Sản phẩm
                  </Link>
                </li>
                <li>
                  <Link to="">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Dự án đã thực hiện
                  </Link>
                </li>
                <li>
                  <Link to="/blog">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Tin tức / Blog
                  </Link>
                </li>
              </ul>
            </Col>

            {/* Policy */}
            <Col lg={3} md={6} sm={6}>
              <h4 className="footer-heading">Chính sách</h4>
              <ul className="footer-links">
                <li>
                  <Link to="/policy/warranty">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Chính sách bảo hành
                  </Link>
                </li>
                <li>
                  <Link to="/policy/return">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Chính sách đổi trả
                  </Link>
                </li>
                <li>
                  <Link to="/policy/shipping">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Chính sách giao hàng
                  </Link>
                </li>
                <li>
                  <Link to="/support">
                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                    Hỗ trợ khách hàng
                  </Link>
                </li>
              </ul>
            </Col>

            {/* Contact */}
            <Col lg={3} md={6}>
              <h4 className="footer-heading">Liên hệ</h4>
              <ul className="contact-list">
                <li>
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-icon" />
                  <span>Địa chỉ: Số 40, ngõ 168, Nguyễn Xiển, Phường Hạ Đình, Quận Thanh Xuân, Thành phố Hà Nội, Việt Nam</span>
                </li>
                <li>
                  <FontAwesomeIcon icon={faPhoneAlt} className="contact-icon" />
                  <a href="tel:0918113559">Hotline: 0918 113 559</a>
                </li>
                <li>
                  <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                  <a href="mailto:contact@saokim.vn">Email: contact@saokim.vn</a>
                </li>
              </ul>
              <div className="footer-social">
                <a href="#" aria-label="Facebook">
                  <FontAwesomeIcon icon={faFacebookF} />
                </a>
                <a href="#" aria-label="Instagram">
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a href="#" aria-label="YouTube">
                  <FontAwesomeIcon icon={faYoutube} />
                </a>
                <a href="#" className="zalo-pill">
                  Zalo
                </a>
              </div>
            </Col>
          </Row>
        </Container>
      </Container>

      {/* Copyright */}
      <div className="footer-copyright">
        <Container>
          <Row className="align-items-center gy-3">
            <Col md={8}>
              <p className="mb-0">
                © {new Date().getFullYear()} Sao Kim Lighting. Đã đăng ký bản quyền.
              </p>
            </Col>
            <Col md={4} className="text-md-end">
              <Link to="/terms" className="footer-bottom-link">
                Điều khoản sử dụng
              </Link>
            </Col>
          </Row>
        </Container>
      </div>
    </footer>
  );
};

export default EcommerceFooter;
