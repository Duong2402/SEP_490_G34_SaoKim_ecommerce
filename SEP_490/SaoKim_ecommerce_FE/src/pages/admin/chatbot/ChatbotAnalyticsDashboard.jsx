
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../../../api/lib/apiClient";

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function apiGetJson(path) {
  const res = await apiFetch(path, { method: "GET" });
  return await res.json();
}

function Card({ children, style }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid var(--wm-border)",
        borderRadius: 16,
        padding: 16,
        boxShadow: "var(--wm-shadow)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ color: "var(--wm-muted)", fontWeight: 600, fontSize: 13 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, color: "var(--wm-text)" }}>{value}</div>
      {sub ? <div style={{ color: "var(--wm-muted)", fontSize: 12 }}>{sub}</div> : null}
    </div>
  );
}

function drawLineChart(canvas, points, opts) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.clearRect(0, 0, cssW, cssH);

  const padding = 32;
  const w = cssW - padding * 2;
  const h = cssH - padding * 2;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 1);

  const xStep = points.length > 1 ? w / (points.length - 1) : w;
  const yScale = maxV - minV === 0 ? 1 : maxV - minV;

  const xAt = (i) => padding + i * xStep;
  const yAt = (v) => padding + h - ((v - minV) / yScale) * h;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.beginPath();
  for (let i = 0; i <= 4; i++) {
    const y = padding + (h * i) / 4;
    ctx.moveTo(padding, y);
    ctx.lineTo(padding + w, y);
  }
  ctx.stroke();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(0,0,0,0.75)";
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "rgba(0,0,0,0.75)";
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.value);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto";
  ctx.textAlign = "left";
  ctx.fillText(opts?.yLabel || "", padding, 16);

  ctx.textAlign = "right";
  ctx.fillText(String(maxV), padding + w, padding - 10);
  ctx.fillText(String(minV), padding + w, padding + h + 18);

  if (points.length <= 10) {
    ctx.textAlign = "center";
    points.forEach((p, i) => {
      const x = xAt(i);
      ctx.fillText(p.label, x, padding + h + 18);
    });
  } else {
    ctx.textAlign = "center";
    const idx = [0, Math.floor(points.length / 2), points.length - 1];
    idx.forEach((i) => {
      const x = xAt(i);
      ctx.fillText(points[i].label, x, padding + h + 18);
    });
  }
}

function BarsTable({ title, rows, valueKey = "count" }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);
  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.length === 0 ? (
          <div style={{ color: "var(--wm-muted)" }}>Chưa có dữ liệu</div>
        ) : (
          rows.map((r, idx) => {
            const v = Number(r[valueKey] || 0);
            const pct = Math.round((v / max) * 100);
            return (
              <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontWeight: 700, color: "var(--wm-text)", fontSize: 13 }}>
                    {r.label || r.keyword || r.question || r.name || "N/A"}
                  </div>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(0,0,0,0.08)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: `${pct}%`, height: "100%", background: "rgba(0,0,0,0.55)" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", fontWeight: 800 }}>{v}</div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

export default function ChatbotAnalyticsDashboard() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(toISODate(addDays(today, -6)));
  const [to, setTo] = useState(toISODate(today));

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [overview, setOverview] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [topQuestions, setTopQuestions] = useState([]);
  const [topKeywords, setTopKeywords] = useState([]);
  const [topClicked, setTopClicked] = useState([]);

  const sessionsCanvasRef = useRef(null);
  const noResultCanvasRef = useRef(null);

  const queryStr = useMemo(() => `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, [from, to]);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [ov, ts, tq, tk, tc] = await Promise.all([
        apiGetJson(`/api/admin/chatbot/overview?${queryStr}`),
        apiGetJson(`/api/admin/chatbot/timeseries?${queryStr}&bucket=day`),
        apiGetJson(`/api/admin/chatbot/top-questions?${queryStr}&limit=10`),
        apiGetJson(`/api/admin/chatbot/top-keywords?${queryStr}&limit=10`),
        apiGetJson(`/api/admin/chatbot/top-products-clicked?${queryStr}&limit=10`),
      ]);

      setOverview(ov || null);
      setTimeseries(Array.isArray(ts) ? ts : ts?.items || []);
      setTopQuestions(Array.isArray(tq) ? tq : tq?.items || []);
      setTopKeywords(Array.isArray(tk) ? tk : tk?.items || []);
      setTopClicked(Array.isArray(tc) ? tc : tc?.items || []);
    } catch (e) {
      setError(String(e?.message || e || "Không tải được dữ liệu"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const pts1 = (timeseries || []).map((x) => ({
      label: (x.date || x.day || "").toString().slice(5),
      value: Number(x.sessions ?? x.totalSessions ?? 0),
    }));
    drawLineChart(sessionsCanvasRef.current, pts1.length ? pts1 : [{ label: "", value: 0 }], { yLabel: "Sessions" });

    const pts2 = (timeseries || []).map((x) => ({
      label: (x.date || x.day || "").toString().slice(5),
      value: Number(x.noResult ?? x.noResultCount ?? 0),
    }));
    drawLineChart(noResultCanvasRef.current, pts2.length ? pts2 : [{ label: "", value: 0 }], { yLabel: "NoResult" });
  }, [timeseries]);

  const ov = overview || {};
  const totalSessions = ov.totalSessions ?? 0;
  const totalMessages = ov.totalMessages ?? 0;
  const avgLatencyMs = ov.avgLatencyMs ?? 0;
  const faqRate = ov.faqRate ?? ov.faqPercent ?? 0;
  const toolRate = ov.toolRate ?? ov.toolPercent ?? 0;
  const noResultRate = ov.noResultRate ?? ov.noResultPercent ?? 0;
  const ctr = ov.ctr ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card style={{ padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ margin: 0 }}>Báo cáo Chatbot</h2>
            <div style={{ marginTop: 6, color: "var(--wm-muted)" }}>Thống kê theo khoảng thời gian, phục vụ dashboard admin</div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--wm-muted)", fontWeight: 700 }}>Từ ngày</div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--wm-border)",
                  padding: "8px 10px",
                  background: "#fff",
                  color: "var(--wm-text)",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "var(--wm-muted)", fontWeight: 700 }}>Đến ngày</div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={{
                  borderRadius: 10,
                  border: "1px solid var(--wm-border)",
                  padding: "8px 10px",
                  background: "#fff",
                  color: "var(--wm-text)",
                }}
              />
            </div>

            <button
              onClick={loadAll}
              disabled={loading}
              style={{
                alignSelf: "flex-end",
                borderRadius: 12,
                border: "1px solid var(--wm-border)",
                padding: "10px 14px",
                background: "#fff",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Đang tải..." : "Tải dữ liệu"}
            </button>
          </div>
        </div>
      </Card>

      {error ? (
        <Card style={{ borderColor: "rgba(0,0,0,0.15)" }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Lỗi</div>
          <div style={{ color: "var(--wm-muted)", whiteSpace: "pre-wrap" }}>{error}</div>
        </Card>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Card><Stat label="Tổng lượt chat (sessions)" value={String(totalSessions)} /></Card>
        <Card><Stat label="Tổng tin nhắn" value={String(totalMessages)} /></Card>
        <Card><Stat label="Độ trễ trung bình" value={`${Number(avgLatencyMs).toFixed(0)} ms`} /></Card>
        <Card><Stat label="CTR sản phẩm" value={`${Number(ctr).toFixed(2)}%`} sub="Click / Sessions hoặc Click / Messages tùy backend" /></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Sessions theo ngày</div>
          <div style={{ height: 240 }}>
            <canvas ref={sessionsCanvasRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </Card>

        <Card>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>NoResult theo ngày</div>
          <div style={{ height: 240 }}>
            <canvas ref={noResultCanvasRef} style={{ width: "100%", height: "100%" }} />
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Card><Stat label="Tỷ lệ trả lời từ FAQ" value={`${Number(faqRate).toFixed(2)}%`} /></Card>
        <Card><Stat label="Tỷ lệ dùng tool" value={`${Number(toolRate).toFixed(2)}%`} /></Card>
        <Card><Stat label="Tỷ lệ không có sản phẩm" value={`${Number(noResultRate).toFixed(2)}%`} /></Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <BarsTable title="Top câu hỏi" rows={topQuestions.map((x) => ({ ...x, label: x.question || x.label }))} valueKey="count" />
        <BarsTable title="Top keyword" rows={topKeywords.map((x) => ({ ...x, label: x.keyword || x.label }))} valueKey="count" />
        <BarsTable title="Top sản phẩm được click" rows={topClicked.map((x) => ({ ...x, label: x.name || x.productName || x.label }))} valueKey="count" />
      </div>
    </div>
  );
}
