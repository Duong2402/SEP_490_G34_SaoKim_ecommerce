import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/account.css";

export default function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword.length < 8) {
      setError("Mật khẩu mới phải có ít nhất 8 ký tự.");
      return;
    }
    if (form.newPassword !== form.confirmNewPassword) {
      setError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("https://localhost:7278/api/Auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: form.email,
          currentPassword: form.currentPassword,
          newPassword: form.newPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Đổi mật khẩu thất bại.");
        return;
      }

      setSuccess("Đổi mật khẩu thành công. Vui lòng đăng nhập lại.");
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError("Máy chủ gặp sự cố, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="account-shell">
      <div className="account-card account-card--narrow">
        <div className="account-header">
          <div>
            <p className="account-eyebrow">Bảo mật</p>
            <h1 className="account-title">Đổi mật khẩu</h1>
          </div>
          <Link to="/" className="account-link">
            Về trang chủ
          </Link>
        </div>

        {error && <div className="account-alert account-alert--error">{error}</div>}
        {success && <div className="account-alert account-alert--success">{success}</div>}

        <form className="account-form" onSubmit={handleSubmit}>
          <div className="account-field">
            <label>Email của bạn</label>
            <input
              name="email"
              type="email"
              required
              placeholder="manager@saokim.vn"
              value={form.email}
              onChange={handleChange}
            />
          </div>
          <div className="account-field">
            <label>Mật khẩu hiện tại</label>
            <input
              name="currentPassword"
              type="password"
              required
              placeholder="Nhập mật khẩu hiện tại"
              value={form.currentPassword}
              onChange={handleChange}
            />
          </div>
          <div className="account-field">
            <label>Mật khẩu mới</label>
            <input
              name="newPassword"
              type="password"
              required
              placeholder="Ít nhất 8 ký tự"
              value={form.newPassword}
              onChange={handleChange}
            />
          </div>
          <div className="account-field">
            <label>Xác nhận mật khẩu mới</label>
            <input
              name="confirmNewPassword"
              type="password"
              required
              placeholder="Nhập lại mật khẩu mới"
              value={form.confirmNewPassword}
              onChange={handleChange}
            />
          </div>

          <div className="account-actions">
            <Link to="/login" className="account-btn account-btn--ghost" style={{ textAlign: "center", textDecoration: "none" }}>
              Quay lại đăng nhập
            </Link>
            <button type="submit" className="account-btn account-btn--primary" disabled={loading}>
              {loading ? "Đang xử lý..." : "Xác nhận đổi mật khẩu"}
            </button>
          </div>

          <div style={{ fontSize: 14, color: "var(--account-muted)" }}>
            Cần hỗ trợ thêm?{" "}
            <Link to="/contact" style={{ color: "var(--account-blue)" }}>
              Liên hệ chúng tôi
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
