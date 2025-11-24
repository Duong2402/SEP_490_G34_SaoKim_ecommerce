import React, { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/products";
import { ProjectProductAPI } from "../api/ProjectManager/project-products";
import Portal from "./Portal";

function MultiAddProjectProductsModal({ projectId, existingProductIds = [], onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [q, setQ] = useState("");

  const [sel, setSel] = useState({}); // { [id]: { quantity, unitPrice } }
  const [saving, setSaving] = useState(false);

  const existingSet = useMemo(
    () => new Set((existingProductIds || []).map((id) => Number(id))),
    [existingProductIds],
  );

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
      (p) => (p.name || "").toLowerCase().includes(s) || (p.sku || "").toLowerCase().includes(s),
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
        allIds.forEach((id) => {
          if (next[id]) delete next[id];
        });
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
      filtered.forEach((p) => {
        if (next[p.id]) delete next[p.id];
      });
      return next;
    });
  };

  const setQty = (id, val) =>
    setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), quantity: val } }));
  const setPrice = (id, val) =>
    setSel((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), unitPrice: val } }));
  const selectedCount = Object.keys(sel).length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCount) return alert("Hãy chọn ít nhất 1 sản phẩm.");

    const payloads = Object.entries(sel)
      .map(([productId, v]) => ({
        productId: Number(productId),
        quantity: Number(v.quantity || 0),
        unitPrice: v.unitPrice === "" || v.unitPrice === null ? undefined : Number(v.unitPrice),
      }))
      .filter((x) => x.quantity > 0);

    if (!payloads.length) return alert("Số lượng phải lớn hơn 0.");

    const dedupedPayloads = payloads.filter((p) => !existingSet.has(p.productId));
    if (!dedupedPayloads.length) {
      alert("Tất cả sản phẩm đã có trong dự án. Vui lòng chỉnh sửa trực tiếp trong danh sách.");
      return;
    }

    setSaving(true);
    const skipped = [];
    const failed = [];

    try {
      for (const pl of dedupedPayloads) {
        try {
          await ProjectProductAPI.create(projectId, pl);
        } catch (err) {
          const status = err?.response?.status;
          if (status === 409) {
            skipped.push(pl.productId);
            continue;
          }
          failed.push(pl.productId);
        }
      }

      setSel({});
      await onSaved?.();

      if (skipped.length || failed.length) {
        const toName = (id) => all.find((p) => p.id === id)?.name || `#${id}`;
        const skippedNames = skipped.map(toName).join(", ");
        const failedNames = failed.map(toName).join(", ");
        const messages = [];
        if (skipped.length) messages.push(`Bỏ qua vì đã tồn tại: ${skippedNames}`);
        if (failed.length) messages.push(`Lỗi khi thêm: ${failedNames}`);
        alert(messages.join("\n"));
      } else {
        onClose?.();
      }
    } catch (err) {
      console.error(err);
      alert("Thêm sản phẩm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="pm-modal" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="multi-modal-title"
          className="pm-modal__dialog"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="pm-modal__header">
            <div>
              <h2 id="multi-modal-title" className="pm-modal__title">
                Thêm nhiều sản phẩm vào dự án
              </h2>
              <p className="pm-modal__subtitle">
                Chọn nhanh nhiều sản phẩm, chỉnh số lượng và đơn giá trước khi thêm.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="pm-modal__close">
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="pm-modal__body">
              <div className="pm-modal__section" style={{ borderRadius: 12 }}>
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
                    Chọn tất cả
                  </button>
                  <button type="button" className="btn btn-outline" onClick={uncheckAllFiltered}>
                    Bỏ chọn
                  </button>
                  <div style={{ color: "#475569", whiteSpace: "nowrap" }}>
                    Đã chọn: <strong>{selectedCount}</strong>
                  </div>
                </div>
              </div>

              <div className="pm-modal__section" style={{ padding: 0 }}>
                {loading ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Đang tải...</div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: 12, color: "#64748b" }}>Không có sản phẩm phù hợp.</div>
                ) : (
                  <div className="table-responsive">
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
                                <input type="checkbox" checked={isChecked} onChange={() => toggleOne(p)} />
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
                  </div>
                )}
              </div>
            </div>

            <div className="pm-modal__footer">
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
