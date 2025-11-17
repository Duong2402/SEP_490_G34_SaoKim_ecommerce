// src/pages/manager/promotions/ManagerPromotionList.jsx
import { useEffect, useMemo, useState } from "react";
import { PromotionsAPI } from "../../../api/promotions";
import AddEditPromotionModal from "../../../components/AddEditPromotionModal";
import MultiAddPromotionProductsModal from "../../../components/MultiAddPromotionProductsModal";
import { formatDate } from "../../ProjectManager/projectHelpers";

export default function ManagerPromotionList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [showEdit, setShowEdit] = useState(null);       // null | dto
  const [showProducts, setShowProducts] = useState(null); // promotion id

  const params = useMemo(
    () => ({ q: q || undefined, status: status || undefined, sortBy, sortDir, page, pageSize }),
    [q, status, sortBy, sortDir, page, pageSize]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await PromotionsAPI.list(params);
      const payload = res?.data?.data ?? res?.data ?? {};
      setRows(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => { await load(); })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onDeleted = async (id) => {
    if (!window.confirm("Xóa promotion này? Hành động không thể hoàn tác.")) return;
    try {
      await PromotionsAPI.remove(id);
      await load();
    } catch (e) {
      console.error(e);
      alert("Xóa thất bại");
    }
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      {/* Filters & Actions */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", minWidth: 260 }}
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="">All statuses</option>
          <option value="Draft">Draft</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Expired">Expired</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="created">Created</option>
          <option value="name">Name</option>
          <option value="startDate">Start date</option>
          <option value="endDate">End date</option>
          <option value="discountValue">Discount</option>
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

        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary" onClick={() => setShowEdit({})}>+ New Promotion</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Discount</th>
              <th style={{ padding: 10 }}>Start</th>
              <th style={{ padding: 10 }}>End</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Created</th>
              <th style={{ padding: 10, width: 220 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 16, color: "#888" }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 16, color: "#888" }}>No data</td></tr>
            ) : (
              rows.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td style={{ padding: 10 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.description ? <div style={{ fontSize: 12, color: "#64748b" }}>{p.description}</div> : null}
                  </td>
                  <td style={{ padding: 10 }}>
                    {p.discountType === "Percentage" ? `${p.discountValue}%` : `${p.discountValue} VND`}
                  </td>
                  <td style={{ padding: 10 }}>{formatDate(p.startDate, "vi")}</td>
                  <td style={{ padding: 10 }}>{formatDate(p.endDate, "vi")}</td>
                  <td style={{ padding: 10 }}>{p.status}</td>
                  <td style={{ padding: 10 }}>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "-"}</td>
                  <td style={{ padding: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowProducts(p.id)}>Products</button>
                    <button className="btn btn-outline btn-sm" onClick={() => setShowEdit(p)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDeleted(p.id)} style={{ color: "#dc2626" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          Prev
        </button>
        <div style={{ fontSize: 13, color: "#666" }}>
          Page {page} / {totalPages}
        </div>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
          style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          Next
        </button>
        <label style={{ color: "#666", fontSize: 13, marginLeft: 12 }}>Page size</label>
        <select
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Modals */}
      {showEdit !== null && (
        <AddEditPromotionModal
          promotion={showEdit?.id ? showEdit : null}
          onClose={() => setShowEdit(null)}
          onSaved={async () => { setShowEdit(null); await load(); }}
        />
      )}
      {showProducts !== null && (
        <MultiAddPromotionProductsModal
          promotionId={showProducts}
          onClose={() => setShowProducts(null)}
        />
      )}
    </div>
  );
}
