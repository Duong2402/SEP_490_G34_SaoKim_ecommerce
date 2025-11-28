import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import { formatBudget, formatDate, getStatusBadgeClass, getStatusLabel } from "./projectHelpers";

export default function ProjectOverview() {
  const { t, lang, formatNumber } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await ProjectAPI.getAll({ Page: 1, PageSize: 200, Sort: "-CreatedAt" });
        const body = res || {};
        const page = body.data || {};
        if (mounted) setProjects(page.items || []);
      } catch (err) {
        console.error(err);
        if (mounted) setProjects([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const total = projects.length;
    const draft = projects.filter((p) => p.status === "Draft").length;
    const inProgress = projects.filter((p) => p.status === "InProgress").length;
    const delivered = projects.filter((p) => p.status === "Delivered" || p.status === "Done").length;
    const budget =
      projects.reduce((sum, p) => sum + (typeof p.budget === "number" ? p.budget : 0), 0) || 0;
    const today = dayjs();
    const overdue = projects.filter(
      (p) => p.endDate && dayjs(p.endDate).isBefore(today, "day") && p.status !== "Done",
    ).length;
    return { total, draft, inProgress, delivered, budget, overdue };
  }, [projects]);

  const topRisks = useMemo(() => {
    const today = dayjs();
    return [...projects]
      .filter((p) => p.endDate && dayjs(p.endDate).isBefore(today, "day") && p.status !== "Done")
      .slice(0, 5);
  }, [projects]);

  const latestProjects = useMemo(() => [...projects].slice(0, 5), [projects]);

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Tổng quan dự án</h1>
            <p className="page-subtitle">
              Đánh nhanh sức khỏe danh mục, tiến độ và dòng tiền dự án.
            </p>
          </div>
          <div className="actions">
            <Link to="/projects/create" className="btn btn-primary">
              + Tạo dự án
            </Link>
            <Link to="/projects" className="btn btn-outline">
              Danh sách
            </Link>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">Tổng dự án</div>
            <div className="metric-value">{formatNumber(metrics.total) || "0"}</div>
            <div className="metric-trend">Đang chạy: {formatNumber(metrics.inProgress) || "0"}</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Đang triển khai</div>
            <div className="metric-value">{formatNumber(metrics.inProgress) || "0"}</div>
            <div className="metric-trend">
              Nháp: {formatNumber(metrics.draft) || "0"} • Hoàn tất:{" "}
              {formatNumber(metrics.delivered) || "0"}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Giá trị dự án kế hoạch</div>
            <div className="metric-value">{formatBudget(metrics.budget, lang)}</div>
            <div className="metric-trend">
              {formatNumber(metrics.overdue) || "0"} dự án có nguy cơ quá hạn
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Rủi ro</div>
            <div className="metric-value">{formatNumber(metrics.overdue) || "0"}</div>
            <div className="metric-trend">Đã quá hạn nhưng chưa hoàn thành</div>
          </article>
        </section>

        <div className="manager-grid-two">
          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h3 className="manager-panel__title">Dự án có rủi ro</h3>
                <p className="manager-panel__subtitle">
                  Quá hạn hoặc ưu tiên cao cần xử lý ngay.
                </p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : topRisks.length ? (
              <div className="manager-table__wrapper">
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Mã</th>
                      <th>Tên</th>
                      <th>Thời hạn</th>
                      <th>Trạng thái</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRisks.map((p) => (
                      <tr key={p.id}>
                        <td>{p.code || "-"}</td>
                        <td>{p.name}</td>
                        <td>{formatDate(p.endDate, lang)}</td>
                        <td>
                          <span className={getStatusBadgeClass(p.status)}>
                            <span className="badge-dot" />
                            {getStatusLabel(p.status, t)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link className="btn btn-outline btn-sm" to={`/projects/${p.id}`}>
                            Xem
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">Không có rủi ro nào</div>
                <div className="empty-state-subtitle">Tất cả dự án đang trong tầm kiểm soát.</div>
              </div>
            )}
          </section>

          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h3 className="manager-panel__title">Dự án mới cập nhật</h3>
                <p className="manager-panel__subtitle">Hoạt động gần đây nhất.</p>
              </div>
            </div>
            {loading ? (
              <div className="loading-state">Đang tải...</div>
            ) : latestProjects.length ? (
              <ul className="list" style={{ padding: 0, margin: 0, listStyle: "none" }}>
                {latestProjects.map((p) => (
                  <li
                    key={p.id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid var(--pm-border)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>{p.name}</strong>
                      <div style={{ color: "var(--pm-muted)", fontSize: 13 }}>
                        Mã: {p.code || "-"} • Khách: {p.customerName || "Chưa có"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className={getStatusBadgeClass(p.status)} style={{ display: "inline-flex" }}>
                        <span className="badge-dot" />
                        {getStatusLabel(p.status, t)}
                      </div>
                      <div style={{ color: "var(--pm-muted)", fontSize: 13 }}>
                        Hạn: {formatDate(p.endDate, lang)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">Chưa có dữ liệu</div>
                <div className="empty-state-subtitle">Hãy tạo dự án đầu tiên.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
