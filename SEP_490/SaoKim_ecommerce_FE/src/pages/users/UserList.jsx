import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserAPI } from "../../api/users";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all"); // lưu tên role (vd: "admin")
  const [roles, setRoles] = useState([]);              // [{id, name}]
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
        role: roleFilter !== "all" ? roleFilter : undefined, // BE nhận role theo tên
      };
      const res = await UserAPI.getAll(params);
      setUsers(res?.data?.items ?? []);
      setTotalItems(res?.data?.total ?? 0);
      setTotalPages(res?.data?.totalPages ?? 0);
    } catch (err) {
      console.error(err);
      setUsers([]);
      setTotalItems(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, roleFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        const res = await UserAPI.getRoles(); // [{ id, name }]
        setRoles(Array.isArray(res?.data) ? res.data : []);
      } catch (err) {
        console.error("Failed to load roles:", err);
      }
    };
    loadRoles();
  }, []);

  const formatDate = (v) => {
    if (!v) return "-";
    const d = new Date(v);
    return Number.isNaN(d.valueOf()) ? "-" : d.toLocaleDateString();
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Active": return "badge badge-success";
      case "Inactive": return "badge badge-warning";
      case "Suspended": return "badge badge-danger";
      default: return "badge";
    }
  };

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">Manage user accounts and permissions</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
              Refresh
            </button>
            <Link to="/users/create" className="btn btn-primary">Add User</Link>
          </div>
        </header>

        <div className="filters-row">
          <input
            className="input"
            type="search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            aria-label="Search users"
          />

          <select
            className="select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          >
            <option key="status-all" value="all">All Statuses</option>
            <option key="status-active" value="Active">Active</option>
            <option key="status-inactive" value="Inactive">Inactive</option>
            <option key="status-suspended" value="Suspended">Suspended</option>
          </select>

          <select
            className="select"
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            aria-label="Filter by role"
          >
            <option key="role-all" value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">Loading users...</div>
        ) : users.length ? (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Phone</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>
                        <Link className="link" to={`/users/${u.id}`}>
                          {u.name}
                        </Link>
                      </td>
                      <td>{u.email || "-"}</td>
                      <td>{u.role || "-"}</td>
                      <td>
                        <span className={getStatusBadgeClass(u.status)}>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td>{u.phone || "-"}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/users/${u.id}/edit`} className="btn btn-outline">Edit</Link>
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
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages} (Total: {totalItems} users)
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">No users found</div>
            <div className="empty-state-subtitle">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating a new user"}
            </div>
            <Link to="/users/create" className="btn btn-primary">Add User</Link>
          </div>
        )}
      </div>
    </div>
  );
}