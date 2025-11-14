// src/components/MultiAddPromotionProductsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { PromotionsAPI } from "../api/promotions";
import { ProductsAPI } from "../api/products";
import Portal from "./Portal";

export default function MultiAddPromotionProductsModal({ promotionId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());

  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const dres = await PromotionsAPI.detail(promotionId, true);
      const ddata = dres?.data?.data ?? dres?.data ?? null;
      setDetail(ddata);

      const pres = await ProductsAPI.list({ page: 1, pageSize: 9999 });
      const payload = pres?.data?.data ?? pres?.data ?? {};
      const raw = Array.isArray(payload.items) ? payload.items : [];

      const norm = raw.map((p) => ({
        id: p.id ?? p.productId ?? p.product_id,
        name: p.name ?? p.productName ?? p.product_name,
        sku: p.sku ?? p.productCode ?? p.product_code,
        price: p.price ?? 0,
      })).filter(x => x.id != null);

      setAll(norm);
    } catch (e) {
      console.error(e);
      setAll([]);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [promotionId]);

  const existingIds = useMemo(() => new Set((detail?.products ?? []).map(p => p.productId)), [detail]);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter(p => !existingIds.has(p.id))
      .filter(p => !q ? true : (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)));
  }, [all, query, existingIds]);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => {
      if (prev.size === list.length) return new Set();
      return new Set(list.map(x => x.id));
    });
  };

  const addSelected = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const ids = Array.from(selected);
      await Promise.allSettled(
        ids.map((pid) => PromotionsAPI.addProduct(promotionId, { productId: pid, note: null }))
      );
      setSelected(new Set());
      await load();
    } catch (e) {
      console.error(e);
      alert("Thêm sản phẩm thất bại");
    } finally {
      setSaving(false);
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
    <Portal>
      <div onClick={onClose} style={backdrop}>
        <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} style={modal(1024)}>
          <div style={header}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Products in Promotion</h2>
            <button type="button" onClick={onClose} aria-label="Đóng" style={closeBtn}>×</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, padding: 16 }}>
            {/* PICKER */}
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <input
                  type="search"
                  className="input"
                  placeholder="Tìm theo tên hoặc mã (VD: DL-9W)"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{ flex: "1 1 320px" }}
                />
                <div style={{ whiteSpace: "nowrap", color: "#475569" }}>
                  Đã chọn: <strong>{selected.size}</strong>
                </div>
                <button type="button" className="btn btn-outline" onClick={toggleAll}>
                  {selected.size === list.length && list.length > 0 ? "Bỏ chọn hết" : "Chọn tất cả"}
                </button>
                <button type="button" className="btn btn-primary" onClick={addSelected} disabled={saving || selected.size === 0}>
                  {saving ? "Đang thêm..." : "Thêm vào promotion"}
                </button>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                {loading ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Đang tải...</div>
                ) : list.length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Không có sản phẩm phù hợp.</div>
                ) : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 44 }}></th>
                        <th style={{ minWidth: 240 }}>Tên sản phẩm</th>
                        <th style={{ width: 160 }}>Mã</th>
                        <th style={{ width: 140, textAlign: "right" }}>Giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map((p) => (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={() => toggle(p.id)}
                            />
                          </td>
                          <td>{p.name}</td>
                          <td>{p.sku}</td>
                          <td style={{ textAlign: "right" }}>{Number(p.price || 0).toLocaleString("vi-VN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div style={{ borderTop: "1px solid #e5e7eb" }} />

            {/* CURRENT PRODUCTS */}
            <div>
              <div style={{ marginBottom: 8, fontWeight: 600 }}>Đang có trong promotion</div>
              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                {!detail ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Đang tải...</div>
                ) : (detail.products?.length ?? 0) === 0 ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Chưa có sản phẩm nào.</div>
                ) : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 60 }}>#</th>
                        <th>Sản phẩm</th>
                        <th style={{ width: 160 }}>Mã</th>
                        <th style={{ width: 120 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.products.map((pp, i) => (
                        <tr key={pp.id}>
                          <td>{i + 1}</td>
                          <td>{pp.productName}</td>
                          <td>{pp.productCode}</td>
                          <td style={{ textAlign: "right" }}>
                            <button className="btn btn-ghost btn-sm" style={{ color: "#dc2626" }}
                              onClick={() => removeProduct(pp.id)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <div style={footer}>
            <button type="button" className="btn" onClick={onClose}>Đóng</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const backdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999999 };
const modal = (w) => ({ background: "#fff", width: w, maxWidth: "96vw", borderRadius: 12, border: "1px solid rgba(148,163,184,.15)", boxShadow: "0 10px 30px rgba(0,0,0,.2)" });
const header = { padding: "14px 16px", borderBottom: "1px solid rgba(148,163,184,.15)", display: "flex", justifyContent: "space-between", alignItems: "center" };
const footer = { padding: "12px 16px", display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(148,163,184,.15)" };
const closeBtn = { background: "transparent", border: 0, fontSize: 22, cursor: "pointer" };
