import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUnlockAlt,
  faEye,
  faEyeSlash,
  faArrowRight,
} from "@fortawesome/free-solid-svg-icons";
import { Form, Button, InputGroup, Alert } from "@themesberg/react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function ResetPassword() {
  const navigate = useNavigate();
  const { code } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("https://localhost:7278/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
        return;
      }

      setSuccess("Đã đổi mật khẩu thành công!");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Bảo mật Sao Kim"
      headline="Đặt lại lớp bảo vệ tài khoản mua sắm"
      subHeadline="Tạo mật khẩu mới để bảo vệ thông tin thanh toán và những ưu đãi dành riêng cho bạn."
      insights={[
        "Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt",
        "Không chia sẻ mật khẩu cho bất kỳ ai",
        "Đổi mật khẩu định kỳ để tăng cường bảo mật",
      ]}
      footerNote="Niềm tin của khách hàng là ánh sáng dẫn đường cho Sao Kim Lighting."
      backLink={{ to: "/", label: "Quay lại trang chủ" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Đặt lại mật khẩu</h1>
        <p className="auth-content__subtitle">
          Nhập và xác nhận mật khẩu mới cho tài khoản Sao Kim của bạn.
        </p>
      </div>

      {error && <div className="alert alert-danger text-center">{error}</div>}
      {success && <div className="alert alert-success text-center">{success}</div>}

      <Form className="auth-form" onSubmit={submit}>
        <Form.Group controlId="resetEmail">
          <Form.Label>Email</Form.Label>
          <InputGroup>
            <InputGroup.Text>@</InputGroup.Text>
            <Form.Control
              type="email"
              placeholder="Nhập email đã đăng ký"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </InputGroup>
        </Form.Group>

        <Form.Group controlId="resetNewPassword">
          <Form.Label>Mật khẩu mới</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control
              type={showPassword ? "text" : "password"}
              placeholder="Nhập mật khẩu mới"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
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

        <Form.Group controlId="resetConfirmPassword">
          <Form.Label>Xác nhận mật khẩu mới</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faUnlockAlt} />
            </InputGroup.Text>
            <Form.Control
              type={showConfirm ? "text" : "password"}
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
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
          disabled={loading}
        >
          {loading ? "Đang cập nhật..." : "Lưu mật khẩu mới"}
          {!loading && <FontAwesomeIcon icon={faArrowRight} />}
        </Button>

        <Link to="/" className="btn auth-secondary w-100">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta">
        Cần hỗ trợ thêm?
        <Link to="/forgot-password">Gửi lại email xác nhận</Link>
      </div>
    </AuthLayout>
  );
}
