// src/pages/manager/Dashboard.jsx
import { useEffect, useState, useMemo } from "react";
import { ProductsAPI } from "../../api/products";

function KpiCard({ title, value, sub }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 12,
        padding: 16,
        flex: 1,
        minWidth: 220,
      }}
    >
      <div style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ marginTop: 8, fontSize: 12, color: "#999" }}>{sub}</div>}
    </div>
  );
}

export default function ManagerDashboard() {
  const [totalProducts, setTotalProducts] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const lowStockParams = useMemo(
    () => ({ page: 1, pageSize: 5, sortBy: "stock", sortDir: "asc" }),
    []
  );
  const newProductsParams = useMemo(
    () => ({ page: 1, pageSize: 5, sortBy: "created", sortDir: "desc" }),
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        // 1) Lấy tổng số sản phẩm (dùng pageSize=1 để BE trả 'total')
        const totalRes = await ProductsAPI.list({ page: 1, pageSize: 1 });
        if (mounted) setTotalProducts(totalRes?.data?.data?.total ?? totalRes?.data?.total ?? 0);

        // 2) Low stock
        const lowRes = await ProductsAPI.list(lowStockParams);
        const lowItems = lowRes?.data?.data?.items ?? lowRes?.data?.items ?? [];
        if (mounted) setLowStock(lowItems);

        // 3) Newest products
        const newRes = await ProductsAPI.list(newProductsParams);
        const newItems = newRes?.data?.data?.items ?? newRes?.data?.items ?? [];
        if (mounted) setNewProducts(newItems);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [lowStockParams, newProductsParams]);

  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <KpiCard title="Total products" value={loading || totalProducts === null ? "..." : totalProducts} />
        <KpiCard
          title="Low stock (top 5)"
          value={loading ? "..." : lowStock.length}
          sub="Sorted by stock asc"
        />
        <KpiCard
          title="Newest (top 5)"
          value={loading ? "..." : newProducts.length}
          sub="Sorted by created desc"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
        }}
      >
        {/* Low stock table */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>Low stock products</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: 8 }}>SKU</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Price</th>
                  <th style={{ padding: 8 }}>Stock</th>
                  <th style={{ padding: 8 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(lowStock || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 8 }}>{p.sku}</td>
                    <td style={{ padding: 8 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{p.price}</td>
                    <td style={{ padding: 8 }}>{p.stock}</td>
                    <td style={{ padding: 8 }}>{p.status ?? "-"}</td>
                  </tr>
                ))}
                {!loading && lowStock?.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 12, color: "#999" }}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* New products table */}
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12 }}>New products</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                  <th style={{ padding: 8 }}>SKU</th>
                  <th style={{ padding: 8 }}>Name</th>
                  <th style={{ padding: 8 }}>Price</th>
                  <th style={{ padding: 8 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {(newProducts || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                    <td style={{ padding: 8 }}>{p.sku}</td>
                    <td style={{ padding: 8 }}>{p.name}</td>
                    <td style={{ padding: 8 }}>{p.price}</td>
                    <td style={{ padding: 8 }}>
                      {p.created ? new Date(p.created).toLocaleString() : "-"}
                    </td>
                  </tr>
                ))}
                {!loading && newProducts?.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "#999" }}>
                      No data
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
