// src/components/ProductSelector.jsx
import React, { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../api/products";

function ProductSelector({ value, onSelect }) {
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await ProductsAPI.list();
        // BE: { items: [...], page, pageSize, total, totalPages }
        const list = res?.data?.items ?? [];
        if (mounted) setAll(Array.isArray(list) ? list : []);
      } catch (e) {
        console.error(e);
        if (mounted) setAll([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
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
          border: "1px solid rgba(148,163,184,.2)",
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
                <th style={{ width: 140 }}>Mã</th>
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

      {value ? (
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: "rgba(59,130,246,.06)",
            border: "1px solid rgba(59,130,246,.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{value.name}</div>
            <div style={{ fontSize: 12, color: "#475569" }}>
              Mã: {value.sku || "-"} • Giá:{" "}
              {Number(value.price || 0).toLocaleString("vi-VN")} VND
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onSelect?.(null)}
            style={{ color: "#dc2626" }}
          >
            Bỏ chọn
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ProductSelector;
