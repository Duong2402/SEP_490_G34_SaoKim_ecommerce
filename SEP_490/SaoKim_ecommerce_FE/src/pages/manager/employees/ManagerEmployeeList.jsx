// src/pages/manager/employees/ManagerEmployeeList.jsx
import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ManagerEmployeeAPI } from "../../../api/manager-employees";

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
      setEmployees(data?.items ?? []);
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
        setRoles(Array.isArray(data) ? data : []);
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
    return d.toLocaleDateString();
  };

  const getStatusClass = (status) => {
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

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this employee?")) {
      return;
    }
    try {
      await ManagerEmployeeAPI.remove(id);
      alert("Employee removed");
      loadEmployees();
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Failed to remove employee";
      alert(msg);
    }
  };

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Manage Employees</h1>
            <p className="page-subtitle">
              View, add, edit and remove employees
            </p>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={loadEmployees}
              disabled={loading}
            >
              Refresh
            </button>
            <Link to="/manager/employees/create" className="btn btn-primary">
              Add Employee
            </Link>
          </div>
        </header>

        <div className="filters-row">
          <input
            className="input"
            type="search"
            placeholder="Search by name, email, or phone..."
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
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Suspended">Suspended</option>
          </select>

          <select
            className="select"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">Loading employees...</div>
        ) : employees.length ? (
          <>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: 60 }}>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Phone</th>
                    <th>Created At</th>
                    <th style={{ width: 180 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.name}</td>
                      <td>{u.email || "-"}</td>
                      <td>{u.role || "-"}</td>
                      <td>
                        <span className={getStatusClass(u.status)}>
                          {u.status || "Active"}
                        </span>
                      </td>
                      <td>{u.phone || "-"}</td>
                      <td>{formatDate(u.createdAt)}</td>
                      <td>
                        <div className="table-actions">
                          <Link
                            to={`/manager/employees/${u.id}/edit`}
                            className="btn btn-outline"
                          >
                            Edit
                          </Link>
                          <button
                            type="button"
                            className="btn btn-outline btn-danger"
                            onClick={() => handleDelete(u.id)}
                          >
                            Remove
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
                  Page {page} of {totalPages} (Total: {totalItems} employees)
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
            <div className="empty-state-title">No employees found</div>
            <div className="empty-state-subtitle">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your filters"
                : "Get started by creating a new employee"}
            </div>
            <Link to="/manager/employees/create" className="btn btn-primary">
              Add Employee
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
