// src/pages/manager/employees/ManagerEmployeeList.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ManagerEmployeeAPI } from "../../../api/manager-employees";

const STATUS_LABELS = {
  Active: "Đang làm việc",
  Inactive: "Tạm ngưng",
  Suspended: "Đình chỉ",
};

export default function ManagerEmployeeList() {
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        q: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
      };
      const data = await ManagerEmployeeAPI.getAll(params);
      const allItems = data?.items ?? [];
      // Filter out Customer, Admin, Manager
      const filteredItems = allItems.filter((emp) => {
        const r = (emp.role || "").toLowerCase();
        return !["customer", "admin", "manager"].includes(r);
      });
      setEmployees(filteredItems);
      setTotalItems(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 0);
    } catch (err) {
      console.error("Failed to load employees:", err);
      setEmployees([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, roleFilter]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const data = await ManagerEmployeeAPI.getRoles();
        const allRoles = Array.isArray(data) ? data : [];
        setRoles(
          allRoles.filter(
            (r) => !["customer", "admin", "manager"].includes((r.name || "").toLowerCase())
          )
        );
      } catch (err) {
        console.error("Failed to load roles:", err);
        setRoles([]);
      }
    };
    loadRoles();
  }, []);

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.valueOf())) return "-";
    return d.toLocaleDateString("vi-VN");
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhân sự này?")) return;
    try {
      await ManagerEmployeeAPI.remove(id);
      alert("Đã xóa nhân sự.");
      loadEmployees();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể xóa nhân sự.";
      alert(msg);
    }
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Nhân sự</h2>
          <p className="manager-panel__subtitle">
            Giám sát hồ sơ, trạng thái làm việc và phân quyền đội ngũ Sao Kim.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button type="button" className="manager-btn manager-btn--outline" onClick={loadEmployees}>
            Làm mới
          </button>
          <Link to="/manager/employees/create" className="manager-btn manager-btn--primary">
            + Thêm nhân sự
          </Link>
        </div>
      </div>

      <div className="manager-filters">
        <input
          className="manager-input"
          type="search"
          placeholder="Tìm theo tên hoặc email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <select
          className="manager-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="Active">Đang làm việc</option>
          <option value="Inactive">Tạm ngưng</option>
          <option value="Suspended">Đình chỉ</option>
        </select>

        <select
          className="manager-select"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả vai trò</option>
          {roles.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="manager-empty">Đang tải danh sách nhân sự...</div>
      ) : employees.length ? (
        <>
          <div className="manager-table__wrapper">
            <table className="manager-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Điện thoại</th>
                  <th>Ngày tạo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td>{emp.id}</td>
                    <td>{emp.name}</td>
                    <td>{emp.email || "-"}</td>
                    <td>{emp.role || "-"}</td>
                    <td>
                      <StatusPill status={emp.status} />
                    </td>
                    <td>{emp.phone || emp.phoneNumber || "-"}</td>
                    <td>{formatDate(emp.createdAt)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <Link
                          to={`/manager/employees/${emp.id}/edit`}
                          className="manager-btn manager-btn--outline"
                        >
                          Chỉnh sửa
                        </Link>
                        <button
                          type="button"
                          className="manager-btn manager-btn--outline"
                          style={{ color: "#d64a4a", borderColor: "rgba(214,74,74,0.4)" }}
                          onClick={() => handleDelete(emp.id)}
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

          {totalPages > 1 && (
            <div className="manager-pagination">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Trước
              </button>
              <span>
                Trang {page} / {totalPages} (Tổng {totalItems} nhân sự)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Sau
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="manager-empty">
          {search || statusFilter !== "all" || roleFilter !== "all"
            ? "Không tìm thấy nhân sự phù hợp với bộ lọc."
            : "Bắt đầu bằng cách tạo mới một hồ sơ nhân sự."}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  if (!status) return "-";
  let className = "manager-status";
  if (status === "Inactive" || status === "Suspended") {
    className += status === "Suspended" ? " manager-status--danger" : " manager-status--pending";
  }
  return (
    <span className={className}>
      <span className="manager-status__dot" aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
