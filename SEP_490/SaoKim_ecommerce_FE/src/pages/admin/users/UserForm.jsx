import React, { useEffect, useMemo, useState } from "react";
import { FaSave, FaUndo } from "react-icons/fa";
import { UserAPI } from "../../../api/users";

const DEFAULT_FORM_VALUES = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  phoneNumber: "",
  address: "",
  dob: "",
  status: "Active",
  image: null,
};

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return "";
};

const getRoleLabel = (role) => {
  const roleMap = {
    admin: "Quản trị viên",
    manager: "Quản lý",
    staff: "Nhân viên",
    warehouse_manager: "Quản lý kho",
    project_manager: "Quản lý dự án",
    customer: "Khách hàng",
  };
  return roleMap[role] || role || "";
};

const Field = ({ label, name, error, required, children }) => (
  <div className="admin-form__field">
    <label className="admin-form__label" htmlFor={name}>
      {label}
      {required && <span className="admin-form__required"> *</span>}
    </label>
    {children}
    {error && <p className="admin-form__error">{error}</p>}
  </div>
);

export default function UserForm({
  initialValues,
  onSubmit,
  submitting = false,
  submitLabel,
  isEdit = false,
}) {
  const [form, setForm] = useState(DEFAULT_FORM_VALUES);
  const [roles, setRoles] = useState([]);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await UserAPI.getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to load roles:", err);
        setRoles([]);
      } finally {
        setLoadingRoles(false);
      }
    };
    loadRoles();
  }, []);

  const resolveRoleIdFromInitial = (iv, roleList) => {
    if (!iv) return "";
    let resolved = iv.roleId ?? iv.roleID ?? null;

    if (!resolved && roleList && roleList.length) {
      const roleName =
        iv.roleName || iv.role || iv.role_name || iv.role_name_en || null;

      if (roleName) {
        const found = roleList.find(
          (r) =>
            r.name === roleName ||
            r.code === roleName ||
            r.normalizedName === roleName
        );
        if (found) {
          resolved = found.roleId ?? found.id ?? null;
        }
      }
    }

    return resolved ? resolved.toString() : "";
  };

  useEffect(() => {
    if (initialValues) {
      const resolvedRoleId = resolveRoleIdFromInitial(initialValues, roles);

      setForm({
        name: initialValues.name || "",
        email: initialValues.email || "",
        password: "",
        roleId: resolvedRoleId,
        phoneNumber: initialValues.phoneNumber || "",
        address: initialValues.address || "",
        dob: toInputDate(initialValues.dob),
        status: initialValues.status || "Active",
        image: null,
      });

      if (initialValues.image) {
        if (typeof initialValues.image === "string") {
          setImagePreview(initialValues.image);
        } else if (initialValues.image instanceof File) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result);
          };
          reader.readAsDataURL(initialValues.image);
        }
      } else {
        setImagePreview(null);
      }
    } else {
      setForm(DEFAULT_FORM_VALUES);
      setImagePreview(null);
    }
  }, [initialValues, roles]);

  const errors = useMemo(() => {
    const issues = {};
    if (!form.name.trim()) issues.name = "Vui lòng nhập họ tên";

    if (!form.email.trim()) {
      issues.email = "Vui lòng nhập email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      issues.email = "Email không đúng định dạng";
    }

    if (!isEdit && !form.password.trim()) {
      issues.password = "Vui lòng nhập mật khẩu";
    } else if (form.password && form.password.length < 8) {
      issues.password = "Mật khẩu tối thiểu 8 ký tự";
    }

    if (!form.roleId) issues.roleId = "Vui lòng chọn vai trò";

    return issues;
  }, [form, isEdit]);

  const handleChange = (event) => {
    const { name, value, files } = event.target;

    if (name === "image" && files && files[0]) {
      const file = files[0];
      setForm((prev) => ({ ...prev, [name]: file }));

      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleReset = () => {
    if (initialValues) {
      const resolvedRoleId = resolveRoleIdFromInitial(initialValues, roles);

      setForm({
        name: initialValues.name || "",
        email: initialValues.email || "",
        password: "",
        roleId: resolvedRoleId,
        phoneNumber: initialValues.phoneNumber || "",
        address: initialValues.address || "",
        dob: toInputDate(initialValues.dob),
        status: initialValues.status || "Active",
        image: null,
      });

      if (initialValues.image) {
        setImagePreview(initialValues.image);
      } else {
        setImagePreview(null);
      }
    } else {
      setForm(DEFAULT_FORM_VALUES);
      setImagePreview(null);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.roleId || isNaN(parseInt(form.roleId))) {
      alert("Vui lòng chọn vai trò!");
      return;
    }

    const payload = {
      Name: form.name.trim(),
      Email: form.email.trim(),
      Password: form.password.trim() || undefined,
      RoleId: parseInt(form.roleId),
      PhoneNumber: form.phoneNumber.trim() || undefined,
      Address: form.address.trim() || undefined,
      Dob: form.dob || undefined,
      Status: form.status || "Active",
      Image: form.image || undefined,
    };

    Object.keys(payload).forEach(
      (k) =>
        (payload[k] === undefined ||
          payload[k] === null ||
          payload[k] === "" ||
          (typeof payload[k] === "number" && isNaN(payload[k]))) &&
        delete payload[k]
    );

    onSubmit(payload);
  };

  const resolvedSubmitLabel =
    submitLabel || (isEdit ? "Cập nhật" : "Tạo người dùng");

  const getStatusLabel = (status) => {
    switch (status) {
      case "Active":
        return "Hoạt động";
      case "Inactive":
        return "Không hoạt động";
      case "Suspended":
        return "Bị khóa";
      default:
        return status;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="admin-form">
      <Field label="Họ tên" name="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="admin-form__input"
          disabled={submitting}
          placeholder="Nhập họ và tên đầy đủ"
        />
      </Field>

      <Field label="Email" name="email" error={errors.email} required>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="admin-form__input"
          disabled={submitting}
          placeholder="Nhập địa chỉ email"
        />
      </Field>

      <Field
        label="Mật khẩu"
        name="password"
        error={errors.password}
        required={!isEdit}
      >
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          className="admin-form__input"
          disabled={submitting}
          placeholder={
            isEdit
              ? "Để trống nếu không đổi mật khẩu"
              : "Nhập mật khẩu (tối thiểu 8 ký tự)"
          }
        />
      </Field>

      <div className="admin-form__row">
        <Field label="Vai trò" name="roleId" error={errors.roleId} required>
          <select
            id="roleId"
            name="roleId"
            value={form.roleId}
            onChange={handleChange}
            className="admin-form__select"
            disabled={submitting || loadingRoles}
          >
            <option value="">-- Chọn vai trò --</option>
            {roles.map((role, idx) => (
              <option
                key={role.roleId || role.id || idx}
                value={role.roleId || role.id}
              >
                {getRoleLabel(role.name)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Trạng thái" name="status">
          <input
            id="status"
            name="status"
            value={getStatusLabel(form.status)}
            className="admin-form__input admin-form__input--readonly"
            readOnly
          />
        </Field>
      </div>

      <div className="admin-form__row">
        <Field label="Số điện thoại" name="phoneNumber">
          <input
            id="phoneNumber"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleChange}
            className="admin-form__input"
            disabled={submitting}
            placeholder="Nhập số điện thoại"
          />
        </Field>

        <Field label="Ngày sinh" name="dob">
          <input
            id="dob"
            name="dob"
            type="date"
            value={form.dob}
            onChange={handleChange}
            className="admin-form__input"
            disabled={submitting}
          />
        </Field>
      </div>

      <Field label="Địa chỉ" name="address">
        <input
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          className="admin-form__input"
          disabled={submitting}
          placeholder="Nhập địa chỉ"
        />
      </Field>

      <Field label="Ảnh đại diện" name="image">
        <div className="admin-form__file-wrapper">
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="admin-form__file"
            disabled={submitting}
          />
          {imagePreview && (
            <div className="admin-form__preview">
              <img
                src={imagePreview}
                alt="Xem trước"
                className="admin-form__preview-img"
              />
            </div>
          )}
        </div>
      </Field>

      <div className="admin-form__actions">
        <button
          type="button"
          className="admin-btn admin-btn--outline"
          onClick={handleReset}
          disabled={submitting}
        >
          <FaUndo style={{ marginRight: 8 }} />
          Đặt lại
        </button>

        <button
          type="submit"
          className="admin-btn admin-btn--primary"
          disabled={submitting || Object.keys(errors).length > 0}
        >
          <FaSave style={{ marginRight: 8 }} />
          {submitting ? "Đang lưu..." : resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
