import React, { useEffect, useMemo, useState } from "react";


const API_BASE = "https://localhost:7278";

function qs(params) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

async function apiList({ search, status, dateFrom, dateTo, page, pageSize }) {
  const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips${qs({ search, status, dateFrom, dateTo, page, pageSize })}`);
  if (!res.ok) throw new Error(await safeErr(res));
  return res.json();
}
async function apiDetail(id) {
  const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}`);
  if (!res.ok) throw new Error(await safeErr(res));
  return res.json();
}
async function apiConfirm(id) {
  const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/confirm`, { method: "POST" });
  if (!res.ok) throw new Error(await safeErr(res));
  return res.json();
}
async function apiDelete(id) {
  const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(await safeErr(res));
}
async function safeErr(res) {
  try { const j = await res.json(); return j?.message || JSON.stringify(j); } catch { return `HTTP ${res.status}`; }
}


export default function ReceivingList() {

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [draftCount, setDraftCount] = useState(0);
  const [confirmedCount, setConfirmedCount] = useState(0);

  const [openId, setOpenId] = useState(null);
  const [detail, setDetail] = useState(null);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const payload = await apiList({
        search: search.trim() || undefined,
        status: status === "" ? undefined : String(status),
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        pageSize,
      });
      setRows(payload.items || []);
      setTotal(payload.total || 0);
      const d = (payload.items || []).filter(x => x.status === 0).length;
      const c = (payload.items || []).filter(x => x.status === 1).length;
      setDraftCount(d);
      setConfirmedCount(c);
    } catch (e) {
      setError(e.message || String(e));
    } finally { setLoading(false); }
  }

  useEffect(() => { load();}, [page, pageSize]);

  function applyFilters(e) {
    e?.preventDefault();
    setPage(1);
    load();
  }
  function resetFilters() {
    setSearch(""); setStatus(""); setDateFrom(""); setDateTo(""); setPage(1); setPageSize(20); setTimeout(load, 0);
  }

  async function openDetail(id) {
    setOpenId(id); setDetail(null);
    try { const d = await apiDetail(id); setDetail(d); } catch (e) { setError(e.message || String(e)); }
  }

  async function onConfirm(id) {
    if (!window.confirm("Xác nhận nhập kho phiếu này?")) return;
    setLoading(true);
    try { await apiConfirm(id); await load(); if (openId === id) await openDetail(id); } catch (e) { alert(e.message || String(e)); } finally { setLoading(false); }
  }
  async function onDelete(id) {
    if (!window.confirm("Xoá phiếu nhập (chỉ khi Draft)?")) return;
    setLoading(true);
    try { await apiDelete(id); await load(); if (openId === id) { setOpenId(null); setDetail(null); } } catch (e) { alert(e.message || String(e)); } finally { setLoading(false); }
  }

  return (
    <div style={styles.wrap}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Receiving Slips</h1>
          <p style={styles.subtitle}>Quản lý phiếu nhập kho (Draft / Confirmed)</p>
        </div>
        <div style={styles.kpis}>
          <Kpi title="Total (page)" value={total} />
          <Kpi title="Draft" value={draftCount} tone="#ffb020" bg="#fff7e6" />
          <Kpi title="Confirmed" value={confirmedCount} tone="#2db47c" bg="#e7f5ee" />
        </div>
      </header>

      <form onSubmit={applyFilters} style={styles.filters}>
        <div>
          <label style={styles.label}>Search</label>
          <input placeholder="Supplier / Reference" value={search} onChange={e=>setSearch(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Status</label>
          <select value={status} onChange={e=>setStatus(e.target.value)} style={styles.input}>
            <option value="">All</option>
            <option value="0">Draft</option>
            <option value="1">Confirmed</option>
          </select>
        </div>
        <div>
          <label style={styles.label}>From</label>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>To</label>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={styles.input} />
        </div>
        <div>
          <label style={styles.label}>Page size</label>
          <select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))} style={styles.input}>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 8, alignSelf: "end" }}>
          <button type="submit" style={styles.btnPrimary}>Apply</button>
          <button type="button" onClick={resetFilters} style={styles.btnGhost}>Reset</button>
        </div>
      </form>

      <div style={styles.layout}> 
        <div style={styles.tableCard}>
          <div style={styles.tableScroll}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Reference</th>
                  <th style={styles.th}>Supplier</th>
                  <th style={styles.th}>Receipt Date</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                  <th style={styles.th}>Confirmed</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={styles.empty}>Loading...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={8} style={styles.empty}>No data</td></tr>
                ) : rows.map(r => (
                  <tr key={r.id} onClick={() => openDetail(r.id)} style={{ cursor: "pointer" }}>
                    <td style={styles.td}>{r.id}</td>
                    <td style={{...styles.td, fontFamily: mono }}>{r.referenceNo}</td>
                    <td style={styles.td}>{r.supplier}</td>
                    <td style={styles.td}>{fmt(r.receiptDate)}</td>
                    <td style={styles.td}>{r.status === 1 ? <Badge text="Confirmed" tone="#2db47c" bg="#e7f5ee"/> : <Badge text="Draft" tone="#ffb020" bg="#fff7e6"/>}</td>
                    <td style={styles.td}>{fmt(r.createdAt)}</td>
                    <td style={styles.td}>{r.confirmedAt ? fmt(r.confirmedAt) : "-"}</td>
                    <td style={styles.td} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 8 }}>
                        {r.status === 0 && <button style={styles.btnPrimarySm} onClick={() => onConfirm(r.id)}>Confirm</button>}
                        {r.status === 0 && <button style={styles.btnDangerSm} onClick={() => onDelete(r.id)}>Delete</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={styles.pagerRow}>
            <div style={{ color: "#666" }}>Total: {total}</div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button disabled={page <= 1} style={styles.btnLite} onClick={() => setPage(1)}>{"<<"}</button>
              <button disabled={page <= 1} style={styles.btnLite} onClick={() => setPage(p=>Math.max(1,p-1))}>{"<"}</button>
              <span style={{ minWidth: 120, textAlign: "center" }}>Page {page} / {totalPages}</span>
              <button disabled={page >= totalPages} style={styles.btnLite} onClick={() => setPage(p=>Math.min(totalPages,p+1))}>{">"}</button>
              <button disabled={page >= totalPages} style={styles.btnLite} onClick={() => setPage(totalPages)}>{">>"}</button>
            </div>
          </div>
        </div>

        <aside style={{ ...styles.drawer, transform: openId ? "translateX(0)" : "translateX(110%)" }}>
          <div style={styles.drawerHeader}>
            <div>
              <div style={{ fontSize: 12, color: "#888" }}>Detail</div>
              <div style={{ fontWeight: 700 }}>Slip #{openId ?? "-"}</div>
            </div>
            <button style={styles.btnGhost} onClick={() => { setOpenId(null); setDetail(null); }}>Close</button>
          </div>

          {!detail ? (
            <div style={{ padding: 16, color: "#666" }}>Loading detail...</div>
          ) : (
            <div style={{ padding: 16 }}>
              <div style={styles.detailGrid}>
                <Field label="Reference" value={detail.referenceNo} mono />
                <Field label="Supplier" value={detail.supplier} />
                <Field label="Receipt Date" value={fmt(detail.receiptDate)} />
                <Field label="Status" value={detail.status === 1 ? "Confirmed" : "Draft"} />
                <Field label="Created" value={fmt(detail.createdAt)} />
                <Field label="Confirmed" value={detail.confirmedAt ? fmt(detail.confirmedAt) : "-"} />
                <Field label="Note" value={detail.note || "-"} full />
              </div>

              <h3 style={{ marginTop: 20, marginBottom: 8 }}>Items</h3>
              <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Product</th>
                      <th style={styles.th}>UoM</th>
                      <th style={styles.th} align="right">Qty</th>
                      <th style={styles.th} align="right">Unit Price</th>
                      <th style={styles.th} align="right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!detail.items || detail.items.length === 0) ? (
                      <tr><td colSpan={5} style={styles.empty}>No items</td></tr>
                    ) : detail.items.map((it, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>{it.productName}</td>
                        <td style={styles.td}>{it.uom}</td>
                        <td style={{...styles.td, textAlign: "right"}}>{it.quantity}</td>
                        <td style={{...styles.td, textAlign: "right"}}>{fmtNumber(it.unitPrice)}</td>
                        <td style={{...styles.td, textAlign: "right"}}>{fmtNumber(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {detail.status === 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                  <button style={styles.btnPrimary} onClick={() => onConfirm(detail.id)}>Confirm</button>
                  <button style={styles.btnDanger} onClick={() => onDelete(detail.id)}>Delete</button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

const mono = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";
function Kpi({ title, value, tone = "#111", bg = "#f6f6f6" }) {
  return (
    <div style={{ background: bg, border: "1px solid #eee", padding: 12, borderRadius: 12, minWidth: 140 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: tone }}>{value}</div>
    </div>
  );
}
function Badge({ text, tone, bg }) {
  return <span style={{ padding: "2px 8px", borderRadius: 12, background: bg, border: `1px solid ${lighten(tone, .5)}`, color: "#222", fontSize: 12 }}>{text}</span>;
}
function Field({ label, value, full, mono: m }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontFamily: m ? mono : undefined }}>{value}</div>
    </div>
  );
}


const styles = {
  wrap: { padding: 24, fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  h1: { fontSize: 22, margin: 0 },
  subtitle: { margin: 0, color: "#666", fontSize: 13 },
  kpis: { display: "flex", gap: 12 },
  filters: { display: "grid", gridTemplateColumns: "1.2fr 160px 160px 160px 140px auto", gap: 12, alignItems: "end", marginBottom: 16 },
  label: { display: "block", fontSize: 12, color: "#666", marginBottom: 6 },
  input: { width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10, outline: "none" },
  layout: { display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 },
  tableCard: { background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden" },
  tableScroll: { overflow: "auto", maxHeight: "calc(100vh - 320px)" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: "10px 12px", borderBottom: "1px solid #eee", background: "#fafafa", position: "sticky", top: 0, zIndex: 1 },
  td: { padding: "10px 12px", borderBottom: "1px solid #f3f3f3" },
  empty: { padding: 16, textAlign: "center", color: "#666" },
  pagerRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderTop: "1px solid #f1f1f1" },
  btnLite: { padding: "6px 10px", border: "1px solid #ddd", background: "#fff", borderRadius: 8, cursor: "pointer" },
  btnPrimary: { padding: "10px 14px", border: "1px solid #0d6efd", background: "#0d6efd", color: "#fff", borderRadius: 10, cursor: "pointer" },
  btnGhost: { padding: "10px 14px", border: "1px solid #ddd", background: "#fff", borderRadius: 10, cursor: "pointer" },
  btnDanger: { padding: "10px 14px", border: "1px solid #dc3545", background: "#dc3545", color: "#fff", borderRadius: 10, cursor: "pointer" },
  btnPrimarySm: { padding: "6px 10px", border: "1px solid #0d6efd", background: "#0d6efd", color: "#fff", borderRadius: 8, cursor: "pointer" },
  btnDangerSm: { padding: "6px 10px", border: "1px solid #dc3545", background: "#dc3545", color: "#fff", borderRadius: 8, cursor: "pointer" },
  drawer: { position: "sticky", top: 24, height: "calc(100vh - 48px)", background: "#fff", border: "1px solid #eee", borderRadius: 12, overflow: "hidden", transition: "transform .25s ease", boxShadow: "0 10px 30px rgba(0,0,0,.05)" },
  drawerHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: "1px solid #f1f1f1", background: "#fafafa" },
  detailGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }
};

function fmt(d) { try { return new Date(d).toLocaleString(); } catch { return String(d || ""); } }
function fmtNumber(n) { return new Intl.NumberFormat().format(n ?? 0); }
function lighten(hex, amt) {

  try {
    const h = hex.replace('#','');
    const num = parseInt(h,16);
    let r = (num>>16) + Math.round(255*amt); r = r>255?255:r;
    let g = ((num>>8)&0x00FF) + Math.round(255*amt); g = g>255?255:g;
    let b = (num&0x0000FF) + Math.round(255*amt); b = b>255?255:b;
    const toHex = (x)=>x.toString(16).padStart(2,'0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch { return "#ddd"; }
}
