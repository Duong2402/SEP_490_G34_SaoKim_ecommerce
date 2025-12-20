import { useEffect, useMemo, useRef, useState } from "react";
import { FaSync, FaComments, FaEnvelope, FaClock, FaMousePointer, FaQuestion, FaKey, FaShoppingCart } from "react-icons/fa";
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

function StatCard({ icon: Icon, label, value, sub, color = "var(--wm-primary)" }) {
  return (
    <div className="admin-chatbot__stat-card">
      <div className="admin-chatbot__stat-icon" style={{ background: color }}>
        {Icon && <Icon />}
      </div>
      <div className="admin-chatbot__stat-content">
        <div className="admin-chatbot__stat-label">{label}</div>
        <div className="admin-chatbot__stat-value">{value}</div>
        {sub && <div className="admin-chatbot__stat-sub">{sub}</div>}
      </div>
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

  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 24;
  const paddingBottom = 28;
  const w = cssW - paddingLeft - paddingRight;
  const h = cssH - paddingTop - paddingBottom;

  const values = points.map((p) => p.value);
  const minV = Math.min(...values, 0);
  const maxV = Math.max(...values, 1);

  const xStep = points.length > 1 ? w / (points.length - 1) : w;
  const yScale = maxV - minV === 0 ? 1 : maxV - minV;

  const xAt = (i) => paddingLeft + i * xStep;
  const yAt = (v) => paddingTop + h - ((v - minV) / yScale) * h;

  const lineColor = opts?.color || "#1f76c0";

  // Dashed grid lines
  ctx.setLineDash([3, 3]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
  for (let i = 0; i <= 4; i++) {
    const y = paddingTop + (h * i) / 4;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, y);
    ctx.lineTo(paddingLeft + w, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Gradient fill under line
  if (points.length > 1) {
    const gradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + h);
    // Parse color for gradient
    let r = 31, g = 118, b = 192; // Default blue

    if (lineColor.startsWith("#")) {
      const hex = lineColor.replace("#", "");
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (lineColor.startsWith("rgb")) {
      const sep = lineColor.indexOf(",") > -1 ? "," : " ";
      const parts = lineColor.substring(4).split(")")[0].split(sep);
      if (parts.length >= 3) {
        r = parseInt(parts[0].trim());
        g = parseInt(parts[1].trim());
        b = parseInt(parts[2].trim());
      }
    }

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.25)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.02)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(xAt(0), paddingTop + h);
    points.forEach((p, i) => {
      ctx.lineTo(xAt(i), yAt(p.value));
    });
    ctx.lineTo(xAt(points.length - 1), paddingTop + h);
    ctx.closePath();
    ctx.fill();
  }

  // Main line
  ctx.lineWidth = 2;
  ctx.strokeStyle = lineColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.value);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Data points
  points.forEach((p, i) => {
    const x = xAt(i);
    const y = yAt(p.value);

    // White background
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Colored border
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.stroke();
  });

  // Y-axis labels
  ctx.fillStyle = "#6b7280";
  ctx.font = "500 10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(String(maxV), paddingLeft - 6, paddingTop + 4);
  ctx.fillText(String(minV), paddingLeft - 6, paddingTop + h + 4);

  // Chart title/label
  ctx.fillStyle = lineColor;
  ctx.font = "600 10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(opts?.yLabel || "", paddingLeft, paddingTop - 8);

  // X-axis labels
  ctx.fillStyle = "#9ca3af";
  ctx.font = "500 9px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";

  if (points.length <= 8) {
    points.forEach((p, i) => {
      ctx.fillText(p.label, xAt(i), paddingTop + h + 16);
    });
  } else {
    // Show only first, middle, last
    const indices = [0, Math.floor(points.length / 2), points.length - 1];
    indices.forEach((i) => {
      ctx.fillText(points[i].label, xAt(i), paddingTop + h + 16);
    });
  }
}


function BarsTable({ title, icon: Icon, rows, valueKey = "count" }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey] || 0)), 1);
  return (
    <div className="admin-panel">
      <div className="admin-chatbot__bars-header">
        {Icon && <Icon className="admin-chatbot__bars-icon" />}
        <h3 className="admin-chatbot__bars-title">{title}</h3>
      </div>
      <div className="admin-chatbot__bars-list">
        {rows.length === 0 ? (
          <div className="admin-chatbot__bars-empty">Chưa có dữ liệu</div>
        ) : (
          rows.map((r, idx) => {
            const v = Number(r[valueKey] || 0);
            const pct = Math.round((v / max) * 100);
            return (
              <div key={idx} className="admin-chatbot__bars-row">
                <div className="admin-chatbot__bars-content">
                  <div className="admin-chatbot__bars-label">
                    {r.label || r.keyword || r.question || r.name || "N/A"}
                  </div>
                  <div className="admin-chatbot__bars-track">
                    <div className="admin-chatbot__bars-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="admin-chatbot__bars-value">{v}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
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
    drawLineChart(sessionsCanvasRef.current, pts1.length ? pts1 : [{ label: "", value: 0 }], {
      yLabel: "Sessions",
      color: "#1f76c0"
    });

    const pts2 = (timeseries || []).map((x) => ({
      label: (x.date || x.day || "").toString().slice(5),
      value: Number(x.noResult ?? x.noResultCount ?? 0),
    }));
    drawLineChart(noResultCanvasRef.current, pts2.length ? pts2 : [{ label: "", value: 0 }], {
      yLabel: "NoResult",
      color: "#f47b20"
    });
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
    <div className="admin-chatbot">
      {/* Header Panel */}
      <section className="admin-panel">
        <div className="admin-chatbot__header">
          <div>
            <h2 className="admin-panel__title">Báo cáo Chatbot</h2>
            <p className="admin-panel__subtitle">
              Thống kê hoạt động của chatbot theo khoảng thời gian
            </p>
          </div>

          <div className="admin-chatbot__filters">
            <div className="admin-chatbot__filter-group">
              <label className="admin-chatbot__filter-label">Từ ngày</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="admin-form__input"
              />
            </div>

            <div className="admin-chatbot__filter-group">
              <label className="admin-chatbot__filter-label">Đến ngày</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="admin-form__input"
              />
            </div>

            <button
              onClick={loadAll}
              disabled={loading}
              className="admin-btn admin-btn--primary"
              style={{ alignSelf: "flex-end" }}
            >
              <FaSync style={{ marginRight: 8 }} />
              {loading ? "Đang tải..." : "Tải dữ liệu"}
            </button>
          </div>
        </div>
      </section>

      {/* Error State */}
      {error && (
        <div className="admin-panel" style={{ borderColor: "#dc2626" }}>
          <div className="admin-chatbot__error">
            <strong>Lỗi:</strong> {error}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="admin-chatbot__stats-grid">
        <StatCard
          icon={FaComments}
          label="Tổng lượt chat"
          value={String(totalSessions)}
          color="linear-gradient(135deg, #1f76c0, #155390)"
        />
        <StatCard
          icon={FaEnvelope}
          label="Tổng tin nhắn"
          value={String(totalMessages)}
          color="linear-gradient(135deg, #10b981, #059669)"
        />
        <StatCard
          icon={FaClock}
          label="Độ trễ trung bình"
          value={`${Number(avgLatencyMs).toFixed(0)} ms`}
          color="linear-gradient(135deg, #f59e0b, #d97706)"
        />
        <StatCard
          icon={FaMousePointer}
          label="CTR sản phẩm"
          value={`${Number(ctr).toFixed(2)}%`}
          sub="Click / Sessions"
          color="linear-gradient(135deg, #8b5cf6, #7c3aed)"
        />
      </div>

      {/* Charts Grid */}
      <div className="admin-chatbot__charts-grid">
        <div className="admin-panel">
          <h3 className="admin-chatbot__chart-title">Sessions theo ngày</h3>
          <div className="admin-chatbot__chart-container">
            <canvas ref={sessionsCanvasRef} className="admin-chatbot__chart-canvas" />
          </div>
        </div>

        <div className="admin-panel">
          <h3 className="admin-chatbot__chart-title">NoResult theo ngày</h3>
          <div className="admin-chatbot__chart-container">
            <canvas ref={noResultCanvasRef} className="admin-chatbot__chart-canvas" />
          </div>
        </div>
      </div>

      {/* Rate Stats */}
      <div className="admin-chatbot__rates-grid">
        <div className="admin-panel">
          <div className="admin-chatbot__rate">
            <span className="admin-chatbot__rate-label">Tỷ lệ trả lời từ FAQ</span>
            <span className="admin-chatbot__rate-value">{Number(faqRate).toFixed(2)}%</span>
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-chatbot__rate">
            <span className="admin-chatbot__rate-label">Tỷ lệ dùng tool</span>
            <span className="admin-chatbot__rate-value">{Number(toolRate).toFixed(2)}%</span>
          </div>
        </div>
        <div className="admin-panel">
          <div className="admin-chatbot__rate">
            <span className="admin-chatbot__rate-label">Tỷ lệ không có sản phẩm</span>
            <span className="admin-chatbot__rate-value" style={{ color: "#dc2626" }}>{Number(noResultRate).toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="admin-chatbot__tops-grid">
        <BarsTable
          title="Top câu hỏi"
          icon={FaQuestion}
          rows={topQuestions.map((x) => ({ ...x, label: x.question || x.label }))}
          valueKey="count"
        />
        <BarsTable
          title="Top keyword"
          icon={FaKey}
          rows={topKeywords.map((x) => ({ ...x, label: x.keyword || x.label }))}
          valueKey="count"
        />
        <BarsTable
          title="Top sản phẩm được click"
          icon={FaShoppingCart}
          rows={topClicked.map((x) => ({ ...x, label: x.name || x.productName || x.label }))}
          valueKey="count"
        />
      </div>
    </div>
  );
}
