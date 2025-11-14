// src/components/AddEditProjectProductModal.jsx
import React, { useEffect, useState } from "react";
import { ProjectProductAPI } from "../api/ProjectManager/project-products";
import ProductSelector from "./ProductSelector";
import Portal from "./Portal";

function AddEditProjectProductModal({ projectId, product, onClose, onSaved }) {
  const [form, setForm] = useState({
    productId: "",
    quantity: "",
    unitPrice: "",
    note: "",
  });
  const [saving, setSaving] = useState(false);
  const [pickedProduct, setPickedProduct] = useState(null);

  useEffect(() => {
    if (product) {
      setForm({
        productId: product.productId,
        quantity: product.quantity,
        unitPrice: product.unitPrice,
        note: product.note || "",
      });
      setPickedProduct({
        id: product.productId,
        name: product.productName,
        sku: "",
        price: product.unitPrice,
      });
    } else {
      setForm({ productId: "", quantity: "", unitPrice: "", note: "" });
      setPickedProduct(null);
    }
  }, [product]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePick = (p) => {
    setPickedProduct(p);
    if (p) {
      setForm((prev) => ({
        ...prev,
        productId: p.id,
        unitPrice:
          prev.unitPrice === "" || prev.unitPrice == null ? (p.price ?? "") : prev.unitPrice,
      }));
    } else {
      setForm((prev) => ({ ...prev, productId: "", unitPrice: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (product?.id) {
        await ProjectProductAPI.update(projectId, product.id, {
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice ?? 0),
          note: form.note || null,
        });
      } else {
        if (!form.productId) {
          alert("Vui lòng chọn sản phẩm.");
          setSaving(false);
          return;
        }
        await ProjectProductAPI.create(projectId, {
          productId: Number(form.productId),
          quantity: Number(form.quantity),
          unitPrice: form.unitPrice === "" ? undefined : Number(form.unitPrice),
          note: form.note || null,
        });
      }
      await onSaved?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("Lưu sản phẩm thất bại");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999999, // bump để không bị section dưới đè
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pp-modal-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            width: 720,
            maxWidth: "95vw",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,.15)",
            boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          }}
        >
          <form onSubmit={handleSubmit}>
            {/* HEADER */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(148,163,184,.15)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h2 id="pp-modal-title" style={{ margin: 0, fontSize: 18 }}>
                {product ? "Cập nhật sản phẩm" : "Thêm sản phẩm vào dự án"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            {/* BODY */}
            <div style={{ padding: 16, display: "grid", gap: 16 }}>
              {!product && (
                <div>
                  <label style={{ display: "block", marginBottom: 6 }}>Chọn sản phẩm</label>
                  <ProductSelector value={pickedProduct} onSelect={handlePick} />
                  <input type="hidden" name="productId" value={form.productId} readOnly />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label htmlFor="pp-qty" style={{ display: "block", marginBottom: 6 }}>
                    Số lượng
                  </label>
                  <input
                    id="pp-qty"
                    name="quantity"
                    className="input"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="pp-price" style={{ display: "block", marginBottom: 6 }}>
                    Đơn giá (VND)
                  </label>
                  <input
                    id="pp-price"
                    name="unitPrice"
                    className="input"
                    type="number"
                    min="0"
                    step="1"
                    value={form.unitPrice}
                    onChange={handleChange}
                    placeholder="Bỏ trống để dùng giá của sản phẩm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pp-note" style={{ display: "block", marginBottom: 6 }}>
                  Ghi chú
                </label>
                <textarea
                  id="pp-note"
                  name="note"
                  className="input"
                  rows={3}
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Tuỳ chọn"
                />
              </div>
            </div>

            {/* FOOTER */}
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                borderTop: "1px solid rgba(148,163,184,.15)",
              }}
            >
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Huỷ
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : product ? "Cập nhật" : "Thêm"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

export default AddEditProjectProductModal;
