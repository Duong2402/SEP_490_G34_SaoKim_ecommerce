import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ProjectAPI } from "../../api/ProjectManager/projects";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import {
  PROJECT_STATUSES,
  formatBudget,
  formatBudgetCompact,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
} from "./projectHelpers";

export default function ProjectList() {
  const { t, lang, formatNumber } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ProjectAPI.getAll({ Page: 1, PageSize: 100, Sort: "-CreatedAt" });
      setProjects(res?.data?.data?.items ?? []);
    } catch (err) {
      console.error(err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id) => {
    const confirmed = window.confirm(t("common.notifications.confirmDelete"));
    if (!confirmed) return;

    try {
      await ProjectAPI.remove(id);
      await load();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || t("projects.messages.deleteFailure"));
    }
  };

  const filteredProjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesTerm =
        !term
        || project.name?.toLowerCase().includes(term)
        || project.code?.toLowerCase().includes(term)
        || project.customerName?.toLowerCase().includes(term);

      const matchesStatus = statusFilter === "all" || project.status === statusFilter;

      return matchesTerm && matchesStatus;
    });
  }, [projects, search, statusFilter]);

  const metrics = useMemo(() => {
    if (!projects.length) {
      return { total: 0, active: 0, completed: 0, budget: 0 };
    }

    const total = projects.length;
    const active = projects.filter((p) => p.status === "InProgress").length;
    const completed = projects.filter((p) => p.status === "Done").length;
    const budget = projects.reduce(
      (sum, project) => sum + (typeof project.budget === "number" ? project.budget : 0),
      0,
    );

    return { total, active, completed, budget };
  }, [projects]);

  return (
    <div className="container">
      <div className="panel">
        <header className="page-header">
          <div>
            <h1 className="page-title">{t("projects.title")}</h1>
            <p className="page-subtitle">{t("projects.subtitle")}</p>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-outline" onClick={load} disabled={loading}>
              {t("common.actions.refresh")}
            </button>
            <Link to="/projects/create" className="btn btn-primary">
              {t("projects.actions.new")}
            </Link>
          </div>
        </header>

        <section className="metrics-grid">
          <article className="metric-card">
            <div className="metric-label">{t("projects.metrics.total")}</div>
            <div className="metric-value">{formatNumber(metrics.total) || "0"}</div>
            <div className="metric-trend">
              {t("projects.metrics.totalHint", { count: formatNumber(metrics.active) || "0" })}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-label">{t("projects.metrics.completed")}</div>
            <div className="metric-value">{formatNumber(metrics.completed) || "0"}</div>
            <div className="metric-trend">{t("projects.metrics.completedHint")}</div>
          </article>

          <article className="metric-card">
            <div className="metric-label">{t("projects.metrics.budget")}</div>
            <div className="metric-value">{formatBudgetCompact(metrics.budget, lang)}</div>
            <div className="metric-trend">{t("projects.metrics.budgetHint")}</div>
          </article>
        </section>

        <div className="filters-row">
          <input
            className="input"
            type="search"
            placeholder={t("common.placeholders.searchProjects")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("common.placeholders.searchProjects")}
          />
          <select
            className="select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label={t("projects.filters.allStatuses")}
          >
            <option value="all">{t("projects.filters.allStatuses")}</option>
            {PROJECT_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {getStatusLabel(status.value, t)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-state">{t("projects.list.loading")}</div>
        ) : filteredProjects.length ? (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("projects.table.code")}</th>
                  <th>{t("projects.table.name")}</th>
                  <th>{t("projects.table.customer")}</th>
                  <th>{t("projects.table.status")}</th>
                  <th>{t("projects.table.timeline")}</th>
                  <th>{t("projects.table.budget")}</th>
                  <th>{t("projects.table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td>
                      <Link className="link" to={`/projects/${project.id}`}>
                        {project.code || "-"}
                      </Link>
                    </td>
                    <td>{project.name}</td>
                    <td>{project.customerName || "-"}</td>
                    <td>
                      <span className={getStatusBadgeClass(project.status)}>
                        <span className="badge-dot" />
                        {getStatusLabel(project.status, t)}
                      </span>
                    </td>
                    <td>
                      {formatDate(project.startDate, lang)}
                      {" — "}
                      {formatDate(project.endDate, lang)}
                    </td>
                    <td>{formatBudget(project.budget, lang)}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/projects/${project.id}`} className="btn btn-ghost">
                          {t("common.actions.view")}
                        </Link>
                        <Link to={`/projects/${project.id}/edit`} className="btn btn-outline">
                          {t("common.actions.edit")}
                        </Link>
                        <button
                          type="button"
                          className="btn btn-ghost btn-danger"
                          onClick={() => handleDelete(project.id)}
                        >
                          {t("common.actions.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-title">{t("projects.table.emptyTitle")}</div>
            <div className="empty-state-subtitle">{t("projects.table.emptySubtitle")}</div>
            <Link to="/projects/create" className="btn btn-primary">
              {t("projects.table.createCta")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
