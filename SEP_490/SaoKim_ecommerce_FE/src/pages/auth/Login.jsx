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

  const extractErrorMessage = (res, data) => {
    if (data && typeof data === "object") {
      const msg = data.message ?? data.Message ?? data.error ?? data.title ?? null;
      if (msg) return String(msg);

      if (data.errors && typeof data.errors === "object") {
        const k = Object.keys(data.errors)[0];
        if (k && Array.isArray(data.errors[k]) && data.errors[k][0]) {
          return String(data.errors[k][0]);
        }
      }
      try { return JSON.stringify(data); } catch { }
    }

    if (typeof data === "string" && data.trim()) {
      return data.slice(0, 200);
    }

    return res?.status ? `Lỗi ${res.status}` : "Đã xảy ra lỗi";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await fetch("https://localhost:7278/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });

      let text = "";
      try { text = await res.text(); } catch { }
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch { data = null; }

      if (!res.ok) {
        const msg = extractErrorMessage(res, data ?? text) || "Sai email hoặc mật khẩu.";
        console.warn("LOGIN FAILED:", res.status, data ?? text, "=>", msg);
        setError(msg);
        return;
      }

      const token = (data?.token ?? data?.Token) || "";
      const email = data?.email ?? data?.Email ?? "";
      const role = data?.role ?? data?.Role ?? "";
      if (!token) {
        setError("Phản hồi không hợp lệ từ máy chủ.");
        return;
      }

      localStorage.setItem("token", token);
      if (email) localStorage.setItem("userEmail", email);
      if (role) localStorage.setItem("role", role);
      const roleNorm = String(role || "").trim().toLowerCase();
      let to = "/";

      if (roleNorm === "warehouse_manager") {
        to = "/warehouse-dashboard";
      } else if (roleNorm === "admin" || roleNorm === "administrator") {
        to = "/admin";
      } else if (roleNorm === "customer") {
        to = "/";
      } else if (roleNorm === "manager") {
        to = "/manager";
      } else if (roleNorm === "project_manager") {
        to = "/projects";
      } else if (roleNorm === "staff") {
        to = "/staff/manager-dashboard";
      }

      navigate(to, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
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

      {error !== "" && (
        <div
          role="alert"
          aria-live="assertive"
          style={{
            marginTop: 12,
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #dc3545",
            background: "#ffe5e7",
            color: "#842029",
            fontWeight: 500
          }}
        >
          {error}
        </div>
      )}

      <Form className="auth-form" onSubmit={handleSubmit} noValidate>
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
          {!submitting && <FontAwesomeIcon icon={faArrowRight} className="ms-2" />}
        </Button>

        <Link to="/" className="btn auth-secondary w-100 mt-2">
          Về trang chủ
        </Link>
      </Form>

      <div className="auth-meta mt-3">
        Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
      </div>

      <div className="auth-footer-note">
        Bằng việc tiếp tục, bạn đồng ý với{" "}
        <Link to="/terms">điều khoản</Link> và{" "}
        <Link to="/privacy">chính sách bảo mật</Link> của chúng tôi.
      </div>
    </AuthLayout>
  );
}
