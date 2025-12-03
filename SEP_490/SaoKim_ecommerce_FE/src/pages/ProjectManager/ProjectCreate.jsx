import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import ProjectForm from "./ProjectForm";

export default function ProjectCreate() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      const res = await ProjectAPI.create(payload);
      const body = res || {};
      const created = body.data ?? body;
      const newId = created?.id;
      alert("Tạo dự án thành công.");
      navigate(newId ? `/projects/${newId}` : "/projects");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Không thể tạo dự án.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">Tạo dự án</h1>
            <p className="page-subtitle">
              Ghi lại yêu cầu, đội ngũ, thời gian và giá trị dự án để khởi động dự án rõ ràng.
            </p>
          </div>
          <div className="actions">
            <Link to="/projects" className="btn btn-ghost">
              Hủy
            </Link>
          </div>
        </header>

        <ProjectForm onSubmit={handleSubmit} submitting={saving} showCode />
      </div>
    </div>
  );
}