import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectAPI } from "../../../api/ProjectManager/projects";

const STATUS_LABELS = {
  Draft: "Nháp",
  Active: "Đang triển khai",
  Done: "Hoàn thành",
  Cancelled: "Đã hủy",
};

const formatCurrency = (value) => {
  if (value == null) return "0 ₫";
  const num = Number(value);
  if (Number.isNaN(num)) return "0 ₫";
  return num.toLocaleString("vi-VN") + " ₫";
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "-";

export default function ManagerProjectReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await ProjectAPI.getReport(id);
        const body = res || {};
        if (mounted) setReport(body.data ?? body ?? null);
      } catch (err) {
        console.error(err);
        if (mounted) setReport(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [id]);

  const handleExportPdf = async () => {
    try {
      const blob = await ProjectAPI.getReportPdf(id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `ProjectReport_${report?.code || id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Xuất PDF thất bại.");
    }
  };

  if (loading) {
    return <div className="manager-panel manager-empty">Đang tải báo cáo...</div>;
  }

  if (!report) {
    return (
      <div className="manager-panel manager-empty">
        <div style={{ marginBottom: 8 }}>Không tìm thấy báo cáo dự án.</div>
        <Link to={`/manager/projects/${id}`} className="manager-btn manager-btn--primary">
          Quay lại chi tiết
        </Link>
      </div>
    );
  }

  const {
    code,
    name,
    customerName,
    status,
    startDate,
    endDate,
    budget,
    totalProductAmount,
    totalOtherExpenses,
    actualAllIn,
    variance,
    profitApprox,
    taskCompleted,
    taskDelayed,
    taskActive,
    progressPercent,
    issues,
  } = report;

  return (
    <div className="manager-section">
      <section className="manager-panel">
        <div className="manager-panel__header manager-overview__header">
          <div className="manager-overview__title">
            <p className="manager-panel__subtitle">Mã dự án: {code || id}</p>
            <h2 className="manager-panel__title">{name || "Báo cáo dự án"}</h2>
            <StatusBadge value={status} />
          </div>
          <div className="manager-panel__actions">
            <button
              type="button"
              className="manager-btn manager-btn--outline"
              onClick={() => navigate(`/manager/projects/${id}`)}
            >
              Chi tiết
            </button>
            <button
              type="button"
              className="manager-btn manager-btn--outline"
              onClick={() => navigate(`/manager/projects/${id}/edit`)}
            >
              Chỉnh sửa
            </button>
            <button type="button" className="manager-btn manager-btn--primary" onClick={handleExportPdf}>
              Xuất PDF
            </button>
          </div>
        </div>

        <div className="manager-overview-grid">
          <OverviewCard
            label="Thời gian"
            value={`${formatDate(startDate)} - ${formatDate(endDate)}`}
          />
          <OverviewCard label="Khách hàng" value={customerName || "-"} />
          <OverviewCard label="Giá trị dự án" value={formatCurrency(budget)} highlight />
          <OverviewCard label="Tiến độ" value={`${progressPercent ?? 0}%`} />
          <OverviewCard
            label="Công việc"
            value={`${taskCompleted ?? 0} hoàn thành • ${taskActive ?? 0} đang làm • ${
              taskDelayed ?? 0
            } trễ`}
          />
        </div>
      </section>

      <section className="manager-panel">
        <div className="manager-panel__header">
          <div>
            <h2 className="manager-panel__title">Tổng quan tài chính</h2>
            <p className="manager-panel__subtitle">Doanh thu, chi phí và chênh lệch.</p>
          </div>
        </div>

        <div className="manager-summary-grid">
          <article className="manager-card">
            <div className="manager-card__label">Doanh thu (sản phẩm)</div>
            <div className="manager-card__value">{formatCurrency(totalProductAmount)}</div>
            <div className="manager-card__hint">Tổng thành tiền sản phẩm</div>
          </article>
          <article className="manager-card">
            <div className="manager-card__label">Chi phí khác</div>
            <div className="manager-card__value">{formatCurrency(totalOtherExpenses)}</div>
            <div className="manager-card__hint">Vận hành / triển khai</div>
          </article>
          <article className="manager-card">
            <div className="manager-card__label">Thực chi (tổng)</div>
            <div className="manager-card__value">{formatCurrency(actualAllIn)}</div>
            <div className="manager-card__hint">
              Doanh thu {formatCurrency(totalProductAmount)} + Chi phí {formatCurrency(totalOtherExpenses)}
            </div>
          </article>
          <article className="manager-card">
            <div className="manager-card__label">Chênh lệch</div>
            <div
              className="manager-card__value"
              style={{ color: variance < 0 ? "#d94a4a" : "#195fa4" }}
            >
              {formatCurrency(variance)}
            </div>
            <div className="manager-card__hint">
              {variance < 0 ? "Vượt giá trị dự án" : "Còn trong giá trị dự án"}
            </div>
          </article>
          <article className="manager-card">
            <div className="manager-card__label">Lợi nhuận (ước tính)</div>
            <div
              className="manager-card__value"
              style={{ color: profitApprox < 0 ? "#d94a4a" : "#12497f" }}
            >
              {formatCurrency(profitApprox)}
            </div>
            <div className="manager-card__hint">Doanh thu - Chi phí</div>
          </article>
        </div>
      </section>

      <section className="manager-panel">
        <div className="manager-panel__header">
          <div>
            <h2 className="manager-panel__title">Rủi ro & cản trở</h2>
            <p className="manager-panel__subtitle">
              Các công việc chậm tiến độ và vấn đề cần xử lý.
            </p>
          </div>
        </div>
        {Array.isArray(issues) && issues.length ? (
          <ul style={{ margin: 0, paddingLeft: 18, color: "var(--manager-text)", lineHeight: 1.6 }}>
            {issues.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        ) : (
          <div className="manager-table__empty">Chưa có vấn đề nào được ghi nhận.</div>
        )}
      </section>
    </div>
  );
}

function StatusBadge({ value }) {
  if (!value) return null;
  let className = "manager-status";
  if (value === "Draft") className += " manager-status--pending";
  if (value === "Cancelled") className += " manager-status--danger";
  return (
    <span className={className} style={{ marginTop: 8, display: "inline-flex" }}>
      <span className="manager-status__dot" aria-hidden="true" />
      {STATUS_LABELS[value] ?? value}
    </span>
  );
}

function OverviewCard({ label, value, highlight = false }) {
  let className = "manager-overview-card";
  if (highlight) className += " manager-overview-card--highlight";
  return (
    <div className={className}>
      <div className="manager-overview-card__label">{label}</div>
      <div className="manager-overview-card__value">{value || "-"}</div>
    </div>
  );
}