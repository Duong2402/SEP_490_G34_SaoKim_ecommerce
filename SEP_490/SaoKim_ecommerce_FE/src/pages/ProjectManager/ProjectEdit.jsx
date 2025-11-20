import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import ProjectForm from "./ProjectForm";

export default function ProjectEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const res = await ProjectAPI.getById(id);
        const body = res || {};
        setDetail(body.data ?? body ?? null);
      } catch (err) {
        console.error(err);
        alert(t("projects.messages.loadFailure"));
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, t]);

  const handleSubmit = async (payload) => {
    try {
      setSaving(true);
      await ProjectAPI.update(id, {
        name: payload.name,
        customerName: payload.customerName,
        customerContact: payload.customerContact,
        status: payload.status,
        startDate: payload.startDate,
        endDate: payload.endDate,
        budget: payload.budget,
        description: payload.description,
      });
      alert(t("projects.edit.success"));
      navigate("/projects");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || t("projects.edit.failure"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pm-page">
        <div className="panel loading-state">{t("projects.edit.loading")}</div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="pm-page">
        <div className="panel empty-state">
          <div className="empty-state-title">{t("projects.edit.notFoundTitle")}</div>
          <div className="empty-state-subtitle">{t("projects.edit.notFoundSubtitle")}</div>
          <Link to="/projects" className="btn btn-primary">
            {t("projects.edit.backToProjects")}
          </Link>
        </div>
      </div>
    );
  }

  const subtitle = detail.code
    ? t("projects.edit.subtitle", { code: detail.code })
    : t("projects.edit.subtitleFallback");

  return (
    <div className="pm-page">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">{t("projects.edit.title")}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
          <div className="actions">
            <Link to={`/projects/${id}`} className="btn btn-outline">
              {t("projects.edit.viewDetails")}
            </Link>
            <Link to="/projects" className="btn btn-ghost">
              {t("common.actions.cancel")}
            </Link>
          </div>
        </header>

        <ProjectForm
          initialValues={detail}
          onSubmit={handleSubmit}
          submitting={saving}
          showCode={false}
        />
      </div>
    </div>
  );
}
