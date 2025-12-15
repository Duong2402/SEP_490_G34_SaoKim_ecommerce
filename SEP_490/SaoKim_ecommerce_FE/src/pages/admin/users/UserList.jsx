import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserAPI } from "../../../api/users";
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

  const handleToggle = async (id, currentStatus, role) => {
    if (role === "admin") {
      alert("Không thể thay đổi trạng thái tài khoản có vai trò Admin");
      return;
    }

    try {
      const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
      await UserAPI.setStatus(id, newStatus);
      await load();
    } catch (err) {
      alert(
        err?.response?.data?.message || "Thay đổi trạng thái người dùng thất bại"
      );
    }
  };

  const handleSetStatus = async (id, status, role) => {
    if (role === "admin") {
      alert("Không thể thay đổi trạng thái tài khoản có vai trò Admin");
      return;
    }

    try {
      await UserAPI.setStatus(id, status);
      await load();
    } catch (err) {
      alert(
        err?.response?.data?.message || "Cập nhật trạng thái người dùng thất bại"
      );
    }
  };

  const formatDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.valueOf())
      ? "-"
      : d.toLocaleDateString("vi-VN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
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

  const renderStatusText = (status) => {
    switch (status) {
      case "Active":
        return "Đang hoạt động";
      case "Inactive":
        return "Ngừng hoạt động";
      case "Suspended":
        return "Tạm khóa";
      default:
        return "Không xác định";
    }
  };

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Quản lý người dùng</h1>
            <p className="page-subtitle">
              Quản lý tài khoản người dùng và phân quyền
            </p>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={load}
              disabled={loading}
            >
              Tải lại
            </button>

            <Link to="/users/create" className="btn btn-primary">
              Thêm người dùng
            </Link>
          </div>
        </header>

        <div className="filters-row">
          <input
            className="input"
            type="search"
            placeholder="Tìm theo tên, email hoặc số điện thoại..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Ngừng hoạt động</option>
            <option value="Suspended">Tạm khóa</option>
          </select>

          <select
            className="select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Tất cả vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">Đang tải danh sách người dùng...</div>
        ) : users.length ? (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Họ và tên</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Số điện thoại</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
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
                          <Link className="link" to={`/admin/users/${u.id}/edit`}>
                            {u.name}
                          </Link>
                        </td>

                        <td>{u.email || "-"}</td>
                        <td>{u.role || "-"}</td>

                        <td>
                          <span
                            className={getStatusBadgeClass(u.status)}
                            style={{ marginRight: 8 }}
                          >
                            {renderStatusText(u.status || "Active")}
                          </span>
                        </td>

                        <td>{u.phone || "-"}</td>

                        <td>{formatDate(u.createdAt)}</td>

                        <td>
                          <div className="table-actions">
                            <Link
                              to={`/users/${u.id}/edit`}
                              className="btn btn-outline"
                            >
                              Sửa
                            </Link>

                            {u.role === "admin" ? (
                              <span
                                style={{
                                  fontSize: 12,
                                  opacity: 0.7,
                                  marginLeft: 8,
                                }}
                              >
                                Không thể đổi trạng thái Admin
                              </span>
                            ) : u.status === "Active" ? (
                              <button
                                type="button"
                                className="btn btn-ghost btn-danger"
                                onClick={() =>
                                  handleToggle(u.id, u.status, u.role)
                                }
                              >
                                Ngừng hoạt động
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() =>
                                  handleToggle(u.id, u.status, u.role)
                                }
                              >
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
              <div className="pagination">
                <button
                  type="button"
                  className="btn btn-outline"
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
                  className="btn btn-outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Sau
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">Không tìm thấy người dùng</div>

            <div className="empty-state-subtitle">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                : "Bắt đầu bằng cách tạo mới một người dùng"}
            </div>

            <Link to="/users/create" className="btn btn-primary">
              Thêm người dùng
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
