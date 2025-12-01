import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import {
  PROJECT_STATUSES,
  formatBudget,
  formatBudgetCompact,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
  formatNumber,
} from "./projectHelpers";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProjectAPI.getAll({ Page: 1, PageSize: 100, Sort: "-CreatedAt" });
      const body = res || {};
      const pageData = body.data || {};
      setProjects(pageData.items || []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Bạn có chắc muốn xóa dự án này?");
    if (!confirmed) return;

    try {
      await ProjectAPI.remove(id);
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không thể xóa dự án");
    }
  };

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesTerm =
        !term ||
        project.name?.toLowerCase().includes(term) ||
        project.code?.toLowerCase().includes(term) ||
        project.customerName?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;

      return matchesTerm && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const metrics = useMemo(() => {
    if (!projects.length) {
      return { total: 0, active: 0, completed: 0, budget: 0 };
    }

    const total = projects.length;
    const active = projects.filter((p) => p.status === "InProgress").length;
    const completed = projects.filter((p) => p.status === "Done").length;
    const budget = projects.reduce(
      (sum, project) => sum + (typeof project.budget === "number" ? project.budget : 0),
      0,
    );

    return { total, active, completed, budget };
  }, [projects]);

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Dự án</h1>
            <p className="page-subtitle">
              Theo dõi tình trạng, giá trị dự án và tiến độ giao hàng ở một nơi.
            </p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={load}>
              Làm mới
            </button>
            <Link to="/projects/create" className="btn btn-primary">
              + Tạo dự án
            </Link>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">Tổng dự án</div>
            <div className="metric-value">{formatNumber(projects.length) || "0"}</div>
            <div className="metric-trend">
              Đang hoạt động: {formatNumber(metrics.active) || "0"}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Hoàn thành</div>
            <div className="metric-value">{formatNumber(metrics.completed) || "0"}</div>
            <div className="metric-trend">Dự án đã bàn giao</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">Giá trị dự án</div>
            <div className="metric-value">{formatBudgetCompact(metrics.budget, "vi")}</div>
            <div className="metric-trend">Tổng giá trị của các dự án</div>
          </article>
        </section>

        <div className="project-actions">
          <input
            type="search"
            className="input"
            placeholder="Tìm theo tên, mã hoặc khách hàng"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Tìm dự án"
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Lọc trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {getStatusLabel(status.value)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">Đang tải dự án...</div>
        ) : filteredProjects.length ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Khách hàng</th>
                  <th>Trạng thái</th>
                  <th>Tiến độ</th>
                  <th>Giá trị dự án</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
                  <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link to={`/projects/${project.id}`} className="link">
                        {project.code}
                      </Link>
                    </td>
                    <td>{project.name}</td>
                    <td>{project.customerName || "-"}</td>
                    <td>
                      <span className={getStatusBadgeClass(project.status)}>
                        <span className="badge-dot" />
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td>
                      {project.startDate
                        ? `${formatDate(project.startDate, "vi")} - ${formatDate(project.endDate, "vi")}`
                        : "-"}
                    </td>
                    <td>{formatBudget(project.budget, "vi")}</td>
                    <td className="table-actions">
                      <div className="table-actions__buttons">
                        <Link to={`/projects/${project.id}`} className="btn btn-ghost btn-sm">
                          Xem
                        </Link>
                        <Link to={`/projects/${project.id}/edit`} className="btn btn-outline btn-sm">
                          Chỉnh sửa
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDelete(project.id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">Chưa có dự án</div>
            <div className="empty-state-subtitle">
              Tạo dự án đầu tiên để theo dõi mốc thời gian, giá trị dự án và tiến độ giao hàng.
            </div>
            <Link to="/projects/create" className="btn btn-primary">
              Tạo dự án
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}