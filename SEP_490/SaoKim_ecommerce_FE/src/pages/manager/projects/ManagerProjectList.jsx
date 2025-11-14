import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ProjectAPI } from "../../../api/ProjectManager/projects"; // named export

export default function ManagerProjectList() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      Keyword: q || undefined,
      Status: status || undefined,
      Sort: sort,
      Page: page,
      PageSize: pageSize,
    }),
    [q, status, sort, page, pageSize]
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await ProjectAPI.getAll(params);
        // unwrap ApiResponse<PagedResult<T>>
        const payload = res?.data;
        const pageData = payload?.data || {};
        const items = pageData.items || [];
        const totalItems = pageData.totalItems ?? 0;

        if (mounted) {
          setRows(items);
          setTotal(totalItems);
        }
      } catch (e) {
        console.error(e);
        if (mounted) {
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
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
          placeholder="Search by code/name/customer"
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", minWidth: 260 }}
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="">All status</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Done">Done</option>
          <option value="Cancelled">Cancelled</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          <option value="created_desc">Created desc</option>
          <option value="created_asc">Created asc</option>
          <option value="name_asc">Name asc</option>
          <option value="name_desc">Name desc</option>
        </select>

        <div style={{ marginLeft: "auto" }}>
          <button
            onClick={() => navigate("/manager/projects/create")}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #0b1f3a",
              background: "#0b1f3a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            + New Project
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
              <th style={{ padding: 10 }}>#</th>
              <th style={{ padding: 10 }}>Code</th>
              <th style={{ padding: 10 }}>Name</th>
              <th style={{ padding: 10 }}>Customer</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Start</th>
              <th style={{ padding: 10 }}>End</th>
              <th style={{ padding: 10 }}>Budget</th>
              <th style={{ padding: 10 }}></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ padding: 16, color: "#888" }}>Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 16, color: "#888" }}>No data</td></tr>
            ) : (
              rows.map((p, idx) => (
                <tr key={p.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{(page - 1) * pageSize + idx + 1}</td>
                  <td style={{ padding: 10 }}>
                    <Link to={`/manager/projects/${p.id}`} style={{ color: "#0b1f3a" }}>
                      {p.code}
                    </Link>
                  </td>
                  <td style={{ padding: 10 }}>{p.name}</td>
                  <td style={{ padding: 10 }}>{p.customerName ?? "-"}</td>
                  <td style={{ padding: 10 }}>{p.status}</td>
                  <td style={{ padding: 10 }}>{p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}</td>
                  <td style={{ padding: 10 }}>{p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}</td>
                  <td style={{ padding: 10 }}>{p.budget ?? "-"}</td>
                  <td style={{ padding: 10 }}>
                    <Link to={`/manager/projects/${p.id}/edit`} style={{ color: "#0b1f3a" }}>Edit</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
        <label style={{ color: "#666", fontSize: 13 }}>Page size</label>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          {[10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          style={{
            padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd",
            background: page <= 1 ? "#f3f3f3" : "#fff", cursor: page <= 1 ? "not-allowed" : "pointer",
          }}
        >
          Prev
        </button>
        <div style={{ fontSize: 13, color: "#666" }}>
          Page {page} / {Math.max(1, totalPages)}
        </div>
        <button
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
          style={{
            padding: "8px 10px", borderRadius: 8, border: "1px solid #ddd",
            background: page >= totalPages ? "#f3f3f3" : "#fff", cursor: page >= totalPages ? "not-allowed" : "pointer",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
