// src/components/AddEditProjectProductModal.jsx
import React, { useEffect, useState } from "react";
import { ProjectProductAPI } from "../api/ProjectManager/project-products";
import ProductSelector from "./ProductSelector";
import Portal from "./Portal";

const formatVnd = (value) => {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("vi-VN");
};

const parseNumber = (value) => Number(String(value || "").replace(/\D/g, "") || 0);

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
        unitPrice: formatVnd(product.unitPrice),
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
    if (name === "unitPrice") {
      const digits = value.replace(/\D/g, "");
      setForm((prev) => ({ ...prev, [name]: formatVnd(digits) }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePick = (p) => {
    setPickedProduct(p);
    if (p) {
      setForm((prev) => ({
        ...prev,
        productId: p.id,
        unitPrice:
          prev.unitPrice === "" || prev.unitPrice == null ? formatVnd(p.price ?? "") : prev.unitPrice,
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
          unitPrice: parseNumber(form.unitPrice),
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
          unitPrice: form.unitPrice === "" ? undefined : parseNumber(form.unitPrice),
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

  const title = product ? "Cập nhật sản phẩm" : "Thêm sản phẩm vào dự án";
  const submitLabel = saving ? "Đang lưu..." : product ? "Cập nhật" : "Thêm";

  return (
    <Portal>
      <div className="pm-modal" onClick={onClose}>
        <div
          className="pm-modal__dialog pm-modal__dialog--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pp-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit}>
            <div className="pm-modal__header">
              <div>
                <h2 id="pp-modal-title" className="pm-modal__title">
                  {title}
                </h2>
                <p className="pm-modal__subtitle">
                  Chọn sản phẩm, nhập số lượng và đơn giá cho dự án.
                </p>
              </div>
              <button type="button" onClick={onClose} aria-label="Đóng" className="pm-modal__close">
                ×
              </button>
            </div>

            <div className="pm-modal__body pm-modal__section">
              {!product && (
                <div className="pm-field">
                  <span className="pm-field__label">Chọn sản phẩm</span>
                  <ProductSelector value={pickedProduct} onSelect={handlePick} />
                  <input type="hidden" name="productId" value={form.productId} readOnly />
                  <span className="pm-field__hint">Tìm kiếm theo tên hoặc mã SKU.</span>
                </div>
              )}

              <div className="pm-modal__grid">
                <div className="pm-field">
                  <label htmlFor="pp-qty" className="pm-field__label">
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
                  <span className="pm-field__hint">Nhập số lượng giao/thi công.</span>
                </div>

                <div className="pm-field">
                  <label htmlFor="pp-price" className="pm-field__label">
                    Đơn giá (VND)
                  </label>
                  <input
                    id="pp-price"
                    name="unitPrice"
                    className="input"
                    type="text"
                    inputMode="numeric"
                    value={form.unitPrice}
                    onChange={handleChange}
                    placeholder="Bỏ trống để dùng giá sản phẩm"
                    style={{ textAlign: "right" }}
                  />
                  <span className="pm-field__hint">Có thể bỏ trống để lấy giá mặc định.</span>
                </div>
              </div>

              <div className="pm-field">
                <label htmlFor="pp-note" className="pm-field__label">
                  Ghi chú
                </label>
                <textarea
                  id="pp-note"
                  name="note"
                  className="input"
                  rows={3}
                  value={form.note}
                  onChange={handleChange}
                  placeholder="Ghi rõ yêu cầu đóng gói, màu sắc, v.v. (tùy chọn)"
                />
              </div>
            </div>

            <div className="pm-modal__footer">
              <button type="button" className="btn" onClick={onClose} disabled={saving}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {submitLabel}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

export default AddEditProjectProductModal;
