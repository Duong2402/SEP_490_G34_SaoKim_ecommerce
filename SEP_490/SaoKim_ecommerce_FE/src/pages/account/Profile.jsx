import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

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

      setSuccess("Cập nhật thông tin thành công");
      // Refresh data
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

  if (loading) return <div style={{ padding: 24 }}>Đang tải...</div>;

  return (
    <div style={{ maxWidth: 720, margin: "24px auto", padding: 24, background: "#fff", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ marginBottom: 16 }}>Cập nhật thông tin tài khoản</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/account/addresses">Quản lý địa chỉ</Link>
        </div>
      </div>
      {error && <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ color: "#0a7e07", marginBottom: 12 }}>{success}</div>}
      <form onSubmit={onSubmit}>
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "#f3f3f3",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #e5e5e5",
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ color: "#999" }}>No avatar</span>
              )}
            </div>
            <label style={{ display: "block", marginTop: 8 }}>
              Ảnh đại diện
              <input type="file" accept="image/*" onChange={onFile} style={{ display: "block", marginTop: 6 }} />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: "block", marginBottom: 10 }}>
              Họ và tên
              <input name="name" value={form.name} onChange={onChange} placeholder="Nhập họ tên"
                     style={{ width: "100%", display: "block", marginTop: 6, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6 }} />
            </label>
            <label style={{ display: "block", marginBottom: 10 }}>
              Email (không thể đổi)
              <input name="email" value={form.email} disabled
                     style={{ width: "100%", display: "block", marginTop: 6, padding: "10px 12px", border: "1px solid #eee", background: "#fafafa", borderRadius: 6 }} />
            </label>
            <div style={{ display: "flex", gap: 12 }}>
              <label style={{ flex: 1, display: "block", marginBottom: 10 }}>
                Số điện thoại
                <input name="phoneNumber" value={form.phoneNumber} onChange={onChange} placeholder="VD: 0987..."
                       style={{ width: "100%", display: "block", marginTop: 6, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6 }} />
              </label>
              <label style={{ width: 200, display: "block", marginBottom: 10 }}>
                Ngày sinh
                <input type="date" name="dob" value={form.dob} onChange={onChange}
                       style={{ width: "100%", display: "block", marginTop: 6, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6 }} />
              </label>
            </div>
            <label style={{ display: "block", marginBottom: 10 }}>
              Địa chỉ
              <input name="address" value={form.address} onChange={onChange} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                     style={{ width: "100%", display: "block", marginTop: 6, padding: "10px 12px", border: "1px solid #ddd", borderRadius: 6 }} />
            </label>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button type="submit" disabled={saving}
                  style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 6 }}>
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
          <button type="button" onClick={() => navigate("/")}
                  style={{ padding: "10px 16px", background: "#f3f4f6", color: "#111", border: 0, borderRadius: 6 }}>
            Quay lại
          </button>
        </div>
      </form>
    </div>
  );
}


