import React from "react";
import { Container, Row, Col } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faMapMarkerAlt,
    faPhoneAlt,
    faEnvelope,
    faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";
import "../styles/EcommerceFooter.css";

const EcommerceFooter = () => {
    return (
        <footer className="ecommerce-footer">
            <Container>
                <Row className="g-4">
                    {/* Brand Column */}
                    <Col lg={4} md={6}>
                        <div className="footer-brand">
                            <h2 className="footer-brand-title">Sao Kim Lighting</h2>
                            <p className="footer-intro">
                                Chúng tôi cam kết mang đến giải pháp chiếu sáng tối ưu, nâng tầm không gian sống và làm việc của bạn với công nghệ hiện đại và thiết kế đẳng cấp.
                            </p>
                        </div>
                    </Col>

                    {/* Quick Links */}
                    <Col lg={2} md={6}>
                        <h4 className="footer-heading">Liên Kết</h4>
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
                                <Link to="/projects">
                                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                                    Dự án
                                </Link>
                            </li>
                            <li>
                                <Link to="/contact">
                                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                                    Liên hệ
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    {/* Policy */}
                    <Col lg={3} md={6}>
                        <h4 className="footer-heading">Chính Sách</h4>
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
                                    Chính sách vận chuyển
                                </Link>
                            </li>
                            <li>
                                <Link to="/policy/privacy">
                                    <FontAwesomeIcon icon={faChevronRight} className="me-2 text-warning" size="xs" />
                                    Bảo mật thông tin
                                </Link>
                            </li>
                        </ul>
                    </Col>

                    {/* Contact */}
                    <Col lg={3} md={6}>
                        <h4 className="footer-heading">Liên Hệ</h4>
                        <ul className="contact-list">
                            <li>
                                <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-icon" />
                                <span>Số 123, Đường ABC, Quận XYZ, TP. Hồ Chí Minh</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faPhoneAlt} className="contact-icon" />
                                <span>0918 113 559</span>
                            </li>
                            <li>
                                <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                                <span>contact@saokim.vn</span>
                            </li>
                        </ul>
                    </Col>
                </Row>
            </Container>

            {/* Copyright */}
            <div className="footer-copyright">
                <Container>
                    <Row>
                        <Col className="text-center">
                            <p className="mb-0">
                                &copy; {new Date().getFullYear()} Sao Kim Lighting. All rights reserved.
                            </p>
                        </Col>
                    </Row>
                </Container>
            </div>
        </footer>
    );
};

export default EcommerceFooter;
