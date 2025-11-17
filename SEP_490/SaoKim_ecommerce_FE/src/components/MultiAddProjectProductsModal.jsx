// src/components/MultiAddProjectProductsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/products";
import { ProjectProductAPI } from "../api/ProjectManager/project-products";
import Portal from "./Portal";

function MultiAddProjectProductsModal({ projectId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");

  const [sel, setSel] = useState({}); // { [id]: { quantity, unitPrice } }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductsAPI.list();
        const payload = res?.data?.data ?? res?.data ?? {};
        const list = payload.items ?? [];
        if (mounted) setAll(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (mounted) setAll([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return all;
    const s = q.trim().toLowerCase();
    return all.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(s) ||
        (p.sku || "").toLowerCase().includes(s)
    );
  }, [all, q]);

  const toggleOne = (p) => {
    setSel((prev) => {
      const next = { ...prev };
      if (next[p.id]) {
        delete next[p.id];
      } else {
        next[p.id] = { quantity: 1, unitPrice: p.price ?? 0 };
      }
      return next;
    });
  };

  const checkAllFiltered = () => {
    setSel((prev) => {
      const next = { ...prev };
      const ids = new Set(Object.keys(next).map((k) => Number(k)));
      const allIds = filtered.map((p) => p.id);
      const allSelected = allIds.every((id) => ids.has(id));
      if (allSelected) {
        allIds.forEach((id) => { if (next[id]) delete next[id]; });
      } else {
        filtered.forEach((p) => {
          next[p.id] = next[p.id] || { quantity: 1, unitPrice: p.price ?? 0 };
        });
      }
      return next;
    });
  };

  const uncheckAllFiltered = () => {
    setSel((prev) => {
      const next = { ...prev };
      filtered.forEach((p) => { if (next[p.id]) delete next[p.id]; });
      return next;
    });
  };

  const setQty = (id, val) => setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), quantity: val } }));
  const setPrice = (id, val) => setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), unitPrice: val } }));
  const selectedCount = Object.keys(sel).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCount) return alert("Hãy chọn ít nhất 1 sản phẩm.");

    const payloads = Object.entries(sel)
      .map(([productId, v]) => ({
        productId: Number(productId),
        quantity: Number(v.quantity || 0),
        unitPrice:
          v.unitPrice === "" || v.unitPrice === null
            ? undefined
            : Number(v.unitPrice),
      }))
      .filter((x) => x.quantity > 0);

    if (!payloads.length) return alert("Số lượng phải lớn hơn 0.");

    setSaving(true);
    try {
      for (const pl of payloads) {
        await ProjectProductAPI.create(projectId, pl);
      }
      setSel({});
      await onSaved?.();
    } catch (err) {
      console.error(err);
      alert("Thêm sản phẩm thất bại.");
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
          zIndex: 999999,
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="multi-modal-title"
          onClick={(e) => e.stopPropagation()}
          style={{
            background: "#fff",
            width: 940,
            maxWidth: "96vw",
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,.15)",
            boxShadow: "0 10px 30px rgba(0,0,0,.2)",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid rgba(148,163,184,.15)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 id="multi-modal-title" style={{ margin: 0, fontSize: 18 }}>
              Thêm nhiều sản phẩm vào dự án
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

          <form onSubmit={handleSubmit}>
            <div style={{ padding: 16, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="search"
                  placeholder="Tìm theo tên hoặc mã (VD: DL-9W)"
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  style={{ flex: "1 1 360px" }}
                />
                <button type="button" className="btn btn-outline" onClick={checkAllFiltered}>
                  Chọn tất cả kết quả
                </button>
                <button type="button" className="btn btn-outline" onClick={uncheckAllFiltered}>
                  Bỏ chọn kết quả
                </button>
                <div style={{ color: "#475569", whiteSpace: "nowrap" }}>
                  Đã chọn: <strong>{selectedCount}</strong>
                </div>
              </div>

              <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
                {loading ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Không có sản phẩm phù hợp.</div>
                ) : (
                  <table className="table" style={{ margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 48 }}></th>
                        <th style={{ minWidth: 240 }}>Tên sản phẩm</th>
                        <th style={{ width: 140 }}>Mã</th>
                        <th style={{ width: 140, textAlign: "right" }}>Giá</th>
                        <th style={{ width: 140, textAlign: "right" }}>Số lượng</th>
                        <th style={{ width: 160, textAlign: "right" }}>Đơn giá (VND)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((p) => {
                        const isChecked = !!sel[p.id];
                        return (
                          <tr key={p.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleOne(p)}
                              />
                            </td>
                            <td>{p.name}</td>
                            <td>{p.sku}</td>
                            <td style={{ textAlign: "right" }}>
                              {Number(p.price || 0).toLocaleString("vi-VN")}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isChecked ? (
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  className="input"
                                  style={{ maxWidth: 120, textAlign: "right" }}
                                  value={sel[p.id]?.quantity ?? 1}
                                  onChange={(e) => setQty(p.id, Number(e.target.value))}
                                />
                              ) : (
                                "-"
                              )}
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {isChecked ? (
                                <input
                                  type="number"
                                  min={0}
                                  step={1000}
                                  className="input"
                                  style={{ maxWidth: 140, textAlign: "right" }}
                                  value={sel[p.id]?.unitPrice ?? p.price ?? 0}
                                  onChange={(e) => setPrice(p.id, Number(e.target.value))}
                                />
                              ) : (
                                "-"
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

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
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || selectedCount === 0}>
                {saving ? "Đang thêm..." : "Thêm tất cả"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

export default MultiAddProjectProductsModal;
