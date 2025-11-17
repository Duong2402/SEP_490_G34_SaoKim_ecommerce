// src/components/PromotionProductsModal.jsx
import React, { useEffect, useState } from "react";
import { PromotionsAPI } from "../api/promotions";
import ProductSelector from "./ProductSelector";

export default function PromotionProductsModal({ promotionId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await PromotionsAPI.detail(promotionId, true);
      const data = res?.data?.data ?? res?.data ?? null;
      setDetail(data);
    } catch (e) {
      console.error(e);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [promotionId]);

  const addProduct = async () => {
    if (!picked?.id) return;
    setAdding(true);
    try {
      await PromotionsAPI.addProduct(promotionId, { productId: picked.id, note: null });
      setPicked(null);
      await load();
    } catch (e) {
      console.error(e);
      alert("Thêm sản phẩm thất bại");
    } finally {
      setAdding(false);
    }
  };

  const removeProduct = async (promotionProductId) => {
    if (!window.confirm("Gỡ sản phẩm khỏi promotion?")) return;
    try {
      await PromotionsAPI.removeProduct(promotionProductId);
      await load();
    } catch (e) {
      console.error(e);
      alert("Gỡ sản phẩm thất bại");
    }
  };

  return (
    <div onClick={onClose} style={backdrop}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={modal(980)}>
        <div style={header}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Products in Promotion</h2>
          <button type="button" onClick={onClose} aria-label="Đóng" style={closeBtn}>×</button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          {/* chooser */}
          <div>
            <label style={{ display: "block", marginBottom: 6 }}>Thêm sản phẩm</label>
            <ProductSelector value={picked} onSelect={setPicked} />
            <div style={{ marginTop: 8 }}>
              <button className="btn btn-primary" onClick={addProduct} disabled={!picked || adding}>
                {adding ? "Đang thêm..." : "Thêm vào promotion"}
              </button>
            </div>
          </div>

          <div style={{ borderTop: "1px solid #eee", marginTop: 8 }} />

          {/* current list */}
          {loading ? (
            <div style={{ color: "#64748b" }}>Đang tải...</div>
          ) : !detail ? (
            <div style={{ color: "#dc2626" }}>Không tải được dữ liệu.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ padding: 10 }}>#</th>
                    <th style={{ padding: 10 }}>Product</th>
                    <th style={{ padding: 10 }}>Code</th>
                    <th style={{ padding: 10, width: 120 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {detail.products?.length ? (
                    detail.products.map((pp, i) => (
                      <tr key={pp.id}>
                        <td style={{ padding: 10 }}>{i + 1}</td>
                        <td style={{ padding: 10 }}>{pp.productName}</td>
                        <td style={{ padding: 10 }}>{pp.productCode}</td>
                        <td style={{ padding: 10, textAlign: "right" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => removeProduct(pp.id)} style={{ color: "#dc2626" }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: 12, color: "#64748b" }}>Chưa có sản phẩm nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={footer}>
          <button type="button" className="btn" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const modal = (w) => ({ background: "#fff", width: w, maxWidth: "96vw", borderRadius: 12, border: "1px solid rgba(148,163,184,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.2)" });
const header = { padding: "14px 16px", borderBottom: "1px solid rgba(148,163,184,.15)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const footer = { padding: "12px 16px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(148,163,184,.15)" };
const closeBtn = { background: "transparent", border: 0, fontSize: 22, cursor: "pointer" };
