import React, { useEffect, useMemo, useState } from "react";
import { PROJECT_STATUSES, getStatusLabel, formatNumber } from "./projectHelpers";

const DEFAULT_FORM_VALUES = {
  code: "",
  name: "",
  customerName: "",
  customerContact: "",
  status: PROJECT_STATUSES[0].value,
  startDate: "",
  endDate: "",
  budget: "",
  description: "",
};

const toInputDate = (value) => (value ? value.slice(0, 10) : "");

const parseBudgetInput = (value) => {
  if (!value) return null;
  const digits = String(value).replace(/\D/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isNaN(parsed) ? null : parsed;
};

const Field = ({ label, name, error, children }) => (
  <div className="field-group">
    <label className="field-label" htmlFor={name}>
      {label}
    </label>
    {children}
    {error && <p className="field-error">{error}</p>}
  </div>
);

export default function ProjectForm({
  initialValues,
  onSubmit,
  submitting = false,
  submitLabel,
  showCode = true,
}) {
  const initialState = useMemo(() => {
    const base = { ...DEFAULT_FORM_VALUES };
    if (initialValues) {
      base.code = initialValues.code ?? "";
      base.name = initialValues.name ?? "";
      base.customerName = initialValues.customerName ?? "";
      base.customerContact = initialValues.customerContact ?? "";
      base.status = initialValues.status ?? PROJECT_STATUSES[0].value;
      base.startDate = toInputDate(initialValues.startDate);
      base.endDate = toInputDate(initialValues.endDate);
      base.budget =
        initialValues.budget === null || initialValues.budget === undefined
          ? ""
          : formatNumber(Number(String(initialValues.budget).replace(/\D/g, "")));
      base.description = initialValues.description ?? "";
    }
    return base;
  }, [initialValues, formatNumber]);

  const [form, setForm] = useState(initialState);

  useEffect(() => {
    setForm(initialState);
  }, [initialState]);

  const errors = useMemo(() => {
    const issues = {};
    if (!form.name.trim()) {
      issues.name = "Vui lòng nhập tên dự án.";
    }

    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);
      if (end < start) {
        issues.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
      }
    }

    if (!initialValues && form.startDate) {
      const start = new Date(form.startDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (start < today) {
        issues.startDate = "Ngày bắt đầu không thể trong quá khứ.";
      }
    }

    if (form.budget && parseBudgetInput(form.budget) === null) {
      issues.budget = "Giá trị dự án chỉ gồm số.";
    }

    return issues;
  }, [form, initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "budget") {
      const digits = value.replace(/\D/g, "");
      setForm((prev) => ({
        ...prev,
        [name]: digits ? formatNumber(Number(digits)) : "",
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleReset = () => {
    setForm(initialState);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (Object.keys(errors).length) return;

    const payload = {
      code: showCode ? form.code.trim() || null : undefined,
      name: form.name.trim(),
      customerName: form.customerName.trim() || null,
      customerContact: form.customerContact.trim() || null,
      status: form.status || PROJECT_STATUSES[0].value,
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      budget: form.budget ? parseBudgetInput(form.budget) : null,
      description: form.description.trim() || null,
    };

    onSubmit(payload);
  };

  const resolvedSubmitLabel = submitLabel || (showCode ? "Tạo dự án" : "Lưu thay đổi");

  return (
    <form onSubmit={handleSubmit} className="form-grid">
      {showCode && (
        <Field label="Mã dự án" name="code">
          <input
            id="code"
            name="code"
            value={form.code}
            onChange={handleChange}
            className="input"
            placeholder="PRJ-2025-001"
            disabled={submitting}
          />
        </Field>
      )}

      <Field label="Tên dự án *" name="name" error={errors.name}>
        <input
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="input"
          placeholder="Lập đề xuất ánh sáng cho công ty ABC"
          disabled={submitting}
        />
      </Field>

      <div className="form-grid double">
        <Field label="Khách hàng" name="customerName">
          <input
            id="customerName"
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            className="input"
            placeholder="Công ty Acme"
            disabled={submitting}
          />
        </Field>
        <Field label="Liên hệ khách hàng" name="customerContact">
          <input
            id="customerContact"
            name="customerContact"
            value={form.customerContact}
            onChange={handleChange}
            className="input"
            placeholder="contact@acme.co"
            disabled={submitting}
          />
        </Field>
      </div>

      <div className="form-grid double">
        <Field label="Trạng thái" name="status">
          <select
            id="status"
            name="status"
            value={form.status}
            onChange={handleChange}
            className="select"
            disabled={submitting}
          >
            {PROJECT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {getStatusLabel(status.value)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Giá trị dự án (VND)" name="budget" error={errors.budget}>
          <input
            id="budget"
            name="budget"
            value={form.budget}
            onChange={handleChange}
            className="input"
            placeholder="120.000.000"
            inputMode="numeric"
            disabled={submitting}
          />
        </Field>
      </div>

      <div className="form-grid double">
        <Field label="Ngày bắt đầu" name="startDate" error={errors.startDate}>
          <input
            id="startDate"
            name="startDate"
            type="date"
            value={form.startDate}
            onChange={handleChange}
            className="input"
            disabled={submitting}
          />
        </Field>

        <Field label="Ngày kết thúc" name="endDate" error={errors.endDate}>
          <input
            id="endDate"
            name="endDate"
            type="date"
            value={form.endDate}
            onChange={handleChange}
            className="input"
            disabled={submitting}
          />
        </Field>
      </div>

      <Field label="Mô tả chi tiết" name="description">
        <textarea
          id="description"
          name="description"
          rows={4}
          value={form.description}
          onChange={handleChange}
          className="textarea"
          placeholder="Hạng mục chính, tiêu chí thành công và phạm vi công việc."
          disabled={submitting}
        />
      </Field>

      <div className="form-actions">
        <button
          type="button"
          className="btn btn-outline"
          onClick={handleReset}
          disabled={submitting}
        >
          Đặt lại
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={submitting || Object.keys(errors).length > 0}
        >
          {submitting ? "Đang lưu..." : resolvedSubmitLabel}
        </button>
      </div>
    </form>
  );
}
