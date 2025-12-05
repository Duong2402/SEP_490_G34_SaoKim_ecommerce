import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import { formatBudget, formatDate } from "./projectHelpers";

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await ProjectAPI.getAll({ q: search || undefined, status: statusFilter });
      const body = res?.data || res || {};
      setProjects(body.items || body.data?.items || body.data || []);
    } catch (err) {
      console.error(err);
      setError("Không tải được danh sách dự án.");
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
          </div>
        </header>

        <div className="filters">
          <input
            className="pm-input"
            placeholder="Tìm theo tên, mã dự án hoặc khách hàng"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="pm-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Draft">Nháp</option>
            <option value="InProgress">Đang triển khai</option>
            <option value="Done">Hoàn tất</option>
            <option value="Delivered">Đã bàn giao</option>
          </select>
        </div>

        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Tổng dự án</div>
            <div className="summary-value">{metrics.total}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Đang triển khai</div>
            <div className="summary-value">{metrics.active}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Hoàn tất</div>
            <div className="summary-value">{metrics.completed}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Tổng ngân sách</div>
            <div className="summary-value">{formatBudget(metrics.budget)}</div>
          </div>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        {loading ? (
          <div className="loading-state">Đang tải dự án...</div>
        ) : filteredProjects.length ? (
          <div className="pm-table__wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên dự án</th>
                  <th>Khách hàng</th>
                  <th>Ngày bắt đầu</th>
                  <th>Ngày kết thúc</th>
                  <th>Ngân sách</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>{project.code || "-"}</td>
                    <td>{project.name}</td>
                    <td>{project.customerName || "-"}</td>
                    <td>{project.startDate ? formatDate(project.startDate, "vi") : "-"}</td>
                    <td>{project.endDate ? formatDate(project.endDate, "vi") : "-"}</td>
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
                          onClick={() => alert("Không được phép xóa dự án từ tài khoản PM")}
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
              Hiện chưa có dự án nào được gán cho bạn.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
