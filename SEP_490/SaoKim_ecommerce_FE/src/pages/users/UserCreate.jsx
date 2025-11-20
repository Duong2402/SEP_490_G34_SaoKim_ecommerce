import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserAPI } from "../../api/users";
import UserForm from "./UserForm";

export default function UserCreate() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);

      // http.js đã trả về thẳng res.data, nhưng ở đây mình không cần dùng kết quả
      await UserAPI.create(payload);

      alert("User created successfully");
      navigate("/users");
    } catch (err) {
      console.error(err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Failed to create user";
      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Add User</h1>
            <p className="page-subtitle">Create a new user account</p>
          </div>
          <div className="actions">
            <Link to="/users" className="btn btn-ghost">
              Cancel
            </Link>
          </div>
        </header>

        <UserForm
          onSubmit={handleSubmit}
          submitting={saving}
          isEdit={false}
        />
      </div>
    </div>
  );
}
