// src/components/AddEditProjectExpenseModal.jsx
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { ProjectExpenseAPI } from "../api/ProjectManager/project-expenses";
import { useLanguage } from "../i18n/LanguageProvider.jsx";

const CATEGORIES = [
  "Procurement", "Logistics/Shipping", "Installation/Labour",
  "Site Delivery", "Warehouse Handling", "Warranty/After-sales",
  "Discount/Rebate", "Misc"
];

export default function AddEditProjectExpenseModal({
  open = false,
  projectId,
  expense,          // null => create, object => edit
  onClose,
  onSaved
}) {
  const isEdit = Boolean(expense?.id);
  const { t } = useLanguage();

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
    return () => { document.body.style.overflow = prev; };
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
    const e = {};
    if (!form.date) e.date = "Vui lòng chọn ngày.";
    const amt = Number(form.amount);
    if (!Number.isFinite(amt) || amt < 0) e.amount = "Số tiền không hợp lệ.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (ev) => {
    const { name, value } = ev.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? value.replace(/[^\d.]/g, "") : value
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
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          background: "#fff", width: 560, maxWidth: "95vw", borderRadius: 12,
          border: "1px solid rgba(148,163,184,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.2)"
        }}
      >
        <form onSubmit={handleSubmit}>
          <div style={{
            padding: "14px 16px", borderBottom: "1px solid rgba(148,163,184,.15)",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>{isEdit ? "Cập nhật chi phí" : "Thêm chi phí"}</h2>
            <button type="button" onClick={onClose}
              aria-label="Đóng" style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }}>
              ×
            </button>
          </div>

          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div>
              <label className="label">Ngày</label>
              <input type="date" name="date" className="input" value={form.date} onChange={handleChange} disabled={saving}/>
              {errors.date ? <p style={{ color: "#b91c1c", fontSize: 12 }}>{errors.date}</p> : null}
            </div>

            <div>
              <label className="label">Nhóm chi phí</label>
              <select name="category" className="input" value={form.category} onChange={handleChange} disabled={saving}>
                <option value="">-- Chọn --</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Nhà cung cấp</label>
              <input name="vendor" className="input" value={form.vendor} onChange={handleChange} disabled={saving}/>
            </div>

            <div>
              <label className="label">Mô tả</label>
              <input name="description" className="input" value={form.description} onChange={handleChange} disabled={saving}/>
            </div>

            <div>
              <label className="label">Số tiền (VND)</label>
              <input name="amount" className="input" inputMode="decimal" value={form.amount} onChange={handleChange} disabled={saving}/>
              {errors.amount ? <p style={{ color: "#b91c1c", fontSize: 12 }}>{errors.amount}</p> : null}
            </div>

            <div>
              <label className="label">Link hóa đơn</label>
              <input name="receiptUrl" className="input" value={form.receiptUrl} onChange={handleChange} disabled={saving}/>
            </div>
          </div>

          <div style={{
            padding: "12px 16px", display: "flex", justifyContent: "flex-end",
            gap: 8, borderTop: "1px solid rgba(148,163,184,.15)"
          }}>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Đang lưu..." : (isEdit ? "Cập nhật" : "Thêm")}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
