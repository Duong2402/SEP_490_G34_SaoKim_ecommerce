import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
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

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("https://localhost:7278/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.fullName,
          email: form.email,
          password: form.password,
          role: "customer",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể tạo tài khoản. Vui lòng thử lại.");
        return;
      }

      setSuccess("Đăng ký thành công! Đang chuyển hướng tới trang đăng nhập...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error("Register error:", err);
      setError("Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Sao Kim"
      headline="Gia nhập cộng đồng yêu ánh sáng Sao Kim"
      subHeadline="Tạo tài khoản để tích lũy điểm thưởng, theo dõi lịch sử đơn hàng và nhận ưu đãi dành riêng cho bạn."
      insights={[
        "Ưu đãi độc quyền cho hội viên Sao Kim",
        "Lưu danh sách đèn yêu thích trong tích tắc",
        "Nhận thông báo giao hàng và bảo hành tức thì",
      ]}
      footerNote="Sao Kim Lighting – nguồn sáng chuẩn châu Âu cho mọi không gian sống."
      backLink={{ to: "/", label: "Quay lại trang chủ" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Tạo tài khoản</h1>
        <p className="auth-content__subtitle">
          Hoàn thiện thông tin để bắt đầu hành trình mua sắm ánh sáng đẳng cấp cùng Sao Kim.
        </p>
      </div>

      {error && (
        <Alert variant="danger" className="auth-alert">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="auth-alert">
          {success}
        </Alert>
      )}

      <Form className="auth-form" onSubmit={handleSubmit}>
        <Form.Group controlId="registerFullName">
          <Form.Label>Họ và tên</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUser} />
            </InputGroup.Text>
            <Form.Control
              name="fullName"
              type="text"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={handleChange}
              autoComplete="name"
              required
            />
          </InputGroup>
        </Form.Group>

        <Form.Group controlId="registerEmail">
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

        <Form.Group controlId="registerPassword">
          <Form.Label>Mật khẩu</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Tối thiểu 8 ký tự"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
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

        <Form.Group controlId="registerConfirmPassword">
          <Form.Label>Xác nhận mật khẩu</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              value={form.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              required
            />
            <Button
              type="button"
              variant="link"
              className="auth-form__toggle"
              onClick={() => setShowConfirm((prev) => !prev)}
            >
              <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
            </Button>
          </InputGroup>
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          className="auth-submit w-100"
          disabled={submitting}
        >
          {submitting ? "Đang xử lý..." : "Tạo tài khoản"}
          {!submitting && <FontAwesomeIcon icon={faArrowRight} />}
        </Button>

        <Link to="/" className="btn auth-secondary w-100">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta">
        Đã có tài khoản?
        <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </AuthLayout>
  );
}
