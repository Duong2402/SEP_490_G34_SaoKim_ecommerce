
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
      await ManagerEmployeeAPI.create(payload);
      alert("Tạo nhân sự thành công.");
      navigate("/manager/employees");
    } catch (err) {
      console.error(err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể tạo nhân sự mới.";
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Thêm nhân sự</h2>
          <p className="manager-panel__subtitle">
            Hoàn thiện thông tin để cấp quyền truy cập hệ thống cho thành viên mới.
          </p>
        </div>
        <div className="manager-panel__actions">
          <Link to="/manager/employees" className="manager-btn manager-btn--outline">
            Hủy
          </Link>
        </div>
      </div>

      <ManagerEmployeeForm onSubmit={handleSubmit} submitting={saving} isEdit={false} />
    </div>
  );
}
