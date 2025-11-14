import { useEffect, useMemo, useState } from "react";
import { CouponsAPI } from "../../../api/coupons";
import AddEditCouponModal from "../../../components/AddEditCouponModal";
import { formatDate } from "../../ProjectManager/projectHelpers";

export default function ManagerCouponList() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(null);

  const params = useMemo(
    () => ({ q: q || undefined, status: status || undefined, sortBy, sortDir, page, pageSize }),
    [q, status, sortBy, sortDir, page, pageSize]
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await CouponsAPI.list(params);
      const payload = res?.data?.data ?? res?.data ?? {};
      setRows(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [params]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onDelete = async (id) => {
    if (!window.confirm("Xoá coupon này?")) return;
    await CouponsAPI.remove(id);
    await load();
  };

  // NEW: toggle Active <-> Inactive
  const onToggle = async (id) => {
    await CouponsAPI.toggle(id);
    await load();
  };

  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by code/name" className="input" style={{ minWidth: 260 }} />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input">
          <option value="">All statuses</option>
          <option>Draft</option><option>Scheduled</option><option>Active</option><option>Inactive</option><option>Expired</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input">
          <option value="created">Created</option>
          <option value="name">Name</option>
          <option value="startDate">Start</option>
          <option value="endDate">End</option>
          <option value="discountValue">Discount</option>
          <option value="status">Status</option>
        </select>
        <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="input">
          <option value="desc">Desc</option><option value="asc">Asc</option>
        </select>
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-primary" onClick={() => setEditing({})}>+ New Coupon</button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee", textAlign: "left" }}>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>Code</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Discount</th>
              <th style={{ padding: 10 }}>Start</th>
              <th style={{ padding: 10 }}>End</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Created</th>
              <th style={{ padding: 10, width: 300 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 16, color: "#888" }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 16, color: "#888" }}>No data</td></tr>
            ) : (
              rows.map((c, idx) => (
                <tr key={c.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td style={{ padding: 10, fontWeight: 600 }}>{c.code}</td>
                  <td style={{ padding: 10 }}>{c.name}</td>
                  <td style={{ padding: 10 }}>
                    {c.discountType === "Percentage"
                      ? `${c.discountValue}%`
                      : `${Number(c.discountValue).toLocaleString("vi-VN")} VND`}
                  </td>
                  <td style={{ padding: 10 }}>{formatDate(c.startDate, "vi")}</td>
                  <td style={{ padding: 10 }}>{formatDate(c.endDate, "vi")}</td>
                  <td style={{ padding: 10 }}>{c.status}</td>
                  <td style={{ padding: 10 }}>{c.createdAt ? new Date(c.createdAt).toLocaleString() : "-"}</td>
                  <td style={{ padding: 10, display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn btn-outline btn-sm" onClick={() => onToggle(c.id)}>
                      {c.status === "Active" ? "Deactivate" : "Activate"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => onDelete(c.id)} style={{ color: "#dc2626" }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn">Prev</button>
        <div>Page {page} / {totalPages}</div>
        <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn">Next</button>
        <label>Page size</label>
        <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="input">
          {[10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {editing !== null && (
        <AddEditCouponModal
          coupon={editing?.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}
