import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ManagerEmployeeAPI } from "../../../api/manager-employees";
import ManagerEmployeeForm from "./ManagerEmployeeForm";

export default function ManagerEmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEmployee = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await ManagerEmployeeAPI.getById(id);
        setEmployee(data);
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.message ||
            err?.response?.data?.title ||
            "Failed to load employee"
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadEmployee();
    }
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      await ManagerEmployeeAPI.update(id, payload);
      alert("Employee updated");
      navigate("/manager/employees");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Failed to update employee";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="panel">
          <div className="loading-state">Loading employee...</div>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="container">
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-title">Error</div>
            <div className="empty-state-subtitle">
              {error || "Employee not found"}
            </div>
            <Link to="/manager/employees" className="btn btn-primary">
              Back to Employees
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Edit Employee</h1>
            <p className="page-subtitle">Update employee information</p>
          </div>
          <div className="actions">
            <Link to="/manager/employees" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </header>

        <ManagerEmployeeForm
          initialValues={employee}
          onSubmit={handleSubmit}
          submitting={saving}
          isEdit
        />
      </div>
    </div>
  );
}
