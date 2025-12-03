import React, { useEffect, useMemo, useState } from "react";
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

const Field = ({ label, name, error, required, children }) => (
  <div className="field-group">
    <label className="field-label" htmlFor={name}>
      {label}
      {required && <span className="text-danger"> *</span>}
    </label>
    {children}
    {error && <p className="field-error">{error}</p>}
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

  // Load roles
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

  // Set initial values
  useEffect(() => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        email: initialValues.email || "",
        password: "",
        roleId: initialValues.roleId?.toString() || "",
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
  }, [initialValues]);

  // Validation
  const errors = useMemo(() => {
    const issues = {};
    if (!form.name.trim()) issues.name = "Name is required";

    if (!form.email.trim()) {
      issues.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      issues.email = "Invalid email format";
    }

    if (!isEdit && !form.password.trim()) {
      issues.password = "Password is required";
    } else if (form.password && form.password.length < 8) {
      issues.password = "Password must be at least 8 characters";
    }

    if (!form.roleId) issues.roleId = "Role is required";

    return issues;
  }, [form, isEdit]);

  // Handle input
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

  // Reset
  const handleReset = () => {
    if (initialValues) {
      setForm({
        name: initialValues.name || "",
        email: initialValues.email || "",
        password: "",
        roleId: initialValues.roleId?.toString() || "",
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

  // Submit
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.roleId || isNaN(parseInt(form.roleId))) {
      alert("Role is required!");
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
    submitLabel || (isEdit ? "Update User" : "Create User");

  return (
    <form onSubmit={handleSubmit} className="form-grid">

      <Field label="Name" name="name" error={errors.name} required>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input"
          disabled={submitting}
          placeholder="Enter full name"
        />
      </Field>

      <Field label="Email" name="email" error={errors.email} required>
        <input
          id="email"
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          className="input"
          disabled={submitting}
          placeholder="Enter email"
        />
      </Field>

      <Field
        label="Password"
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
          className="input"
          disabled={submitting}
          placeholder={
            isEdit
              ? "Leave blank to keep current password"
              : "Enter password (min 8 characters)"
          }
        />
      </Field>

      <div className="form-grid double">
        {/* ROLE */}
        <Field label="Role" name="roleId" error={errors.roleId} required>
          <select
            id="roleId"
            name="roleId"
            value={form.roleId}
            onChange={handleChange}
            className="select"
            disabled={submitting || loadingRoles}
          >
            <option value="">Select a role</option>
            {roles.map((role, idx) => (
              <option
                key={role.roleId || role.id || idx}
                value={role.roleId || role.id}
              >
                {role.name}
              </option>
            ))}
          </select>
        </Field>

        {/* STATUS READONLY */}
        <Field label="Status" name="status">
          <input
            id="status"
            name="status"
            value={form.status}
            className="input"
            readOnly
          />
        </Field>
      </div>

      <Field label="Phone Number" name="phoneNumber">
        <input
          id="phoneNumber"
          name="phoneNumber"
          value={form.phoneNumber}
          onChange={handleChange}
          className="input"
          disabled={submitting}
        />
      </Field>

      <Field label="Address" name="address">
        <input
          id="address"
          name="address"
          value={form.address}
          onChange={handleChange}
          className="input"
          disabled={submitting}
        />
      </Field>

      <Field label="Date of Birth" name="dob">
        <input
          id="dob"
          name="dob"
          type="date"
          value={form.dob}
          onChange={handleChange}
          className="input"
          disabled={submitting}
        />
      </Field>

      <Field label="Profile Image" name="image">
        <div>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="input"
            disabled={submitting}
          />
          {imagePreview && (
            <div style={{ marginTop: "8px" }}>
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  objectFit: "cover",
                  borderRadius: "4px",
                  border: "1px solid #ddd",
                }}
              />
            </div>
          )}
        </div>
      </Field>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleReset}
          disabled={submitting}
        >
          Reset
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || Object.keys(errors).length > 0}
        >
          {submitting ? "Saving..." : resolvedSubmitLabel}
        </button>
      </div>

    </form>
  );
}
