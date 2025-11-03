import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEnvelope,
  faPaperPlane,
  faClockRotateLeft,
} from "@fortawesome/free-solid-svg-icons";
import { Form, Button, InputGroup } from "@themesberg/react-bootstrap";
import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    // ✅ Kiểm tra thủ công thay vì để HTML báo lỗi
    if (!email) {
      setError("Vui lòng nhập email đã đăng ký!");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Định dạng email không hợp lệ!");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("https://localhost:7278/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Không thể gửi yêu cầu. Vui lòng thử lại.");
        return;
      }

      setSuccess(
        data.message || "Chúng tôi đã gửi mã xác thực đến email của bạn."
      );
      setCooldown(60);
    } catch (err) {
      console.error("Forgot password error:", err);
      setError("Máy chủ gặp sự cố. Vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = () => {
    if (loading) return "Đang gửi...";
    if (cooldown > 0) return `Vui lòng chờ (${cooldown}s)`;
    return "Gửi mã khôi phục";
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Hỗ trợ Sao Kim"
      headline="Quên mật khẩu? Đừng lo lắng"
      subHeadline="Khôi phục tài khoản mua sắm để tiếp tục đặt hàng và nhận ưu đãi chiếu sáng dành riêng cho bạn."
      insights={[
        "Bảo vệ điểm thưởng và lịch sử mua sắm",
        "Mã xác thực gửi trong vòng 60 giây",
        "Chăm sóc khách hàng tận tâm 24/7",
      ]}
      footerNote="Sao Kim Lighting luôn đặt trải nghiệm của bạn lên hàng đầu."
      backLink={{ to: "/", label: "Quay lại trang chủ" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Quên mật khẩu</h1>
        <p className="auth-content__subtitle">
          Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu và bảo vệ tài khoản Sao Kim của bạn.
        </p>
      </div>

      {/* ✅ Hiển thị lỗi / thành công tùy theo state */}
      {error && <div className="alert alert-danger text-center">{error}</div>}
      {success && <div className="alert alert-success text-center">{success}</div>}

      {/* ✅ Tắt validation mặc định bằng noValidate */}
      <Form className="auth-form" noValidate onSubmit={submit}>
        <Form.Group controlId="forgotPasswordEmail">
          <Form.Label>Email đã đăng ký</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faEnvelope} />
            </InputGroup.Text>
            <Form.Control
              type="email"
              placeholder="example@saokim.vn"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </InputGroup>
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          className="auth-submit w-100 mt-3"
          disabled={loading || cooldown > 0}
        >
          <FontAwesomeIcon
            icon={cooldown > 0 ? faClockRotateLeft : faPaperPlane}
            className="me-2"
          />
          {buttonLabel()}
        </Button>

        <Link to="/" className="btn auth-secondary w-100 mt-2">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta">
        Nhớ mật khẩu rồi? <Link to="/login">Đăng nhập ngay</Link>
      </div>
    </AuthLayout>
  );
}
