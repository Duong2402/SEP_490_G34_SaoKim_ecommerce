// src/components/AddEditPromotionModal.jsx
import React, { useEffect, useState } from "react";
import { PromotionsAPI } from "../api/promotions";
import Portal from "./Portal";

const defaultForm = {
  name: "",
  description: "",
  discountType: "Percentage",
  discountValue: "",
  startDate: "",
  endDate: "",
  status: "Draft",
};

export default function AddEditPromotionModal({ promotion, onClose, onSaved }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (promotion?.id) {
        const res = await PromotionsAPI.detail(promotion.id, false);
        const data = res?.data?.data ?? res?.data ?? promotion;
        setForm({
          name: data.name ?? "",
          description: data.description ?? "",
          discountType: data.discountType ?? "Percentage",
          discountValue: data.discountValue ?? "",
          startDate: data.startDate ? new Date(data.startDate).toISOString().slice(0, 16) : "",
          endDate: data.endDate ? new Date(data.endDate).toISOString().slice(0, 16) : "",
          status: data.status ?? "Draft",
        });
      } else {
        setForm(defaultForm);
      }
    })();
  }, [promotion]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        status: form.status,
        productIds: null,
      };

      if (promotion?.id) await PromotionsAPI.update(promotion.id, payload);
      else await PromotionsAPI.create(payload);

      await onSaved?.();
    } catch (err) {
      console.error(err);
      alert("Lưu promotion thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div onClick={onClose} style={backdrop}>
        <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={modal(760)}>
          <form onSubmit={handleSubmit}>
            <div style={header}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{promotion?.id ? "Cập nhật promotion" : "Tạo promotion"}</h2>
              <button type="button" onClick={onClose} aria-label="Đóng" style={closeBtn}>×</button>
            </div>

            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div>
                <label style={label}>Tên promotion</label>
                <input className="input" name="name" value={form.name} onChange={handleChange} required />
              </div>
              <div>
                <label style={label}>Mô tả</label>
                <textarea className="input" name="description" rows={3} value={form.description} onChange={handleChange} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label}>Loại giảm</label>
                  <select className="input" name="discountType" value={form.discountType} onChange={handleChange}>
                    <option value="Percentage">Percentage</option>
                    <option value="FixedAmount">FixedAmount</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Mức giảm</label>
                  <input className="input" name="discountValue" type="number" min="0" step="1"
                        value={form.discountValue} onChange={handleChange} required />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={label}>Bắt đầu</label>
                  <input className="input" type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange} required />
                </div>
                <div>
                  <label style={label}>Kết thúc</label>
                  <input className="input" type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange} required />
                </div>
              </div>

              <div>
                <label style={label}>Trạng thái</label>
                <select className="input" name="status" value={form.status} onChange={handleChange}>
                  <option value="Draft">Draft</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>

            <div style={footer}>
              <button type="button" className="btn" onClick={onClose} disabled={saving}>Huỷ</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : (promotion?.id ? "Cập nhật" : "Tạo")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 };
const modal = (w) => ({ background: "#fff", width: w, maxWidth: "95vw", borderRadius: 12, border: "1px solid rgba(148,163,184,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.2)" });
const header = { padding: "14px 16px", borderBottom: "1px solid rgba(148,163,184,.15)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const footer = { padding: "12px 16px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(148,163,184,.15)" };
const label = { display: "block", marginBottom: 6 };
const closeBtn = { background: "transparent", border: 0, fontSize: 22, cursor: "pointer" };
