import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { Form, Button, InputGroup } from "@themesberg/react-bootstrap";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";
import BgImage from "../../assets/signin.svg";
import "../../assets/css/Auth.css";

const API_BASE = "https://datdovan.id.vn";
const COOLDOWN_SECONDS = 120;

function cooldownKey(email) {
  return `otp:resend:cooldownUntil:${(email || "").trim().toLowerCase()}`;
}

export default function VerifyRegister() {
  const navigate = useNavigate();
  const location = useLocation();

  const qs = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const emailFromQuery = (qs.get("email") || "").trim();

  const [email, setEmail] = useState(emailFromQuery);
  const [code, setCode] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [cooldownLeft, setCooldownLeft] = useState(0);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  // Init cooldown using localStorage (không bị reset khi F5)
  useEffect(() => {
    if (!emailFromQuery) return;

    const key = cooldownKey(emailFromQuery);
    const now = Date.now();

    let until = 0;
    try {
      const saved = localStorage.getItem(key);
      until = saved ? Number(saved) : 0;
    } catch { }

    // Nếu chưa có hoặc dữ liệu lỗi -> set mới now + 120s
    if (!until || Number.isNaN(until) || until <= now) {
      until = now + COOLDOWN_SECONDS * 1000;
      try {
        localStorage.setItem(key, String(until));
      } catch { }
    }

    const left = Math.ceil((until - now) / 1000);
    setCooldownLeft(Math.max(0, left));
  }, [emailFromQuery]);

  // Tick countdown dựa trên cooldownUntil trong localStorage
  useEffect(() => {
    if (!emailFromQuery) return;

    const key = cooldownKey(emailFromQuery);

    const tick = () => {
      const now = Date.now();
      let until = 0;
      try {
        const saved = localStorage.getItem(key);
        until = saved ? Number(saved) : 0;
      } catch { }

      const left = Math.ceil((until - now) / 1000);
      setCooldownLeft(Math.max(0, left));
    };

    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [emailFromQuery]);

  const extractErrorMessage = (res, data) => {
    if (data && typeof data === "object") {
      const msg = data.message ?? data.Message ?? data.error ?? data.title ?? null;
      if (msg) return String(msg);

      if (data.data && typeof data.data === "object") {
        const msg2 =
          data.data.message ?? data.data.Message ?? data.data.error ?? data.data.title ?? null;
        if (msg2) return String(msg2);
      }

      if (data.errors && typeof data.errors === "object") {
        const k = Object.keys(data.errors)[0];
        if (k && Array.isArray(data.errors[k]) && data.errors[k][0]) {
          return String(data.errors[k][0]);
        }
      }

      try {
        return JSON.stringify(data);
      } catch { }
    }

    if (typeof data === "string" && data.trim()) return data.slice(0, 200);
    return res?.status ? `Lỗi ${res.status}` : "Đã xảy ra lỗi";
  };

  const parseJsonSafe = async (res) => {
    let text = "";
    try {
      text = await res.text();
    } catch { }
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return text || null;
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const e = (email || "").trim();
    const c = (code || "").trim();

    if (!e) {
      setError("Thiếu email xác thực. Vui lòng đăng ký lại.");
      return;
    }
    if (!c) {
      setError("Vui lòng nhập mã OTP.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify-register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, code: c }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setError(extractErrorMessage(res, data) || "Xác thực thất bại.");
        return;
      }

      const msg =
        (data && typeof data === "object" && (data.message || data.Message)) ||
        "Xác thực thành công. Bạn có thể đăng nhập.";

      setSuccess(String(msg));
      setTimeout(() => navigate("/login", { replace: true }), 800);
    } catch (err) {
      console.error("Verify error:", err);
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");

    const e = (email || "").trim();
    if (!e) {
      setError("Thiếu email xác thực. Vui lòng đăng ký lại.");
      return;
    }

    if (cooldownLeft > 0) return;

    setResending(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/resend-register-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e }),
      });

      const data = await parseJsonSafe(res);

      if (!res.ok) {
        setError(extractErrorMessage(res, data) || "Gửi lại mã thất bại.");
        return;
      }

      const msg =
        (data && typeof data === "object" && (data.message || data.Message)) ||
        "Đã gửi lại mã OTP.";

      setSuccess(String(msg));

      // Reset cooldownUntil = now + 120s
      const until = Date.now() + COOLDOWN_SECONDS * 1000;
      try {
        localStorage.setItem(cooldownKey(e), String(until));
      } catch { }
      setCooldownLeft(COOLDOWN_SECONDS);
    } catch (err) {
      console.error("Resend error:", err);
      setError("Không thể kết nối tới máy chủ. Vui lòng thử lại sau.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      illustration={BgImage}
      badge="Sao Kim Lighting"
      headline="Xác thực đăng ký"
      subHeadline="Nhập mã OTP đã gửi về email để hoàn tất tạo tài khoản."
      insights={[
        "Mã OTP có hiệu lực trong 5 phút",
        "Nhập sai tối đa 5 lần",
        "Gửi lại mã sau 120 giây",
      ]}
      footerNote="© 2025 Sao Kim Lighting."
      backLink={{ to: "/register", label: "Quay lại đăng ký" }}
    >
      <div className="auth-content__header">
        <h1 className="auth-content__title">Xác thực mã OTP</h1>
        <p className="auth-content__subtitle">
          Vui lòng kiểm tra hộp thư đến hoặc thư rác để lấy mã xác thực.
        </p>
      </div>

      {!emailFromQuery && (
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
            fontWeight: 500,
          }}
        >
          Thiếu email xác thực. Vui lòng quay lại trang đăng ký.
        </div>
      )}

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
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {success !== "" && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginTop: 12,
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            border: "1px solid #198754",
            background: "#d1e7dd",
            color: "#0f5132",
            fontWeight: 500,
          }}
        >
          {success}
        </div>
      )}

      <Form className="auth-form" onSubmit={handleVerify} noValidate>
        <Form.Group controlId="verifyCode">
          <Form.Label>Mã OTP</Form.Label>
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faKey} />
            </InputGroup.Text>
            <Form.Control
              name="code"
              type="text"
              inputMode="numeric"
              placeholder="Nhập mã 6 số"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              maxLength={6}
              required
              disabled={!emailFromQuery}
            />
          </InputGroup>

          <div className="d-flex justify-content-between align-items-center mt-2">
            <small className="text-muted">
              {cooldownLeft > 0 ? `Có thể gửi lại sau ${cooldownLeft}s` : "Bạn có thể gửi lại mã ngay"}
            </small>

            <Button
              type="button"
              variant="link"
              className="p-0"
              onClick={handleResend}
              disabled={resending || cooldownLeft > 0 || !emailFromQuery}
            >
              {resending ? "Đang gửi..." : "Gửi lại mã"}
            </Button>
          </div>

        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          className="auth-submit w-100"
          disabled={submitting || !emailFromQuery}
        >
          {submitting ? "Đang xác thực..." : "Xác thực"}
          {!submitting && <FontAwesomeIcon icon={faArrowRight} className="ms-2" />}
        </Button>

        <Link to="/login" className="btn auth-secondary w-100 mt-2">
          Về trang đăng nhập
        </Link>
      </Form>

      <div className="auth-meta mt-3">
        Bạn đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </div>
    </AuthLayout>
  );
}
