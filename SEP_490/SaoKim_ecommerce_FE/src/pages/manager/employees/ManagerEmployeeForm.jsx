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
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    if (!isEdit && !form.password.trim()) e.password = "Password is required";
    if (!form.roleId) e.roleId = "Role is required";
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

    // PAYLOAD PASCALCASE ĐỂ BIND [FromForm] / DTO C#
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

    // Cả create và edit đều có thể gửi Image,
    // BE có thể bỏ qua nếu không thay đổi
    if (form.image) {
      payload.Image = form.image;
    }

    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      <div className="field-group">
        <label>Name</label>
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.name && <p className="field-error">{errors.name}</p>}
      </div>

      <div className="field-group">
        <label>Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          disabled={submitting}
        />
        {errors.email && <p className="field-error">{errors.email}</p>}
      </div>

      <div className="field-group">
        <label>Password</label>
        <input
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder={isEdit ? "Leave blank to keep current password" : ""}
          disabled={submitting}
        />
        {errors.password && <p className="field-error">{errors.password}</p>}
      </div>

      <div className="field-group">
        <label>Role</label>
        <select
          name="roleId"
          value={form.roleId}
          onChange={handleChange}
          disabled={submitting}
        >
          <option value="">Select role</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        {errors.roleId && <p className="field-error">{errors.roleId}</p>}
      </div>

      <div className="field-group">
        <label>Phone</label>
        <input
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field-group">
        <label>Address</label>
        <input
          name="address"
          value={form.address}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field-group">
        <label>Date of Birth</label>
        <input
          type="date"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="field-group">
        <label>Status</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={submitting}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Suspended">Suspended</option>
        </select>
      </div>

      {/* Cho phép chọn ảnh cả khi edit, BE tự xử lý nếu không đổi */}
      <div className="field-group">
        <label>Profile image</label>
        <input
          type="file"
          name="image"
          accept="image/*"
          onChange={handleChange}
          disabled={submitting}
        />
        {preview && (
          <img
            src={preview}
            alt="Preview"
            style={{
              marginTop: 8,
              maxWidth: 160,
              maxHeight: 160,
              objectFit: "cover",
              borderRadius: 4,
              border: "1px solid #ddd",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || Object.keys(errors).length > 0}
        >
          {submitting ? "Saving..." : isEdit ? "Update Employee" : "Create Employee"}
        </button>
      </div>
    </form>
  );
}
