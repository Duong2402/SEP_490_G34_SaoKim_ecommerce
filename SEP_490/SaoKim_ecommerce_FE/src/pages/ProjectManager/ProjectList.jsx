import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import {
  PROJECT_STATUSES,
  formatBudget,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
} from "./projectHelpers";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statusOptions = useMemo(
    () => [{ value: "all", label: "Tất cả trạng thái" }, ...PROJECT_STATUSES],
    [],
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        q: search || undefined,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      };
      const res = await ProjectAPI.getAll(params);
      const body = res?.data || res || {};
      setProjects(body.items || body.data?.items || body.data || []);
    } catch (err) {
      console.error(err);
      setError("Không thể tải danh sách dự án.");
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return (projects || []).filter((project) => {
      const term = search.trim().toLowerCase();
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
    const total = projects.length;
    const active = projects.filter((p) => p.status === "InProgress" || p.status === "Active").length;
    const completed = projects.filter((p) => p.status === "Done" || p.status === "Delivered").length;
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
            <h1 className="page-title">Danh sách dự án</h1>
            <p className="page-subtitle">
              Theo dõi tình trạng, giá trị dự án và tiến độ giao hàng ở một nơi.
            </p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={load}>
              Làm mới
            </button>
          </div>
        </header>

        <div className="filters-row">
          <input
            className="input"
            placeholder="Tìm theo tên, mã dự án hoặc khách hàng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">Tổng dự án</div>
            <div className="metric-value">{metrics.total}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Đang triển khai</div>
            <div className="metric-value">{metrics.active}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Hoàn tất</div>
            <div className="metric-value">{metrics.completed}</div>
          </article>
          <article className="metric-card">
            <div className="metric-label">Tổng ngân sách</div>
            <div className="metric-value">{formatBudget(metrics.budget)}</div>
          </article>
        </section>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="loading-state">Đang tải dự án...</div>
        ) : filteredProjects.length ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên dự án</th>
                  <th>Khách hàng</th>
                  <th className="table-nowrap">Ngày bắt đầu</th>
                  <th className="table-nowrap">Ngày kết thúc</th>
                  <th>Trạng thái</th>
                  <th>Ngân sách</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="table-code">
                      {project.id ? (
                        <Link to={`/projects/${project.id}`} className="link">
                          {project.code || "-"}
                        </Link>
                      ) : (
                        project.code || "-"
                      )}
                    </td>
                    <td>{project.name}</td>
                    <td>{project.customerName || "-"}</td>
                    <td className="table-nowrap">
                      {project.startDate ? formatDate(project.startDate, "vi") : "-"}
                    </td>
                    <td className="table-nowrap">
                      {project.endDate ? formatDate(project.endDate, "vi") : "-"}
                    </td>
                    <td>
                      <span className={getStatusBadgeClass(project.status)}>
                        <span className="badge-dot" />
                        {getStatusLabel(project.status)}
                      </span>
                    </td>
                    <td>{formatBudget(project.budget, "vi")}</td>
                    <td className="table-actions">
                      <Link to={`/projects/${project.id}`} className="btn btn-ghost btn-sm">
                        Xem
                      </Link>
                      <Link to={`/projects/${project.id}/edit`} className="btn btn-outline btn-sm">
                        Chỉnh sửa
                      </Link>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => alert("Không được phép xóa dự án từ tài khoản PM")}
                      >
                        Xóa
                      </button>
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
              Hiện chưa có dự án nào được gán cho bạn.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
