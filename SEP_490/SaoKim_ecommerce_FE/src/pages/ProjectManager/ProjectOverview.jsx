import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { ProjectAPI, TaskAPI } from "../../api/ProjectManager/projects";
import { formatBudget, formatDate, getStatusBadgeClass, getStatusLabel, formatNumber } from "./projectHelpers";

export default function ProjectOverview() {
  const [projects, setProjects] = useState([]);
  const [enrichedProjects, setEnrichedProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const loadRisk = async () => {
      if (!projects.length) {
        setEnrichedProjects([]);
        return;
      }
      setLoadingRisk(true);
      try {
        const result = await Promise.all(
          projects.map(async (p) => {
            try {
              const res = await TaskAPI.list(p.id);
              const payload = res?.data ?? res ?? {};
              const items = payload.items ?? payload;
              const tasks = Array.isArray(items) ? items : [];

              const hasDelayed = tasks.some((task) => {
                const status = task.status || task.overallStatus;
                if (status === "Delayed") return true;
                if (Array.isArray(task.days) && task.days.length) {
                  const last = [...task.days].sort((a, b) => (a.date || "").localeCompare(b.date || "")).at(-1);
                  if (last?.status === "Delayed" || last?.Status === "Delayed") return true;
                }
                return false;
              });

              const overdue =
                p.endDate && dayjs(p.endDate).isBefore(dayjs(), "day") && p.status !== "Done" && p.status !== "Delivered";

              return { ...p, _hasDelayed: hasDelayed, _overdue: overdue, _risk: hasDelayed || overdue };
            } catch (err) {
              console.error("load risk for project failed", p.id, err);
              return { ...p, _hasDelayed: false, _overdue: false, _risk: false };
            }
          }),
        );
        if (mounted) setEnrichedProjects(result);
      } finally {
        if (mounted) setLoadingRisk(false);
      }
    };
    loadRisk();
    return () => {
      mounted = false;
    };
  }, [projects]);

  const sourceProjects = enrichedProjects.length ? enrichedProjects : projects;

  const metrics = useMemo(() => {
    const total = sourceProjects.length;
    const draft = sourceProjects.filter((p) => p.status === "Draft").length;
    const inProgress = sourceProjects.filter((p) => p.status === "InProgress" || p.status === "Active").length;
    const delivered = sourceProjects.filter((p) => p.status === "Delivered" || p.status === "Done").length;
    const budget =
      sourceProjects.reduce((sum, p) => sum + (typeof p.budget === "number" ? p.budget : 0), 0) || 0;

    const riskProjects = sourceProjects.filter((p) => p._risk);

    return {
      total,
      draft,
      inProgress,
      delivered,
      budget,
      overdue: riskProjects.length,
      riskProjects,
    };
  }, [sourceProjects]);

  const topRisks = useMemo(() => {
    return [...(metrics.riskProjects || [])].slice(0, 5);
  }, [metrics.riskProjects]);

  const latestProjects = useMemo(() => [...sourceProjects].slice(0, 5), [sourceProjects]);

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Tổng quan dự án</h1>
            <p className="page-subtitle">Đánh nhanh sức khỏe danh mục, tiến độ và dòng tiền dự án.</p>
          </div>
          <div className="actions">
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
              Nháp: {formatNumber(metrics.draft) || "0"} - Hoàn tất: {formatNumber(metrics.delivered) || "0"}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Giá trị các dự án</div>
            <div className="metric-value">{formatBudget(metrics.budget)}</div>
            <div className="metric-trend">Tổng giá trị các dự án theo kế hoạch</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Rủi ro</div>
            <div className="metric-value">{formatNumber(metrics.overdue) || "0"}</div>
            <div className="metric-trend">Trễ hạn hoặc có công việc trễ hạn</div>
          </article>
        </section>

        <div className="manager-grid-two">
          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h3 className="manager-panel__title">Dự án có rủi ro</h3>
                <p className="manager-panel__subtitle">Dự án trễ hạn hoặc có công việc trễ hạn cần xử lý ngay.</p>
              </div>
            </div>
            {loading || loadingRisk ? (
              <div className="loading-state">Đang tải...</div>
            ) : topRisks.length ? (
              <div className="manager-table__wrapper table-responsive">
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
                        <td>{formatDate(p.endDate)}</td>
                        <td>
                          <span className={getStatusBadgeClass(p.status)}>
                            <span className="badge-dot" />
                            {getStatusLabel(p.status)}
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
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <strong>{p.name}</strong>
                      <div style={{ color: "var(--pm-muted)", fontSize: 13 }}>
                        Mã: {p.code || "-"} | Khách: {p.customerName || "Chưa có"}
                      </div>
                    </div>
                    <div style={{ textAlign: "center", display: "grid", gap: 6, justifyItems: "center" }}>
                      <div style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span
                          className={getStatusBadgeClass(p.status)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span className="badge-dot" />
                          {getStatusLabel(p.status)}
                        </span>
                        <span style={{ fontSize: 13, color: "var(--pm-muted)" }}>
                          Hết hạn: {formatDate(p.endDate)}
                        </span>
                      </div>
                      <Link className="btn btn-outline btn-sm" to={`/projects/${p.id}`}>
                        Chi tiết
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <div className="empty-state-title">Chưa có dự án nào</div>
                <div className="empty-state-subtitle">Chưa có hoạt động gần đây.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
