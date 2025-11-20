import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../styles/account.css";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    address: "",
    dob: "",
    image: null,
  });

  const apiBase = "https://localhost:7278";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }
    const load = async () => {
      try {
        const res = await fetch(`${apiBase}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Không thể tải thông tin tài khoản");
        const data = await res.json();
        setForm({
          name: data.name || "",
          email: data.email || "",
          phoneNumber: data.phoneNumber || "",
          address: data.address || "",
          dob: data.dob ? new Date(data.dob).toISOString().slice(0, 10) : "",
          image: null,
        });
        setPreviewUrl(data.image ? `${apiBase}${data.image}` : null);
      } catch (e) {
        setError(e.message || "Đã xảy ra lỗi");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      if (form.name) fd.append("name", form.name);
      if (form.phoneNumber) fd.append("phoneNumber", form.phoneNumber);
      if (form.address) fd.append("address", form.address);
      if (form.dob) fd.append("dob", form.dob);
      if (form.image) fd.append("image", form.image);

      const res = await fetch(`${apiBase}/api/users/me`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Cập nhật thất bại");
      }

      setSuccess("Đã cập nhật thông tin thành công");
      const meRes = await fetch(`${apiBase}/api/users/me`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (meRes.ok) {
        const data = await meRes.json();
        setPreviewUrl(data.image ? `${apiBase}${data.image}` : null);
        localStorage.setItem("userName", data.name || "");
        window.dispatchEvent(new Event("localStorageChange"));
      }
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="account-shell">
        <div className="account-card account-card--narrow">Đang tải...</div>
      </div>
    );

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "24px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Cập nhật thông tin tài khoản</h2>
        <div style={{ display: "flex", gap: 16 }}>
          <Link to="/account/addresses">Quản lý địa chỉ</Link>
        </div>
      </div>

      {error && (
        <div className="account-alert account-alert--error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div className="account-alert account-alert--success" style={{ marginBottom: 12 }}>
          {success}
        </div>
      )}

      <form className="account-form" onSubmit={onSubmit}>
        <div
          style={{
            display: "flex",
            gap: 24,
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <p className="account-eyebrow">Tài khoản Sao Kim</p>
            <h1 className="account-title">Thông tin cá nhân</h1>
          </div>
          <Link to="/account/addresses" className="account-link">
            Quản lý địa chỉ
          </Link>
        </div>

        <div className="account-layout">
          <div className="account-avatar">
            <div className="account-avatar__preview">
              {previewUrl ? (
                <img src={previewUrl} alt="Ảnh đại diện" />
              ) : (
                <span style={{ color: "var(--account-muted)" }}>Chưa có ảnh</span>
              )}
            </div>
            <label className="account-upload">
              Chọn ảnh mới
              <input type="file" accept="image/*" onChange={onFile} />
            </label>
            <p style={{ color: "var(--account-muted)", fontSize: 13 }}>
              JPG, PNG dưới 5MB để hiển thị sắc nét.
            </p>
          </div>

          <div className="account-main">
            <div className="account-field">
              <label>Họ và tên</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="Nhập họ tên"
              />
            </div>
            <div className="account-field">
              <label>Email (không thể thay đổi)</label>
              <input name="email" value={form.email} disabled />
            </div>

            <div className="account-grid">
              <div className="account-field">
                <label>Số điện thoại</label>
                <input
                  name="phoneNumber"
                  value={form.phoneNumber}
                  onChange={onChange}
                  placeholder="VD: 0987..."
                />
              </div>
              <div className="account-field">
                <label>Ngày sinh</label>
                <input type="date" name="dob" value={form.dob} onChange={onChange} />
              </div>
            </div>

            <div className="account-field">
              <label>Địa chỉ</label>
              <input
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành"
              />
            </div>
          </div>
        </div>

        <div className="account-actions">
          <button
            type="button"
            className="account-btn account-btn--ghost"
            onClick={() => navigate("/")}
          >
            Về trang chủ
          </button>
          <button
            type="submit"
            className="account-btn account-btn--primary"
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
    </div>
  );
}
