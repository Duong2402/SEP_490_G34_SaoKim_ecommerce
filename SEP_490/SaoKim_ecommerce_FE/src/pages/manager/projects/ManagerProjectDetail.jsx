import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ProjectAPI } from "../../../api/ProjectManager/projects";
import { ProjectProductAPI } from "../../../api/ProjectManager/project-products";
import { ProjectExpenseAPI } from "../../../api/ProjectManager/project-expenses";

export default function ManagerProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [products, setProducts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setErr("");
        setLoading(true);

        const [pRes, prodRes, expRes] = await Promise.all([
          ProjectAPI.getById(id),                         // ApiResponse<ProjectDto>
          ProjectProductAPI.list(id),                     // ApiResponse<{ items:[] } | [] 
          ProjectExpenseAPI.list(id, { Page: 1, PageSize: 50 }), // ApiResponse<{ page:{items:[]}, totalAmount }>
        ]);

        // --- unwrap Project ---
        const p = pRes?.data?.data ?? pRes?.data ?? null;

        // --- unwrap Products (mảng hoặc object có items/Items) ---
        const prodPayload = prodRes?.data?.data ?? prodRes?.data ?? {};
        const prodItems =
          prodPayload?.items ??
          prodPayload?.Items ??
          (Array.isArray(prodPayload) ? prodPayload : []);

        // --- unwrap Expenses: ưu tiên nested page.items ---
        const expPayload = expRes?.data?.data ?? expRes?.data ?? {};
        const pageObj = expPayload?.page ?? expPayload?.Page ?? {};
        const expItemsFromPage =
          pageObj?.items ?? pageObj?.Items ?? [];
        const expItemsFlat =
          expPayload?.items ?? expPayload?.Items ?? [];
        const expItems = Array.isArray(expItemsFromPage) && expItemsFromPage.length > 0
          ? expItemsFromPage
          : (Array.isArray(expItemsFlat) ? expItemsFlat : []);

        const totalAmt = expPayload?.totalAmount ?? expPayload?.TotalAmount ?? 0;

        if (mounted) {
          setProject(p || null);
          setProducts(Array.isArray(prodItems) ? prodItems : []);
          setExpenses(Array.isArray(expItems) ? expItems : []);
          setTotalExpense(Number(totalAmt) || 0);
        }
      } catch (e) {
        console.error(e);
        if (mounted) setErr("Load failed");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div style={{ padding: 16 }}>Loading...</div>;
  if (err) return <div style={{ padding: 16, color: "#b91c1c" }}>{err}</div>;
  if (!project) return <div style={{ padding: 16 }}>Project not found</div>;

  const headerItem = { marginBottom: 8, color: "#444" };
  const box = { background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16 };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Header */}
      <div style={{ ...box, display: "flex", alignItems: "center" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, color: "#666" }}>Project</div>
          <div style={{ fontSize: 20, fontWeight: 700 }}>
            {(project.code || "").toString()} — {(project.name || "").toString()}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, color: "#666" }}>
            Status: <b>{project.status || "-"}</b>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => navigate(`/manager/projects/${id}/edit`)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #0b1f3a",
              background: "#0b1f3a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Edit
          </button>
          <Link
            to={`/manager/projects/${id}/report`}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #ddd",
              background: "#fff",
              color: "#0b1f3a",
              textDecoration: "none",
            }}
          >
            View report
          </Link>
        </div>
      </div>

      {/* Info */}
      <div style={{ ...box }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div><div style={headerItem}>Customer</div><div>{project.customerName || "-"}</div></div>
          <div><div style={headerItem}>Contact</div><div>{project.customerContact || "-"}</div></div>
          <div><div style={headerItem}>Budget</div><div>{project.budget ?? "-"}</div></div>
          <div><div style={headerItem}>Start date</div><div>{project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}</div></div>
          <div><div style={headerItem}>End date</div><div>{project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}</div></div>
          <div><div style={headerItem}>Created by</div><div>{project.createdBy || "-"}</div></div>
        </div>
        {project.description && (
          <div style={{ marginTop: 12 }}>
            <div style={headerItem}>Description</div>
            <div>{project.description}</div>
          </div>
        )}
      </div>

      {/* Products */}
      <div style={{ ...box }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Items</div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: 10 }}>Product</th>
                <th style={{ padding: 10 }}>UoM</th>
                <th style={{ padding: 10 }}>Qty</th>
                <th style={{ padding: 10 }}>UnitPrice</th>
                <th style={{ padding: 10 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(products || []).map((it) => (
                <tr key={it.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{it.productName}</td>
                  <td style={{ padding: 10 }}>{it.uom}</td>
                  <td style={{ padding: 10 }}>{it.quantity}</td>
                  <td style={{ padding: 10 }}>{it.unitPrice}</td>
                  <td style={{ padding: 10 }}>{it.total}</td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr><td colSpan={5} style={{ padding: 12, color: "#999" }}>No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div style={{ ...box }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>Expenses</div>
          <div style={{ fontSize: 13, color: "#334155" }}>
            Total:&nbsp;<b>{totalExpense}</b>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #eee" }}>
                <th style={{ padding: 10 }}>Date</th>
                <th style={{ padding: 10 }}>Category</th>
                <th style={{ padding: 10 }}>Vendor</th>
                <th style={{ padding: 10 }}>Amount</th>
                <th style={{ padding: 10 }}>Note</th>
              </tr>
            </thead>
            <tbody>
              {(expenses || []).map((ex) => (
                <tr key={ex.id} style={{ borderBottom: "1px solid #f2f2f2" }}>
                  <td style={{ padding: 10 }}>{ex.date ? new Date(ex.date).toLocaleDateString() : "-"}</td>
                  <td style={{ padding: 10 }}>{ex.category ?? "-"}</td>
                  <td style={{ padding: 10 }}>{ex.vendor ?? "-"}</td>
                  <td style={{ padding: 10 }}>{ex.amount}</td>
                  <td style={{ padding: 10 }}>{ex.description ?? "-"}</td>
                </tr>
              ))}
              {(!expenses || expenses.length === 0) && (
                <tr><td colSpan={5} style={{ padding: 12, color: "#999" }}>No expenses</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
