import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faUnlockAlt,
  faEye,
  faEyeSlash,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { Form, Button, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("https://localhost:7278/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể đăng nhập. Vui lòng thử lại.");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("userEmail", data.email);
      localStorage.setItem("role", data.role);

      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Sao Kim Lighting"
      headline="Kiến tạo trải nghiệm mua sắm ánh sáng đẳng cấp"
      subHeadline="Từ giải pháp chiếu sáng khách sạn đến nhà hàng cao cấp, Sao Kim đồng hành cùng bạn với sản phẩm và dịch vụ chuyên biệt."
      insights={[
        "50+ đối tác thương hiệu chiếu sáng hàng đầu thế giới",
        "200+ dự án resort, khách sạn, retail",
        "Hỗ trợ 24/7 với đội ngũ kỹ sư chăm sóc tận nơi",
      ]}
      footerNote="© 2025 Sao Kim Lighting. Thắp sáng từng ngôi nhà Việt."
      backLink={{ to: "/", label: "Quay lại trang chủ" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Đăng nhập</h1>
        <p className="auth-content__subtitle">
          Truy cập tài khoản Sao Kim để theo dõi đơn hàng, ưu đãi thành viên và lịch sử thanh toán của bạn.
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="auth-alert">
          {error}
        </Alert>
      )}

      <Form className="auth-form" onSubmit={handleSubmit}>
        <Form.Group controlId="loginEmail">
          <Form.Label>Email</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faEnvelope} />
            </InputGroup.Text>
            <Form.Control
              name="email"
              type="email"
              placeholder="example@saokim.vn"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
              required
            />
          </InputGroup>
        </Form.Group>

        <Form.Group controlId="loginPassword">
          <Form.Label>Mật khẩu</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu"
              value={form.password}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />
            <Button
              type="button"
              variant="link"
              className="auth-form__toggle"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
            </Button>
          </InputGroup>
        </Form.Group>

        <div className="auth-form__options">
          <Form.Check id="rememberMe" type="checkbox" label="Ghi nhớ đăng nhập" />
          <Link to="/forgot-password">Quên mật khẩu?</Link>
        </div>

        <Button
          variant="primary"
          type="submit"
          className="auth-submit w-100"
          disabled={submitting}
        >
          {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          {!submitting && <FontAwesomeIcon icon={faArrowRight} />}
        </Button>

        <Link to="/" className="btn auth-secondary w-100">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta">
        Chưa có tài khoản?
        <Link to="/register">Đăng ký ngay</Link>
      </div>

      <div className="auth-footer-note">
        Bằng việc tiếp tục, bạn đồng ý với <Link to="/terms">điều khoản</Link> và <Link to="/privacy">chính sách bảo mật</Link> của chúng tôi.
      </div>
    </AuthLayout>
  );
}
