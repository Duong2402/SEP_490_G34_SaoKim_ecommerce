import React, { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/products";
export default function ProductSelector({ value, onSelect }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductsAPI.list({ page: 1, pageSize: 1000 });

        let raw = res?.data?.items;

        if (!Array.isArray(raw)) raw = res?.data?.data?.items;

        if (!Array.isArray(raw)) raw = Array.isArray(res?.data) ? res?.data : [];

        const normalized = (raw || []).map((p) => ({
          id: p.id ?? p.productId ?? p.product_id,
          name: p.name ?? p.productName ?? p.product_name,
          sku: p.sku ?? p.productCode ?? p.product_code,
          price: p.price ?? 0,
          unit: p.unit ?? p.uom ?? p.Unit ?? "",
          _raw: p,
        })).filter(x => x.id != null);

        if (mounted) setAll(normalized);
      } catch (e) {
        console.error(e);
        if (mounted) setAll([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return all;
    const q = query.trim().toLowerCase();
    return all.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      return name.includes(q) || sku.includes(q);
    });
  }, [all, query]);

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>
        <label htmlFor="ps-search" style={{ display: "block", marginBottom: 6 }}>
          Tìm kiếm sản phẩm
        </label>
        <input
          id="ps-search"
          type="search"
          className="input"
          placeholder="Nhập tên hoặc mã (VD: DL-9W)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          maxHeight: 260,
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
                <th style={{ minWidth: 220 }}>Tên sản phẩm</th>
                <th style={{ width: 160 }}>Mã</th>
                <th style={{ width: 120, textAlign: "right" }}>Giá</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td style={{ textAlign: "right" }}>
                    {Number(p.price || 0).toLocaleString("vi-VN")}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => onSelect?.(p)}
                    >
                      Chọn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: 12, color: "#64748b" }}>Không có sản phẩm phù hợp.</div>
        )}
      </div>
    </div>
  );
}
