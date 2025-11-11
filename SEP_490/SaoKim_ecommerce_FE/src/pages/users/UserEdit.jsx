import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { UserAPI } from "../../api/users";
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
        setUser(res?.data || null);
      } catch (err) {
        console.error(err);
        setError(err?.response?.data?.message || "Failed to load user");
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
      alert("User updated successfully");
      navigate("/users");
    } catch (err) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || err?.response?.data?.title || "Failed to update user";
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="panel">
          <div className="loading-state">Loading user...</div>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="container">
        <div className="panel">
          <div className="empty-state">
            <div className="empty-state-title">Error</div>
            <div className="empty-state-subtitle">{error || "User not found"}</div>
            <Link to="/users" className="btn btn-primary">
              Back to Users
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Build image URL for preview
  const imageUrl = user.image
    ? user.image.startsWith("http") || user.image.startsWith("/")
      ? user.image.startsWith("http")
        ? user.image
        : `${import.meta.env?.VITE_API_BASE_URL || ""}${user.image}`
      : `${import.meta.env?.VITE_API_BASE_URL || ""}/${user.image}`
    : null;

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Edit User</h1>
            <p className="page-subtitle">Update user information</p>
          </div>
          <div className="actions">
            <Link to="/users" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </header>

        <UserForm
          initialValues={{
            ...user,
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
