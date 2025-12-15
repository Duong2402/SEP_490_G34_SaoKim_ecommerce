import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { ProjectExpenseAPI } from "../api/ProjectManager/project-expenses";

const CATEGORIES = [
  "Mua hàng",
  "Vận chuyển / Kho bãi",
  "Lắp đặt / Nhân công",
  "Giao tại công trình",
  "Xử lý kho",
  "Bảo hành / Hậu mãi",
  "Chiết khấu / Hoàn",
  "Khác",
];

export default function AddEditProjectExpenseModal({
  open = false,
  projectId,
  expense,
  onClose,
  onSaved,
}) {
  const isEdit = Boolean(expense?.id);

  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: dayjs().format("YYYY-MM-DD"),
    category: "",
    vendor: "",
    description: "",
    amount: "",
    receiptUrl: "",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (expense) {
      setForm({
        date: dayjs(expense.date).isValid()
          ? dayjs(expense.date).format("YYYY-MM-DD")
          : dayjs().format("YYYY-MM-DD"),
        category: expense.category || "",
        vendor: expense.vendor || "",
        description: expense.description || "",
        amount: String(expense.amount ?? ""),
        receiptUrl: expense.receiptUrl || "",
      });
    } else {
      setForm({
        date: dayjs().format("YYYY-MM-DD"),
        category: "",
        vendor: "",
        description: "",
        amount: "",
        receiptUrl: "",
      });
    }
    setErrors({});
  }, [expense, open]);

  const validate = () => {
    const issue = {};
    if (!form.date) issue.date = "Vui lòng chọn ngày.";
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt < 0) issue.amount = "Số tiền không hợp lệ.";
    setErrors(issue);
    return Object.keys(issue).length === 0;
  };

  const handleChange = (ev) => {
    const { name, value } = ev.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? value.replace(/[^\d.]/g, "") : value,
    }));
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const payload = {
      date: dayjs(form.date).toISOString(),
      category: form.category || null,
      vendor: form.vendor || null,
      description: form.description || null,
      amount: Number(form.amount || 0),
      receiptUrl: form.receiptUrl || null,
    };
    try {
      setSaving(true);
      if (isEdit) {
        await ProjectExpenseAPI.update(projectId, expense.id, payload);
      } else {
        await ProjectExpenseAPI.create(projectId, payload);
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Lưu chi phí thất bại.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="pm-modal" onClick={onClose}>
      <div
        className="pm-modal__dialog pm-modal__dialog--medium"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={handleSubmit}>
          <div className="pm-modal__header">
            <div>
              <h2 className="pm-modal__title">{isEdit ? "Cập nhật chi phí" : "Thêm chi phí"}</h2>
              <p className="pm-modal__subtitle">
                Ghi nhận chi phí thực tế, nhóm chi phí và chứng từ liên quan.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="pm-modal__close">
              ×
            </button>
          </div>

          <div className="pm-modal__body pm-modal__grid">
            <div className="pm-field">
              <label className="pm-field__label">Ngày</label>
              <input
                type="date"
                name="date"
                className="input"
                value={form.date}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.date ? <p style={{ color: "#b91c1c", fontSize: 12 }}>{errors.date}</p> : null}
            </div>

            <div className="pm-field">
              <label className="pm-field__label">Nhóm chi phí</label>
              <select
                name="category"
                className="input"
                value={form.category}
                onChange={handleChange}
                disabled={saving}
              >
                <option value="">-- Chọn --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="pm-field">
              <label className="pm-field__label">Nhà cung cấp</label>
              <input
                name="vendor"
                className="input"
                value={form.vendor}
                onChange={handleChange}
                disabled={saving}
              />
            </div>

            <div className="pm-field">
              <label className="pm-field__label">Mô tả</label>
              <input
                name="description"
                className="input"
                value={form.description}
                onChange={handleChange}
                disabled={saving}
              />
              <span className="pm-field__hint">Ví dụ: Phí vận chuyển, chi phí nhân công, v.v.</span>
            </div>

            <div className="pm-field">
              <label className="pm-field__label">Số tiền (VND)</label>
              <input
                name="amount"
                className="input"
                inputMode="decimal"
                value={form.amount}
                onChange={handleChange}
                disabled={saving}
              />
              {errors.amount ? (
                <p style={{ color: "#b91c1c", fontSize: 12 }}>{errors.amount}</p>
              ) : null}
            </div>

            <div className="pm-field">
              <label className="pm-field__label">Link hóa đơn</label>
              <input
                name="receiptUrl"
                className="input"
                value={form.receiptUrl}
                onChange={handleChange}
                disabled={saving}
              />
              <span className="pm-field__hint">URL đến hóa đơn/biên nhận (tùy chọn).</span>
            </div>
          </div>

          <div className="pm-modal__footer">
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
