import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserAPI } from "../../api/users";

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
        search: search.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        roleId: roleFilter !== "all" ? parseInt(roleFilter, 10) : undefined,
      };
      const res = await UserAPI.getAll(params);
      setUsers(res?.data?.items ?? []);
      setTotalItems(res?.data?.totalItems ?? 0);
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
        const res = await UserAPI.getRoles();
        setRoles(res?.data || []);
      } catch (err) {
        console.error("Failed to load roles:", err);
      }
    };
    loadRoles();
  }, []);

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Are you sure you want to delete this user?");
    if (!confirmed) return;

    try {
      await UserAPI.remove(id);
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to delete user");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "-";
    }
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
            <Link to="/users/create" className="btn btn-primary">
              Add User
            </Link>
          </div>
        </header>

        <div className="filters-row">
          <input
            className="input"
            type="search"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label="Search users"
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>
          <select
            className="select"
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(1);
            }}
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            {roles.map((role) => (
              <option key={role.roleId} value={role.roleId}>
                {role.name}
              </option>
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
                  {users.map((user) => (
                    <tr key={user.userId}>
                      <td>{user.userId}</td>
                      <td>
                        <Link className="link" to={`/users/${user.userId}`}>
                          {user.name}
                        </Link>
                      </td>
                      <td>{user.email}</td>
                      <td>{user.roleName || "-"}</td>
                      <td>
                        <span className={getStatusBadgeClass(user.status)}>
                          {user.status || "Active"}
                        </span>
                      </td>
                      <td>{user.phoneNumber || "-"}</td>
                      <td>{formatDate(user.createAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link to={`/users/${user.userId}/edit`} className="btn btn-outline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn btn-ghost btn-danger"
                            onClick={() => handleDelete(user.userId)}
                          >
                            Delete
                          </button>
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
            <Link to="/users/create" className="btn btn-primary">
              Add User
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}







