import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import ProjectForm from "./ProjectForm";

export default function ProjectCreate() {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      const res = await ProjectAPI.create(payload);
      const body = res || {};
      const created = body.data ?? body;
      const newId = created?.id;
      alert(t("projects.create.success"));
      navigate(newId ? `/projects/${newId}` : "/projects");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || t("projects.create.failure"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">{t("projects.create.title")}</h1>
            <p className="page-subtitle">{t("projects.create.subtitle")}</p>
          </div>
          <div className="actions">
            <Link to="/projects" className="btn btn-ghost">
              {t("common.actions.cancel")}
            </Link>
          </div>
        </header>

        <ProjectForm onSubmit={handleSubmit} submitting={saving} showCode />
      </div>
    </div>
  );
}
