import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserAPI } from "../../../api/users";
import { FaPlus, FaSync, FaEdit, FaBan, FaCheckCircle, FaSearch } from "react-icons/fa";
import "../../../styles/admin-users.css";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize,
        q: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
      };

      const res = await UserAPI.getAll(params);

      setUsers(res?.items ?? []);
      setTotalItems(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        const data = await UserAPI.getRoles();
        setRoles(Array.isArray(data) ? data : []);
      } catch { }
    })();
  }, []);

  const handleToggle = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      await UserAPI.setStatus(id, newStatus);
      await load();
    } catch (err) {
      alert(err?.response?.data?.message || "Không thể thay đổi trạng thái");
    }
  };

  const formatDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.valueOf()) ? "-" : d.toLocaleDateString("vi-VN");
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Active":
        return "badge badge-success";
      case "Inactive":
        return "badge badge-warning";
      case "Suspended":
        return "badge badge-danger";
      default:
        return "badge";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "Active":
        return "Hoạt động";
      case "Inactive":
        return "Không hoạt động";
      case "Suspended":
        return "Bị khóa";
      default:
        return status || "Hoạt động";
    }
  };

  const getRoleLabel = (role) => {
    const roleMap = {
      admin: "Quản trị viên",
      manager: "Quản lý",
      staff: "Nhân viên",
      warehouse_manager: "Quản lý kho",
      project_manager: "Quản lý dự án",
      customer: "Khách hàng",
    };
    return roleMap[role] || role || "-";
  };

  return (
    <div className="admin-users">
      <div className="admin-panel">
        <header className="admin-users__header">
          <div>
            <h2 className="admin-panel__title">Quản lý người dùng</h2>
            <p className="admin-panel__subtitle">
              Quản lý tài khoản và phân quyền người dùng trong hệ thống
            </p>
          </div>
          <div className="admin-users__actions">
            <button
              type="button"
              className="admin-btn admin-btn--outline"
              onClick={load}
              disabled={loading}
            >
              <FaSync style={{ marginRight: 8 }} />
              Làm mới
            </button>

            <Link to="/admin/users/create" className="admin-btn admin-btn--primary">
              <FaPlus style={{ marginRight: 8 }} />
              Thêm người dùng
            </Link>
          </div>
        </header>

        <div className="admin-users__filters">
          <div className="admin-users__search">
            <FaSearch className="admin-users__search-icon" />
            <input
              className="admin-users__input"
              type="search"
              placeholder="Tìm theo tên, email hoặc số điện thoại..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="admin-users__select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Hoạt động</option>
            <option value="Inactive">Không hoạt động</option>
            <option value="Suspended">Bị khóa</option>
          </select>

          <select
            className="admin-users__select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {getRoleLabel(r.name)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="admin-users__loading">Đang tải danh sách người dùng...</div>
        ) : users.length ? (
          <>
            <div className="admin-users__table-wrap">
              <table className="admin-users__table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tạo</th>
                    <th>Hành động</th>
                  </tr>
                </thead>

                <tbody>
                  {users
                    .slice()
                    .sort((a, b) => a.id - b.id)
                    .map((u) => (
                      <tr key={u.id}>
                        <td>{u.id}</td>

                        <td>
                          <Link className="admin-users__link" to={`/admin/users/${u.id}/edit`}>
                            {u.name}
                          </Link>
                        </td>

                        <td>{u.email || "-"}</td>
                        <td>{getRoleLabel(u.role)}</td>

                        <td>
                          <span className={getStatusBadgeClass(u.status)}>
                            {getStatusLabel(u.status)}
                          </span>
                        </td>

                        <td>{u.phone || "-"}</td>

                        <td>{formatDate(u.createdAt)}</td>

                        <td>
                          <div className="admin-users__row-actions">
                            <Link
                              to={`/admin/users/${u.id}/edit`}
                              className="admin-btn admin-btn--outline"
                            >
                              <FaEdit style={{ marginRight: 6 }} />
                              Sửa
                            </Link>

                            {u.status === "Active" ? (
                              <button
                                type="button"
                                className="admin-btn admin-btn--danger"
                                onClick={() => handleToggle(u.id, u.status)}
                              >
                                <FaBan style={{ marginRight: 6 }} />
                                Vô hiệu
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="admin-btn admin-btn--success"
                                onClick={() => handleToggle(u.id, u.status)}
                              >
                                <FaCheckCircle style={{ marginRight: 6 }} />
                                Kích hoạt
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="admin-users__pagination">
                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Trước
                </button>

                <span>
                  Trang {page} / {totalPages} (Tổng: {totalItems} người dùng)
                </span>

                <button
                  type="button"
                  className="admin-btn admin-btn--outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="admin-users__empty">
            <div className="admin-users__empty-title">Không tìm thấy người dùng</div>

            <div className="admin-users__empty-subtitle">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "Thử điều chỉnh bộ lọc của bạn"
                : "Bắt đầu bằng cách tạo người dùng mới"}
            </div>

            <Link to="/admin/users/create" className="admin-btn admin-btn--primary">
              <FaPlus style={{ marginRight: 8 }} />
              Thêm người dùng
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}