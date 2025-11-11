import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Addresses() {
  const navigate = useNavigate();
  const apiBase = "https://localhost:7278";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form state (create/update)
  const [editing, setEditing] = useState(null); // null=create, number=id for edit
  const [form, setForm] = useState({
    recipientName: "",
    phoneNumber: "",
    line1: "",
    line2: "",
    ward: "",
    district: "",
    province: "",
    isDefault: false,
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${apiBase}/api/addresses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không tải được danh sách địa chỉ");
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAll();
  }, [navigate]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      recipientName: "",
      phoneNumber: "",
      line1: "",
      line2: "",
      ward: "",
      district: "",
      province: "",
      isDefault: false,
    });
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const method = editing ? "PUT" : "POST";
      const url = editing ? `${apiBase}/api/addresses/${editing}` : `${apiBase}/api/addresses`;
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(editing ? "Cập nhật thất bại" : "Thêm mới thất bại");
      await fetchAll();
      resetForm();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const setDefault = async (id) => {
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}/default`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Không đặt mặc định được");
      await fetchAll();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Xóa địa chỉ này?")) return;
    try {
      const res = await fetch(`${apiBase}/api/addresses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Xóa thất bại");
      await fetchAll();
    } catch (e) {
      setError(e.message || "Đã xảy ra lỗi");
    }
  };

  const startEdit = (a) => {
    setEditing(a.addressId);
    setForm({
      recipientName: a.recipientName || "",
      phoneNumber: a.phoneNumber || "",
      line1: a.line1 || "",
      line2: a.line2 || "",
      ward: a.ward || "",
      district: a.district || "",
      province: a.province || "",
      isDefault: a.isDefault || false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div style={{ maxWidth: 960, margin: "24px auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Quản lý địa chỉ</h2>
        <Link to="/account" style={{ textDecoration: "none" }}>&larr; Về thông tin tài khoản</Link>
      </div>

      {error && (
        <div style={{ color: "#b00020", marginBottom: 12 }}>{error}</div>
      )}

      {/* Form tạo/sửa */}
      <form onSubmit={submitForm} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0 }}>{editing ? "Sửa địa chỉ" : "Thêm địa chỉ mới"}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label>
            Người nhận
            <input value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} required />
          </label>
          <label>
            Số điện thoại
            <input value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Địa chỉ (dòng 1)
            <input value={form.line1} onChange={(e) => setForm({ ...form, line1: e.target.value })} required />
          </label>
          <label style={{ gridColumn: "1 / -1" }}>
            Địa chỉ (dòng 2 - tuỳ chọn)
            <input value={form.line2} onChange={(e) => setForm({ ...form, line2: e.target.value })} />
          </label>
          <label>
            Phường/Xã
            <input value={form.ward} onChange={(e) => setForm({ ...form, ward: e.target.value })} />
          </label>
          <label>
            Quận/Huyện
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
          </label>
          <label>
            Tỉnh/Thành
            <input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
            Đặt làm địa chỉ mặc định
          </label>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">{editing ? "Lưu thay đổi" : "Thêm địa chỉ"}</button>
          {editing && (
            <button type="button" className="btn" onClick={resetForm}>Hủy</button>
          )}
        </div>
      </form>

      {/* Danh sách địa chỉ */}
      {loading ? (
        <div>Đang tải...</div>
      ) : items.length === 0 ? (
        <div>Chưa có địa chỉ nào.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {items.map((a) => (
            <div key={a.addressId} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 600 }}>
                  {a.recipientName} • {a.phoneNumber} {a.isDefault && <span style={{ color: "#2563eb" }}>(Mặc định)</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!a.isDefault && (
                    <button className="btn btn-outline" onClick={() => setDefault(a.addressId)}>Đặt mặc định</button>
                  )}
                  <button className="btn btn-outline" onClick={() => startEdit(a)}>Sửa</button>
                  <button className="btn btn-danger" onClick={() => remove(a.addressId)}>Xóa</button>
                </div>
              </div>
              <div style={{ color: "#667" }}>
                {[a.line1, a.line2, a.ward, a.district, a.province].filter(Boolean).join(", ")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



