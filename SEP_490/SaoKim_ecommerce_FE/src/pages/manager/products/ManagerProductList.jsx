// src/pages/manager/products/ManagerProductList.jsx
import { useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../../../api/products";

export default function ManagerProductList() {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({ q: q || undefined, sortBy, sortDir, page, pageSize }),
    [q, sortBy, sortDir, page, pageSize]
  );

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        setLoading(true);
        const res = await ProductsAPI.list(params);
        // Hỗ trợ cả 2 format: có ApiResponse hay không
        const payload = res?.data?.data ?? res?.data ?? {};
        setRows(payload.items ?? []);
        setTotal(payload.total ?? 0);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name/sku/category"
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "1px solid #ddd",
            minWidth: 260,
          }}
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="created">Created</option>
          <option value="name">Name</option>
          <option value="sku">SKU</option>
          <option value="category">Category</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
          <option value="status">Status</option>
        </select>
        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ color: "#666", fontSize: 13 }}>Page size</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>SKU</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Category</th>
              <th style={{ padding: 10 }}>Unit</th>
              <th style={{ padding: 10 }}>Price</th>
              <th style={{ padding: 10 }}>Stock</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} style={{ padding: 16, color: "#888" }}>
                  Loading...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: 16, color: "#888" }}>
                  No data
                </td>
              </tr>
            ) : (
              rows.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td style={{ padding: 10 }}>{p.sku}</td>
                  <td style={{ padding: 10 }}>{p.name}</td>
                  <td style={{ padding: 10 }}>{p.category ?? "-"}</td>
                  <td style={{ padding: 10 }}>{p.unit ?? "-"}</td>
                  <td style={{ padding: 10 }}>{p.price}</td>
                  <td style={{ padding: 10 }}>{p.stock}</td>
                  <td style={{ padding: 10 }}>{p.status ?? "-"}</td>
                  <td style={{ padding: 10 }}>
                    {p.created ? new Date(p.created).toLocaleString() : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div
        style={{
          marginTop: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
          justifyContent: "flex-end",
        }}
      >
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: page <= 1 ? "#f3f3f3" : "#fff",
            cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>
        <div style={{ fontSize: 13, color: "#666" }}>
          Page {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </div>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.ceil(total / pageSize)}
          style={{
            padding: "8px 10px",
            borderRadius: 8,
            border: "1px solid #ddd",
            background: page >= Math.ceil(total / pageSize) ? "#f3f3f3" : "#fff",
            cursor: page >= Math.ceil(total / pageSize) ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
