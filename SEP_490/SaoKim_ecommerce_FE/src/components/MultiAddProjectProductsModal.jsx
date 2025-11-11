// src/components/MultiAddProjectProductsModal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/products";
import { ProjectProductAPI } from "../api/ProjectManager/project-products";

function MultiAddProjectProductsModal({ projectId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");

  // selections: Map<productId, {quantity, unitPrice}>
  const [sel, setSel] = useState({}); // { [id]: { quantity, unitPrice } }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductsAPI.list();
        const list = res?.data?.items ?? [];
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
    return all.filter((p) => (p.name || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s));
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
      filtered.forEach((p) => {
        next[p.id] = next[p.id] ?? { quantity: 1, unitPrice: p.price ?? 0 };
      });
      return next;
    });
  };

  const uncheckAllFiltered = () => {
    setSel((prev) => {
      const next = { ...prev };
      filtered.forEach((p) => {
        if (next[p.id]) delete next[p.id];
      });
      return next;
    });
  };

  const setQty = (id, val) => {
    setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), quantity: val } }));
  };
  const setPrice = (id, val) => {
    setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), unitPrice: val } }));
  };

  const selectedCount = Object.keys(sel).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCount) {
      alert("Hãy chọn ít nhất 1 sản phẩm.");
      return;
    }

    const payloads = Object.entries(sel)
      .map(([productId, v]) => ({
        productId: Number(productId),
        quantity: Number(v.quantity || 0),
        unitPrice: v.unitPrice === "" || v.unitPrice === null ? undefined : Number(v.unitPrice),
      }))
      .filter((x) => x.quantity > 0);

    if (!payloads.length) {
      alert("Số lượng phải lớn hơn 0.");
      return;
    }

    setSaving(true);
    try {
      const results = await Promise.allSettled(
        payloads.map((pl) => ProjectProductAPI.create(projectId, pl)),
      );

      const ok = results.filter((r) => r.status === "fulfilled").length;
      const fail = results.length - ok;

      if (fail === 0) {
        await onSaved();
        onClose();
      } else {
        await onSaved(); // vẫn refresh danh sách khi có phần thành công
        alert(`Thêm xong: ${ok} thành công, ${fail} thất bại (có thể do trùng sản phẩm trong dự án).`);
      }
    } catch (err) {
      console.error(err);
      alert("Có lỗi xảy ra khi thêm hàng loạt.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="multi-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: 960,
          maxWidth: "96vw",
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

          {/* BODY */}
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="search"
                className="input"
                placeholder="Tìm theo tên hoặc mã (VD: DL-9W)"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-outline" onClick={checkAllFiltered}>
                Chọn tất cả kết quả
              </button>
              <button type="button" className="btn btn-ghost" onClick={uncheckAllFiltered}>
                Bỏ chọn kết quả
              </button>
            </div>

            <div
              style={{
                border: "1px solid rgba(148,163,184,.2)",
                borderRadius: 8,
                maxHeight: 420,
                overflow: "auto",
                background: "#fff",
              }}
            >
              {loading ? (
                <div style={{ padding: 12, color: "#64748b" }}>Đang tải sản phẩm...</div>
              ) : filtered.length ? (
                <table className="table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 44 }}></th>
                      <th style={{ minWidth: 220 }}>Tên sản phẩm</th>
                      <th style={{ width: 140 }}>Mã</th>
                      <th style={{ width: 120, textAlign: "right" }}>Giá</th>
                      <th style={{ width: 130, textAlign: "right" }}>Số lượng</th>
                      <th style={{ width: 140, textAlign: "right" }}>Đơn giá (VND)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const checked = !!sel[p.id];
                      return (
                        <tr key={p.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleOne(p)}
                            />
                          </td>
                          <td>{p.name}</td>
                          <td>{p.sku}</td>
                          <td style={{ textAlign: "right" }}>
                            {Number(p.price || 0).toLocaleString("vi-VN")}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              className="input"
                              style={{ width: 110, textAlign: "right" }}
                              disabled={!checked}
                              value={sel[p.id]?.quantity ?? ""}
                              onChange={(e) => setQty(p.id, e.target.value)}
                            />
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              className="input"
                              style={{ width: 120, textAlign: "right" }}
                              disabled={!checked}
                              value={sel[p.id]?.unitPrice ?? ""}
                              onChange={(e) => setPrice(p.id, e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: 12, color: "#64748b" }}>Không có sản phẩm phù hợp.</div>
              )}
            </div>

            <div style={{ color: "#475569", fontSize: 13 }}>
              Đã chọn: <strong>{selectedCount}</strong> sản phẩm
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
              {saving ? "Đang thêm..." : "Thêm tất cả"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default MultiAddProjectProductsModal;
