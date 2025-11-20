import React, { useEffect, useMemo, useState } from "react";
import { ManagerEmployeeAPI } from "../../../api/manager-employees";

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
};

export default function ManagerEmployeeForm({
  initialValues,
  onSubmit,
  submitting = false,
  isEdit = false,
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roleId: "",
    phoneNumber: "",
    address: "",
    dob: "",
    status: "Active",
    image: null,
  });
  const [roles, setRoles] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await ManagerEmployeeAPI.getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load roles:", err);
        setRoles([]);
      }
    };
    loadRoles();
  }, []);

  useEffect(() => {
    if (!initialValues) return;

    setForm((prev) => ({
      ...prev,
      name: initialValues.name || "",
      email: initialValues.email || "",
      password: "",
      roleId: initialValues.roleId ? String(initialValues.roleId) : "",
      phoneNumber: initialValues.phone || initialValues.phoneNumber || "",
      address: initialValues.address || "",
      dob: toInputDate(initialValues.dob),
      status: initialValues.status || "Active",
      image: null,
    }));

    if (initialValues.image) {
      const raw = initialValues.image;
      const base = import.meta.env?.VITE_API_BASE_URL || "";
      const url =
        raw.startsWith("http") || raw.startsWith("/")
          ? raw.startsWith("http")
            ? raw
            : `${base}${raw}`
          : `${base}/${raw}`;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [initialValues]);

  const errors = useMemo(() => {
    const e = {};
    if (!form.name.trim()) e.name = "Họ tên bắt buộc";
    if (!form.email.trim()) e.email = "Email bắt buộc";
    if (!isEdit && !form.password.trim()) e.password = "Vui lòng nhập mật khẩu";
    if (!form.roleId) e.roleId = "Hãy chọn vai trò";
    return e;
  }, [form, isEdit]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files[0]) {
      const file = files[0];
      setForm((f) => ({ ...f, image: file }));
      setPreview(URL.createObjectURL(file));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    const payload = {
      Name: form.name.trim(),
      Email: form.email.trim(),
      RoleId: parseInt(form.roleId, 10),
      PhoneNumber: form.phoneNumber.trim() || null,
      Address: form.address.trim() || null,
      Dob: form.dob || null,
      Status: form.status || "Active",
    };

    if (form.password.trim()) {
      payload.Password = form.password.trim();
    }
    if (form.image) {
      payload.Image = form.image;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="manager-form">
      <div className="manager-form__field">
        <label>Họ tên *</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="manager-form__field">
        <label>Email *</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="manager-form__field">
        <label>Mật khẩu {isEdit ? "(bỏ trống nếu không đổi)" : "*"}</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder={isEdit ? "Để trống nếu giữ nguyên mật khẩu" : ""}
          disabled={submitting}
          className="manager-form__control"
        />
        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <div className="manager-form__field">
        <label>Vai trò *</label>
        <select
          name="roleId"
          value={form.roleId}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        >
          <option value="">Chọn vai trò</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.roleId && <p className="field-error">{errors.roleId}</p>}
      </div>

      <div className="manager-form__field">
        <label>Điện thoại</label>
        <input
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Địa chỉ</label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Ngày sinh</label>
        <input
          type="date"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Trạng thái</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        >
          <option value="Active">Đang làm việc</option>
          <option value="Inactive">Tạm ngưng</option>
          <option value="Suspended">Đình chỉ</option>
        </select>
      </div>

      <div className="manager-form__field">
        <label>Ảnh đại diện</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
          disabled={submitting}
          className="manager-form__control"
        />
        {preview && (
          <img
            src={preview}
            alt="Xem trước"
            style={{
              marginTop: 8,
              maxWidth: 160,
              maxHeight: 160,
              objectFit: "cover",
              borderRadius: 8,
              border: "1px solid var(--manager-border)",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>

      <div className="manager-form__actions">
        <button
          type="submit"
          className="manager-btn manager-btn--primary"
          disabled={submitting || Object.keys(errors).length > 0}
        >
          {submitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Tạo mới"}
        </button>
      </div>
    </form>
  );
}
