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
            "Không thể tải nhân sự."
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
      alert("Đã cập nhật nhân sự.");
      navigate("/manager/employees");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể cập nhật nhân sự.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="manager-panel manager-empty">Đang tải dữ liệu...</div>;
  }

  if (error || !employee) {
    return (
      <div className="manager-panel manager-empty">
        <p>{error || "Không tìm thấy nhân sự."}</p>
        <Link to="/manager/employees" className="manager-btn manager-btn--primary" style={{ marginTop: 14 }}>
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Chỉnh sửa nhân sự</h2>
          <p className="manager-panel__subtitle">
            Cập nhật thông tin liên hệ, vai trò và trạng thái làm việc.
          </p>
        </div>
        <div className="manager-panel__actions">
          <Link to="/manager/employees" className="manager-btn manager-btn--outline">
            Hủy
          </Link>
        </div>
      </div>

      <ManagerEmployeeForm
        initialValues={employee}
        onSubmit={handleSubmit}
        submitting={saving}
        isEdit
      />
    </div>
  );
}
