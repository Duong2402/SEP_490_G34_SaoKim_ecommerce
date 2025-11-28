import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import {
  formatBudget,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
  formatNumber,
} from "./projectHelpers";

export default function ProjectReport() {
  const { id } = useParams();
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
      } catch (e) {
        console.error(e);
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
    } catch (e) {
      console.error(e);
      alert("Xuất PDF thất bại.");
    }
  };

  if (loading) {
    return (
      <div className="pm-page">
        <div className="panel">Đang tải báo cáo...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="pm-page">
        <div className="panel empty-state">
          <div className="empty-state-title">Không tìm thấy báo cáo</div>
          <div className="empty-state-subtitle">
            Vui lòng kiểm tra lại dự án hoặc thử tải lại trang.
          </div>
          <Link to={`/projects/${id}`} className="btn btn-primary">
            Quay lại chi tiết dự án
          </Link>
        </div>
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
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Báo cáo dự án</h1>
            <p className="page-subtitle">
              #{code || "-"} - {name} {customerName ? `· ${customerName}` : ""}
            </p>
          </div>
          <div className="actions">
            <button className="btn btn-outline" onClick={handleExportPdf}>
              Xuất PDF
            </button>
            <Link to={`/projects/${id}`} className="btn">
              Chi tiết
            </Link>
            <Link to={`/projects/${id}/edit`} className="btn btn-primary">
              Cập nhật
            </Link>
          </div>
        </header>

        <div className="project-overview__grid" style={{ marginBottom: 12 }}>
          <article className="project-overview__card">
            <div className="project-overview__label">Trạng thái</div>
            <div className="project-overview__value">
              <span className={getStatusBadgeClass(status)}>
                <span className="badge-dot" />
                {getStatusLabel(status)}
              </span>
            </div>
            <div className="project-overview__description">
              {formatDate(startDate)} - {formatDate(endDate)}
            </div>
          </article>

          <article className="project-overview__card">
            <div className="project-overview__label">Giá trị dự án kế hoạch</div>
            <div className="project-overview__value">{formatBudget(budget)}</div>
            <div className="project-overview__description">Giá trị dự án được duyệt.</div>
          </article>

          <article className="project-overview__card">
            <div className="project-overview__label">Mức hoàn thành</div>
            <div className="project-overview__value">{progressPercent}%</div>
            <div className="project-overview__description">
              {formatNumber(taskCompleted)} hoàn thành · {formatNumber(taskActive)} đang làm ·{" "}
              {formatNumber(taskDelayed)} trễ.
            </div>
          </article>
        </div>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">Doanh thu (sản phẩm)</div>
            <div className="metric-value">{formatBudget(totalProductAmount)}</div>
            <div className="metric-trend">Tổng thành tiền sản phẩm</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Chi phí khác</div>
            <div className="metric-value">{formatBudget(totalOtherExpenses)}</div>
            <div className="metric-trend">Chi phí vận hành/triển khai</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Thực chi (tổng)</div>
            <div className="metric-value">{formatBudget(actualAllIn)}</div>
            <div className="metric-trend">
              Sản phẩm {formatBudget(totalProductAmount)} + Chi phí {formatBudget(totalOtherExpenses)}
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Chênh lệch</div>
            <div
              className="metric-value"
              style={{ color: variance < 0 ? "#dc2626" : "#16a34a" }}
            >
              {formatBudget(variance)}
            </div>
            <div className="metric-trend">
              {variance < 0 ? "Vượt giá trị dự án" : "Còn trong giá trị dự án"}
            </div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Lợi nhuận (ước tính)</div>
            <div className="metric-value" style={{ color: profitApprox < 0 ? "#dc2626" : undefined }}>
              {formatBudget(profitApprox)}
            </div>
            <div className="metric-trend">Doanh thu - Chi phí</div>
          </article>
        </section>

        <section className="panel" style={{ marginTop: 16 }}>
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">Vấn đề & cột mốc</h2>
              <p className="project-section-subtitle">
                Các công việc chậm tiến độ và mục cần chú ý.
              </p>
            </div>
          </div>

          {Array.isArray(issues) && issues.length ? (
            <ul className="list">
              {issues.map((item, idx) => (
                <li key={idx} className="list-item">
                  <span className="badge-dot" style={{ background: "#f87171", marginRight: 8 }} />
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Không có vấn đề nào</div>
              <div className="empty-state-subtitle">Tất cả mục đang đúng tiến độ.</div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
