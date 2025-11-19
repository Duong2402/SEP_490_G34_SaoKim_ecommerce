// src/pages/manager/employees/ManagerEmployeeCreate.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ManagerEmployeeAPI } from "../../../api/manager-employees";
import ManagerEmployeeForm from "./ManagerEmployeeForm";

export default function ManagerEmployeeCreate() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      await ManagerEmployeeAPI.create(payload); // API đã unwrap nên không cần .data
      alert("Employee created successfully");
      navigate("/manager/employees");
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Failed to create employee";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Add Employee</h1>
            <p className="page-subtitle">Create a new employee account</p>
          </div>
          <div className="actions">
            <Link to="/manager/employees" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </header>

        <ManagerEmployeeForm
          onSubmit={handleSubmit}
          submitting={saving}
          isEdit={false}
        />
      </div>
    </div>
  );
}
