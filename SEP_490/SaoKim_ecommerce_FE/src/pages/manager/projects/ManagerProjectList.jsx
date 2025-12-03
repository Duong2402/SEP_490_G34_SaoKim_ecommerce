import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectAPI } from "../../../api/ProjectManager/projects";

const STATUS_LABELS = {
  Draft: "Nháp",
  Active: "Đang triển khai",
  Done: "Hoàn thành",
  Cancelled: "Đã hủy",
};

export default function ManagerProjectList() {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      Keyword: q || undefined,
      Status: status || undefined,
      Sort: sort,
      Page: page,
      PageSize: pageSize,
    }),
    [q, status, sort, page, pageSize]
  );

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ProjectAPI.getAll(params);
      const pageData = res?.data || {};
      const items = pageData.items ?? [];
      const totalItems = pageData.totalItems ?? pageData.total ?? 0;
      setRows(Array.isArray(items) ? items : []);
      setTotal(Number(totalItems) || 0);
    } catch (error) {
      console.error(error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Quản lý dự án</h2>
          <p className="manager-panel__subtitle">
            Theo dõi tiến độ, giá trị dự án và trạng thái của từng dự án khách hàng.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button type="button" className="manager-btn manager-btn--outline" onClick={loadProjects}>
            Làm mới
          </button>
          <button
            type="button"
            className="manager-btn manager-btn--primary"
            onClick={() => navigate("/manager/projects/create")}
          >
            + Tạo dự án
          </button>
        </div>
      </div>

      <div className="manager-filters">
        <input
          className="manager-input"
          placeholder="Tìm theo mã, tên hoặc khách hàng"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="manager-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Nháp</option>
          <option value="Active">Đang triển khai</option>
          <option value="Done">Hoàn thành</option>
          <option value="Cancelled">Đã hủy</option>
        </select>

        <select
          className="manager-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="created_desc">Mới nhất</option>
          <option value="created_asc">Cũ nhất</option>
          <option value="name_asc">Tên A-Z</option>
          <option value="name_desc">Tên Z-A</option>
        </select>

        <label style={{ marginLeft: "auto", fontSize: 14, color: "var(--manager-muted)" }}>
          Mỗi trang
        </label>
        <select
          className="manager-select"
          style={{ width: 90 }}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="manager-table__wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã dự án</th>
              <th>Tên dự án</th>
              <th>Khách hàng</th>
              <th>Trạng thái</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Giá trị dự án</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="manager-table__empty" colSpan={9}>
                  Đang tải dữ liệu dự án...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="manager-table__empty" colSpan={9}>
                  Không có dự án phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((project, idx) => (
                <tr key={project.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <Link to={`/manager/projects/${project.id}`}>{project.code}</Link>
                  </td>
                  <td>{project.name}</td>
                  <td>{project.customerName ?? project.customer ?? "-"}</td>
                  <td>
                    <StatusBadge value={project.status} />
                  </td>
                  <td>
                    {project.startDate
                      ? new Date(project.startDate).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>
                  <td>
                    {project.endDate
                      ? new Date(project.endDate).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>
                  <td>{project.budget?.toLocaleString("vi-VN") ?? "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/manager/projects/${project.id}/edit`} className="manager-btn manager-btn--outline">
                      Chỉnh sửa
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="manager-pagination">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Trước
        </button>
        <span>
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </button>
        <span>{total.toLocaleString("vi-VN")} dự án</span>
      </div>
    </div>
  );
}

function StatusBadge({ value }) {
  if (!value) return "-";
  const label = STATUS_LABELS[value] ?? value;
  let className = "manager-status";
  if (value === "Draft") className += " manager-status--pending";
  if (value === "Cancelled") className += " manager-status--danger";
  if (value === "Active") className += " manager-status--pending";
  return (
    <span className={className}>
      <span className="manager-status__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
