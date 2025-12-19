import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaUserPlus } from "react-icons/fa";
import { UserAPI } from "../../../api/users";
import UserForm from "./UserForm";

export default function UserCreate() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);

      await UserAPI.create(payload);

      alert("Tạo người dùng thành công!");
      navigate("/admin/users");
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể tạo người dùng";
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-users">
      <div className="admin-panel">
        <header className="admin-users__header">
          <div>
            <h2 className="admin-panel__title">
              <FaUserPlus style={{ marginRight: 10, verticalAlign: "middle" }} />
              Thêm người dùng mới
            </h2>
            <p className="admin-panel__subtitle">
              Tạo tài khoản người dùng mới trong hệ thống
            </p>
          </div>
          <div className="admin-users__actions">
            <Link to="/admin/users" className="admin-btn admin-btn--outline">
              <FaArrowLeft style={{ marginRight: 8 }} />
              Quay lại
            </Link>
          </div>
        </header>

        <UserForm onSubmit={handleSubmit} submitting={saving} isEdit={false} />
      </div>
    </div>
  );
}
