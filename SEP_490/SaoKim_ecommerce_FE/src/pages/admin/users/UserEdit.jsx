import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaUserEdit } from "react-icons/fa";
import { UserAPI } from "../../../api/users";
import UserForm from "./UserForm";

export default function UserEdit() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await UserAPI.getById(id);
        setUser(res || null);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Không thể tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadUser();
    }
  }, [id]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      await UserAPI.update(id, payload);
      alert("Cập nhật người dùng thành công!");
      navigate("/admin/users");
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Không thể cập nhật người dùng";
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-users">
        <div className="admin-panel">
          <div className="admin-users__loading">Đang tải thông tin người dùng...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="admin-users">
        <div className="admin-panel">
          <div className="admin-users__empty">
            <div className="admin-users__empty-title">Lỗi</div>
            <div className="admin-users__empty-subtitle">
              {error || "Không tìm thấy người dùng"}
            </div>
            <Link to="/admin/users" className="admin-btn admin-btn--primary">
              <FaArrowLeft style={{ marginRight: 8 }} />
              Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const imageUrl = user.image
    ? user.image.startsWith("http") || user.image.startsWith("/")
      ? user.image.startsWith("http")
        ? user.image
        : `${import.meta.env?.VITE_API_BASE_URL || ""}${user.image}`
      : `${import.meta.env?.VITE_API_BASE_URL || ""}/${user.image}`
    : null;

  return (
    <div className="admin-users">
      <div className="admin-panel">
        <header className="admin-users__header">
          <div>
            <h2 className="admin-panel__title">
              <FaUserEdit style={{ marginRight: 10, verticalAlign: "middle" }} />
              Chỉnh sửa người dùng
            </h2>
            <p className="admin-panel__subtitle">
              Cập nhật thông tin tài khoản: <strong>{user.name}</strong>
            </p>
          </div>
          <div className="admin-users__actions">
            <Link to="/admin/users" className="admin-btn admin-btn--outline">
              <FaArrowLeft style={{ marginRight: 8 }} />
              Quay lại
            </Link>
          </div>
        </header>

        <UserForm
          initialValues={{
            ...user,
            roleId:
              user.roleId ??
              user.roleID ??
              user.role?.roleId ??
              user.role?.id ??
              "",
            image: imageUrl || undefined,
          }}
          onSubmit={handleSubmit}
          submitting={saving}
          isEdit={true}
        />
      </div>
    </div>
  );
}
