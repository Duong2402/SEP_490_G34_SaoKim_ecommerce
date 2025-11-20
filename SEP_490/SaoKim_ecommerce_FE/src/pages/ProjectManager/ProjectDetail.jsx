// src/pages/ProjectManager/ProjectDetail.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import "dayjs/locale/vi";
import { ProjectAPI, TaskAPI } from "../../api/ProjectManager/projects";
import { ProjectProductAPI } from "../../api/ProjectManager/project-products";
import { ProjectExpenseAPI } from "../../api/ProjectManager/project-expenses";
import { useLanguage } from "../../i18n/LanguageProvider.jsx";
import {
  formatBudget,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
} from "./projectHelpers";
import AddEditProjectProductModal from "../../components/AddEditProjectProductModal.jsx";
import MultiAddProjectProductsModal from "../../components/MultiAddProjectProductsModal.jsx";
import AddEditProjectExpenseModal from "../../components/AddEditProjectExpenseModal.jsx";

const UI_TO_BE = {
  Pending: "New",
  Doing: "InProgress",
  Done: "Done",
  Delayed: "Delayed",
};
const BE_TO_UI = {
  New: "Pending",
  InProgress: "Doing",
  Done: "Done",
  Delayed: "Delayed",
};
const STATUS_CYCLE = ["Pending", "Doing", "Done", "Delayed", null];
const STATUS_COLORS = {
  Pending: "rgba(148,163,184,0.35)",
  Doing: "rgba(59,130,246,0.35)",
  Done: "rgba(34,197,94,0.40)",
  Delayed: "rgba(248,113,113,0.40)",
};
const DEFAULT_CELL_COLOR = "rgba(148,163,184,0.12)";

const toUIStatus = (value) => BE_TO_UI[value] || "Pending";
const toBEStatus = (value) => UI_TO_BE[value] || "New";

const normalizeTaskFromAPI = (raw) => ({
  ...raw,
  days: Array.isArray(raw?.days)
    ? raw.days.map((entry) => ({
        date: dayjs(entry.date).format("YYYY-MM-DD"),
        status: toUIStatus(entry.status),
      }))
    : [],
});

const getOverallStatusUI = (task) => {
  if (!task?.days?.length) return "Pending";
  const last = [...task.days].sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  return last?.status || "Pending";
};

const buildDefaultForm = (referenceMonth) => ({
  name: "",
  assignee: "",
  startDate: referenceMonth.format("YYYY-MM-DD"),
  durationDays: "1",
});

const LEGEND_ITEMS = ["Pending", "Doing", "Done", "Delayed"];

function ProjectDetail() {
  const { id } = useParams();
  const { t, lang, formatNumber } = useLanguage();

  const [project, setProject] = useState(null);
  const [loadingProject, setLoadingProject] = useState(true);

  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(buildDefaultForm(dayjs().startOf("month")));
  const [formErrors, setFormErrors] = useState({});
  const [savingTask, setSavingTask] = useState(false);

  // --- ProjectProducts state ---
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showMultiAddModal, setShowMultiAddModal] = useState(false);

  // --- Expenses state ---
  const [expenses, setExpenses] = useState([]);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setLoadingProject(true);
    try {
      const res = await ProjectAPI.getById(id);
      const body = res || {};
      setProject(body.data ?? body ?? null);
    } catch (error) {
      console.error(error);
      setProject(null);
    } finally {
      setLoadingProject(false);
    }
  }, [id]);

  const loadTasks = useCallback(async () => {
    if (!id) return;
    setLoadingTasks(true);
    try {
      const res = await TaskAPI.list(id);
      const api = res || {};
      const payload = api.data ?? api;
      const list = payload.items ?? payload;
      setTasks(Array.isArray(list) ? list.map(normalizeTaskFromAPI) : []);
    } catch (error) {
      console.error(error);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  }, [id]);

  const loadProducts = useCallback(async () => {
    if (!id) return;
    setLoadingProducts(true);
    try {
      const res = await ProjectProductAPI.list(id);
      const api = res || {};
      const payload = api.data ?? api;
      const items = payload.items ?? payload;
      setProducts(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error(error);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }, [id]);

  const loadExpenses = useCallback(async () => {
    if (!id) return;
    setLoadingExpenses(true);
    try {
      const res = await ProjectExpenseAPI.list(id, {
        sort: "-Date",
        page: 1,
        pageSize: 100,
      });
      const api = res || {};
      const payload = api.data ?? api;
      const page = payload.page ?? payload;
      const items = page.items ?? page;
      setExpenses(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error(err);
      setExpenses([]);
    } finally {
      setLoadingExpenses(false);
    }
  }, [id]);

  useEffect(() => {
    loadProject();
    loadTasks();
    loadProducts();
    loadExpenses();
  }, [loadProject, loadTasks, loadProducts, loadExpenses]);

  useEffect(() => {
    if (!isModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  const filteredTasks = useMemo(() => {
    if (!searchTerm.trim()) return tasks;
    const term = searchTerm.trim().toLowerCase();
    return tasks.filter((task) => {
      const name = task.name?.toLowerCase() ?? "";
      const assignee = task.assignee?.toLowerCase() ?? "";
      return name.includes(term) || assignee.includes(term);
    });
  }, [searchTerm, tasks]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const startA = dayjs(a.startDate);
      const startB = dayjs(b.startDate);
      const valueA = startA.isValid() ? startA.valueOf() : Number.POSITIVE_INFINITY;
      const valueB = startB.isValid() ? startB.valueOf() : Number.POSITIVE_INFINITY;
      return valueA - valueB;
    });
  }, [filteredTasks]);

  const taskMetrics = useMemo(() => {
    if (!tasks.length) {
      return { total: 0, completed: 0, delayed: 0, active: 0, progress: 0 };
    }
    let completed = 0;
    let delayed = 0;
    tasks.forEach((task) => {
      const status = getOverallStatusUI(task);
      if (status === "Done") completed += 1;
      if (status === "Delayed") delayed += 1;
    });
    const total = tasks.length;
    const active = Math.max(total - completed - delayed, 0);
    const progress = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, delayed, active, progress };
  }, [tasks]);

  const projectDurationDays = useMemo(() => {
    if (!project?.startDate || !project?.endDate) return null;
    const start = dayjs(project.startDate);
    const end = dayjs(project.endDate);
    if (!start.isValid() || !end.isValid()) return null;
    return end.diff(start, "day") + 1;
  }, [project?.startDate, project?.endDate]);

  const daysInView = useMemo(() => {
    const startOfMonth = month.startOf("month");
    return Array.from({ length: month.daysInMonth() }, (_, index) =>
      startOfMonth.add(index, "day"),
    );
  }, [month]);

  const columnsTemplate = useMemo(
    () => `repeat(${daysInView.length}, minmax(28px, 1fr))`,
    [daysInView.length],
  );

  const today = dayjs();
  const monthLabel = month.locale(lang === "vi" ? "vi" : "en").format("MMMM YYYY");

  const openCreateTask = () => {
    setEditingTask(null);
    setForm(buildDefaultForm(month));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setForm({
      name: task.name ?? "",
      assignee: task.assignee ?? "",
      startDate: dayjs(task.startDate).isValid()
        ? dayjs(task.startDate).format("YYYY-MM-DD")
        : month.format("YYYY-MM-DD"),
      durationDays:
        Number.isFinite(Number(task.durationDays)) && Number(task.durationDays) > 0
          ? String(task.durationDays)
          : String(task?.days?.length || 1),
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
    setForm(buildDefaultForm(month));
    setFormErrors({});
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "durationDays" ? value.replace(/[^0-9]/g, "") : value,
    }));
  };

  const validateForm = useCallback(() => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = t("projects.detail.taskModal.validations.name");
    }
    if (!form.startDate) {
      errors.startDate = t("projects.detail.taskModal.validations.startDate");
    }
    const durationValue = Number.parseInt(form.durationDays, 10);
    if (!Number.isFinite(durationValue) || durationValue < 1) {
      errors.durationDays = t("projects.detail.taskModal.validations.duration");
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [form.durationDays, form.name, form.startDate, t]);

  const handleSaveTask = async () => {
    if (!validateForm()) return;
    const payload = {
      name: form.name.trim(),
      assignee: form.assignee.trim() || null,
      startDate: form.startDate,
      durationDays: Math.max(1, Number.parseInt(form.durationDays, 10) || 1),
      dependsOnTaskId: editingTask?.dependsOnTaskId ?? null,
    };

    try {
      setSavingTask(true);
      if (editingTask) {
        await TaskAPI.update(id, editingTask.id, payload);
      } else {
        await TaskAPI.create(id, payload);
      }
      await loadTasks();
      closeModal();
    } catch (error) {
      console.error(error);
      alert(t("projects.detail.messages.saveTaskFailure"));
    } finally {
      setSavingTask(false);
    }
  };

  const handleCellClick = async (task, dateKey) => {
    const taskIndex = tasks.findIndex((entry) => entry.id === task.id);
    if (taskIndex < 0) return;

    const nextTasks = [...tasks];
    const nextTask = {
      ...nextTasks[taskIndex],
      days: Array.isArray(nextTasks[taskIndex].days)
        ? [...nextTasks[taskIndex].days]
        : [],
    };

    const dayIndex = nextTask.days.findIndex((day) => day.date === dateKey);
    const currentStatus = dayIndex >= 0 ? nextTask.days[dayIndex].status : null;
    const cycleIndex = STATUS_CYCLE.indexOf(currentStatus);
    const nextStatus = STATUS_CYCLE[(cycleIndex + 1) % STATUS_CYCLE.length];

    if (nextStatus === null) {
      if (dayIndex >= 0) {
        nextTask.days.splice(dayIndex, 1);
      }
    } else {
      const entry = { date: dateKey, status: nextStatus };
      if (dayIndex >= 0) {
        nextTask.days[dayIndex] = entry;
      } else {
        nextTask.days.push(entry);
      }
    }

    nextTasks[taskIndex] = nextTask;
    setTasks(nextTasks);

    const payload = {
      name: nextTask.name ?? "",
      assignee: nextTask.assignee ?? null,
      startDate: dayjs(nextTask.startDate).isValid()
        ? dayjs(nextTask.startDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),
      durationDays:
        typeof nextTask.durationDays === "number" && nextTask.durationDays > 0
          ? nextTask.durationDays
          : Math.max(1, nextTask.days?.length || 1),
      dependsOnTaskId: nextTask.dependsOnTaskId ?? null,
      days: (nextTask.days || []).map((day) => ({
        date: day.date,
        status: toBEStatus(day.status),
      })),
    };

    try {
      await TaskAPI.update(id, nextTask.id, payload);
    } catch (error) {
      console.error(error);
      alert(t("projects.detail.messages.updateDayFailure"));
    }
  };

  const goToPreviousMonth = () => setMonth((current) => current.subtract(1, "month"));
  const goToNextMonth = () => setMonth((current) => current.add(1, "month"));

  const totalProductCost = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
    [products]
  );
  const totalExpenseCost = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
    [expenses]
  );
  const totalActualAllIn = useMemo(
    () => totalProductCost + totalExpenseCost,
    [totalProductCost, totalExpenseCost]
  );
  const variance = useMemo(() => {
    const planned = Number(project?.budget || 0);
    return planned - totalActualAllIn;
  }, [project?.budget, totalActualAllIn]);

  if (loadingProject) {
    return (
      <div className="container">
        <div className="panel loading-state">{t("projects.detail.loadingProject")}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container">
        <div className="panel empty-state">
          <div className="empty-state-title">{t("projects.detail.notFoundTitle")}</div>
          <div className="empty-state-subtitle">
            {t("projects.detail.notFoundSubtitle")}
          </div>
          <Link to="/projects" className="btn btn-primary">
            {t("projects.detail.actions.backToList")}
          </Link>
        </div>
      </div>
    );
  }

  const subtitle = project.code
    ? t("projects.detail.subtitle", { code: project.code })
    : t("projects.detail.subtitleFallback");

  return (
    <div className="container">
      <div className="project-detail">
        <section className="panel project-hero">
          <div className="project-hero__top">
            <div>
              <div className="project-hero__badges">
                {project.code ? <span className="project-hero__code">#{project.code}</span> : null}
                <span className={getStatusBadgeClass(project.status)}>
                  <span className="badge-dot" />
                  {getStatusLabel(project.status, t)}
                </span>
              </div>
              <h1 className="project-hero__title">{project.name}</h1>
              <p className="project-hero__subtitle">{subtitle}</p>
            </div>
            <div className="project-hero__actions">
              <Link to="/projects" className="btn btn-ghost">
                {t("projects.detail.actions.backToList")}
              </Link>
              <Link to={`/projects/${id}/edit`} className="btn btn-outline">
                {t("common.actions.edit")}
              </Link>
              {/* NEW: nút đi tới trang Báo cáo */}
              <Link to={`/projects/${id}/report`} className="btn btn-outline">
                Xem báo cáo
              </Link>
              <button type="button" className="btn btn-primary" onClick={openCreateTask}>
                {t("projects.detail.actions.addTask")}
              </button>
            </div>
          </div>

          <div className="project-hero__stats">
            <div className="project-hero__stat">
              <div className="project-hero__stat-label">{t("projects.detail.metrics.total")}</div>
              <div className="project-hero__stat-value">
                {formatNumber(taskMetrics.total) || "0"}
              </div>
              <div className="project-hero__stat-hint">
                {t("projects.detail.metrics.totalHint", {
                  active: formatNumber(taskMetrics.active) || "0",
                })}
              </div>
            </div>

            <div className="project-hero__stat">
              <div className="project-hero__stat-label">
                {t("projects.detail.metrics.completed")}
              </div>
              <div className="project-hero__stat-value">
                {formatNumber(taskMetrics.completed) || "0"}
              </div>
              <div className="project-hero__stat-hint">
                {t("projects.detail.metrics.completedHint")}
              </div>
            </div>

            <div className="project-hero__stat">
              <div className="project-hero__stat-label">
                {t("projects.detail.metrics.delayed")}
              </div>
              <div className="project-hero__stat-value">
                {formatNumber(taskMetrics.delayed) || "0"}
              </div>
              <div className="project-hero__stat-hint">
                {t("projects.detail.metrics.delayedHint")}
              </div>
            </div>

            <div className="project-hero__stat">
              <div className="project-hero__stat-label">
                {t("projects.detail.metrics.progress")}
              </div>
              <div className="project-hero__stat-value">
                {taskMetrics.progress}%
              </div>
              <div className="project-hero__progress">
                <div
                  className="project-hero__progress-bar"
                  style={{ width: `${taskMetrics.progress}%` }}
                />
              </div>
              <div className="project-hero__stat-hint">
                {t("projects.detail.metrics.progressHint")}
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="project-overview__grid">
            <article className="project-overview__card">
              <div className="project-overview__label">{t("projects.detail.timeline")}</div>
              <div className="project-overview__value">
                {formatDate(project.startDate, lang)} &mdash; {formatDate(project.endDate, lang)}
              </div>
              {projectDurationDays ? (
                <div className="project-overview__description">
                  {t("projects.detail.timelineHint", {
                    days: formatNumber(projectDurationDays) || "0",
                  })}
                </div>
              ) : null}
            </article>

            <article className="project-overview__card">
              <div className="project-overview__label">{t("projects.detail.budget")}</div>
              <div className="project-overview__value">
                {formatBudget(project.budget, lang)}
              </div>
              <div className="project-overview__description">
                {t("projects.detail.budgetHint")}
              </div>
            </article>

            <article className="project-overview__card">
              <div className="project-overview__label">{t("projects.detail.customer")}</div>
              <div className="project-overview__value">
                {project.customerName || t("projects.detail.customerEmpty")}
              </div>
              <div className="project-overview__description">
                {project.customerContact || t("projects.detail.customerContactEmpty")}
              </div>
            </article>
          </div>

          <div>
            <h2 className="project-section-title">{t("projects.detail.description")}</h2>
            {project.description ? (
              <div className="project-description">{project.description}</div>
            ) : (
              <p className="description-empty">{t("projects.detail.descriptionEmpty")}</p>
            )}
          </div>
        </section>

        {/* ---- TASKS ---- */}
        <section className="panel">
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">{t("projects.detail.tasksTitle")}</h2>
              <p className="project-section-subtitle">{t("projects.detail.tasksSubtitle")}</p>
            </div>
            <div className="project-task-controls">
              <div className="project-task-month">
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={goToPreviousMonth}
                  aria-label={t("projects.detail.previousMonth")}
                >
                  ‹
                </button>
                <div className="project-task-month__label">{monthLabel}</div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={goToNextMonth}
                  aria-label={t("projects.detail.nextMonth")}
                >
                  ›
                </button>
              </div>
              <div className="project-task-search">
                <input
                  className="input"
                  type="search"
                  placeholder={t("projects.detail.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  aria-label={t("projects.detail.searchPlaceholder")}
                />
              </div>
            </div>
          </div>

          <div className="task-legend">
            {LEGEND_ITEMS.map((status) => (
              <span key={status} className="task-legend__item">
                <span
                  className="task-legend__swatch"
                  style={{ background: STATUS_COLORS[status] }}
                />
                {t(`projects.detail.taskStatus.${status}`)}
              </span>
            ))}
          </div>
          <p className="project-section-subtitle">{t("projects.detail.legendHint")}</p>

          {loadingTasks ? (
            <div className="loading-state">{t("projects.detail.loadingTasks")}</div>
          ) : sortedTasks.length ? (
            <div className="gantt">
              <div className="gantt-header">
                <div className="col col-name">{t("projects.detail.taskTable.name")}</div>
                <div className="col col-assignee">
                  {t("projects.detail.taskTable.assignee")}
                </div>
                <div className="col col-start">{t("projects.detail.taskTable.start")}</div>
                <div className="col col-dur">{t("projects.detail.taskTable.duration")}</div>
                <div className="col col-status">
                  {t("projects.detail.taskTable.overallStatus")}
                </div>
                <div className="col col-days">
                  <div className="g-days" style={{ gridTemplateColumns: columnsTemplate }}>
                    {daysInView.map((date) => {
                      const isWeekend = date.day() === 0 || date.day() === 6;
                      const isToday = date.isSame(today, "day");
                      const classNames = ["g-day-h"];
                      if (isWeekend) classNames.push("is-weekend");
                      if (isToday) classNames.push("is-today");
                      return (
                        <div key={date.format("YYYY-MM-DD")} className={classNames.join(" ")}>
                          {date.format("D")}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {sortedTasks.map((task) => {
                const overall = getOverallStatusUI(task);
                const startLabel = formatDate(task.startDate, lang);
                const durationLabel =
                  Number.isFinite(Number(task.durationDays)) && Number(task.durationDays) > 0
                    ? t("projects.detail.taskDuration", {
                        count: Number.parseInt(task.durationDays, 10),
                      })
                    : "-";
                const displayName = task.name || t("projects.detail.untitledTask");
                const assignee = task.assignee || t("projects.detail.unassigned");

                return (
                  <div key={task.id} className="gantt-row">
                    <div className="col col-name">
                      <div className="task-title">{displayName}</div>
                      <div className="task-meta__actions">
                        <button
                          type="button"
                          className="btn btn-outline btn-compact"
                          onClick={() => openEditTask(task)}
                        >
                          {t("common.actions.edit")}
                        </button>
                      </div>
                    </div>

                    <div className="col col-assignee">{assignee}</div>
                    <div className="col col-start">{startLabel}</div>
                    <div className="col col-dur">{durationLabel}</div>
                    <div className="col col-status">
                      <span className="task-status-chip">
                        {t(`projects.detail.taskStatus.${overall}`)}
                      </span>
                    </div>

                    <div className="col col-days">
                      <div className="g-days" style={{ gridTemplateColumns: columnsTemplate }}>
                        {daysInView.map((date) => {
                          const key = date.format("YYYY-MM-DD");
                          const dayEntry = task.days?.find((entry) => entry.date === key);
                          const isWeekend = date.day() === 0 || date.day() === 6;
                          const isToday = date.isSame(today, "day");
                          const classNames = ["g-cell"];
                          if (isWeekend) classNames.push("is-weekend");
                          if (isToday) classNames.push("is-today");
                          if (dayEntry) classNames.push("has-value");
                          return (
                            <div
                              key={key}
                              className={classNames.join(" ")}
                              style={{
                                backgroundColor: dayEntry
                                  ? STATUS_COLORS[dayEntry.status] || DEFAULT_CELL_COLOR
                                  : undefined,
                              }}
                              onClick={() => handleCellClick(task, key)}
                              title={
                                dayEntry
                                  ? t(`projects.detail.taskStatus.${dayEntry.status}`)
                                  : t("projects.detail.noStatus")
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">{t("projects.detail.taskEmptyTitle")}</div>
              <div className="empty-state-subtitle">
                {t("projects.detail.taskEmptySubtitle")}
              </div>
              <button type="button" className="btn btn-primary" onClick={openCreateTask}>
                {t("projects.detail.actions.addTask")}
              </button>
            </div>
          )}
        </section>

        {/* ---- PROJECT PRODUCTS ---- */}
        <section className="panel">
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">Sản phẩm sử dụng</h2>
              <p className="project-section-subtitle">
                Danh sách các sản phẩm thuộc dự án này, bao gồm số lượng và đơn giá.
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-outline"
                style={{ marginRight: 8 }}
                onClick={() => setShowMultiAddModal(true)}
              >
                + Thêm nhiều sản phẩm
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddProductModal(true);
                }}
              >
                + Thêm sản phẩm
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="loading-state">Đang tải danh sách sản phẩm...</div>
          ) : products.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Đơn vị</th>
                    <th>Số lượng</th>
                    <th>Đơn giá (VND)</th>
                    <th>Thành tiền</th>
                    <th>Ghi chú</th>
                    <th style={{ width: 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((item) => (
                    <tr key={item.id}>
                      <td>{item.productName}</td>
                      <td>{item.uom}</td>
                      <td>{formatNumber(item.quantity)}</td>
                      <td>{formatNumber(item.unitPrice)}</td>
                      <td><strong>{formatNumber(item.total)}</strong></td>
                      <td>{item.note || "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => {
                              setEditingProduct(item);
                              setShowAddProductModal(true);
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#dc2626" }}
                            onClick={async () => {
                              if (!window.confirm("Bạn có chắc muốn xoá sản phẩm này?")) return;
                              try {
                                await ProjectProductAPI.remove(id, item.id);
                                await loadProducts();
                              } catch (err) {
                                console.error(err);
                                alert("Xoá thất bại!");
                              }
                            }}
                          >
                            Xoá
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: "right" }}>
                      <strong>Tổng cộng:</strong>
                    </td>
                    <td colSpan={3}>
                      <strong>
                        {formatNumber(
                          products.reduce((sum, p) => sum + (Number(p.total) || 0), 0)
                        )}{" "}
                        VND
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Chưa có sản phẩm nào</div>
              <div className="empty-state-subtitle">Hãy thêm sản phẩm cho dự án này.</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddProductModal(true);
                }}
              >
                + Thêm sản phẩm
              </button>
            </div>
          )}

          {showAddProductModal && (
            <AddEditProjectProductModal
              projectId={id}
              product={editingProduct}
              onClose={() => {
                setShowAddProductModal(false);
                setEditingProduct(null);
              }}
              onSaved={loadProducts}
            />
          )}

          {showMultiAddModal && (
            <MultiAddProjectProductsModal
              projectId={id}
              onClose={() => setShowMultiAddModal(false)}
              onSaved={loadProducts}
            />
          )}
        </section>

        {/* ---- PROJECT EXPENSES (OTHER COSTS) ---- */}
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">Chi phí dự án</h2>
              <p className="project-section-subtitle">
                Quản lý các khoản chi liên quan đến dự án (mua hàng phụ trợ, vận chuyển, lắp đặt, v.v.).
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
              >
                + Thêm chi phí
              </button>
            </div>
          </div>

          {/* Summary Budget vs Actual (All-in) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 12
          }}>
            <div className="project-overview__card">
              <div className="project-overview__label">Planned (Budget)</div>
              <div className="project-overview__value">
                {formatBudget(project.budget, lang)}
              </div>
              <div className="project-overview__description">Ngân sách kế hoạch.</div>
            </div>
            <div className="project-overview__card">
              <div className="project-overview__label">Actual (All-in)</div>
              <div className="project-overview__value">
                {formatBudget(totalActualAllIn, lang)}
              </div>
              <div className="project-overview__description">
                Gồm Sản phẩm {formatBudget(totalProductCost, lang)} + Chi phí khác {formatBudget(totalExpenseCost, lang)}.
              </div>
            </div>
            <div className="project-overview__card">
              <div className="project-overview__label">Variance</div>
              <div
                className="project-overview__value"
                style={{ color: variance < 0 ? "#dc2626" : "#16a34a" }}
              >
                {formatBudget(variance, lang)}
              </div>
              <div className="project-overview__description">
                {variance < 0 ? "Vượt ngân sách" : "Còn trong ngân sách"}
              </div>
            </div>
          </div>

          {loadingExpenses ? (
            <div className="loading-state">Đang tải danh sách chi phí...</div>
          ) : expenses.length ? (
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Nhóm</th>
                    <th>Nhà cung cấp</th>
                    <th>Mô tả</th>
                    <th>Số tiền (VND)</th>
                    <th>Hóa đơn</th>
                    <th style={{ width: 140 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td>{formatDate(e.date, lang)}</td>
                      <td>{e.category || "-"}</td>
                      <td>{e.vendor || "-"}</td>
                      <td>{e.description || "-"}</td>
                      <td><strong>{formatNumber(e.amount)}</strong></td>
                      <td>
                        {e.receiptUrl
                          ? <a href={e.receiptUrl} target="_blank" rel="noreferrer">Xem</a>
                          : "-"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => { setEditingExpense(e); setShowExpenseModal(true); }}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#dc2626" }}
                            onClick={async () => {
                              if (!window.confirm("Xóa khoản chi này?")) return;
                              try {
                                await ProjectExpenseAPI.remove(id, e.id);
                                await loadExpenses();
                              } catch (err) {
                                console.error(err);
                                alert("Xóa thất bại!");
                              }
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ textAlign: "right" }}>
                      <strong>Tổng cộng:</strong>
                    </td>
                    <td colSpan={3}>
                      <strong>{formatNumber(totalExpenseCost)} VND</strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-title">Chưa có khoản chi nào</div>
              <div className="empty-state-subtitle">Hãy thêm chi phí cho dự án này.</div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => { setEditingExpense(null); setShowExpenseModal(true); }}
              >
                + Thêm chi phí
              </button>
            </div>
          )}

          {showExpenseModal && (
            <AddEditProjectExpenseModal
              open={showExpenseModal}
              projectId={id}
              expense={editingExpense}
              onClose={() => { setShowExpenseModal(false); setEditingExpense(null); }}
              onSaved={loadExpenses}
            />
          )}
        </section>
      </div>

      <TaskModal
        open={isModalOpen}
        t={t}
        form={form}
        errors={formErrors}
        saving={savingTask}
        editing={Boolean(editingTask)}
        onChange={handleFormChange}
        onClose={closeModal}
        onSubmit={handleSaveTask}
      />
    </div>
  );
}

function TaskModal({ open, t, form, errors, saving, editing, onChange, onClose, onSubmit }) {
  if (!open) return null;

  const title = editing
    ? t("projects.detail.taskModal.editTitle")
    : t("projects.detail.taskModal.createTitle");
  const submitLabel = saving
    ? t("common.status.loading")
    : editing
      ? t("projects.detail.taskModal.update")
      : t("projects.detail.taskModal.create");

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: 520,
          maxWidth: "95vw",
          borderRadius: 12,
          border: "1px solid rgba(148,163,184,.15)",
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {/* HEADER */}
          <div style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(148,163,184,.15)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <h2 id="task-modal-title" style={{ margin: 0, fontSize: 18 }}>{title}</h2>
            <button type="button" onClick={onClose}
              aria-label={t("common.actions.cancel")}
              style={{ background: "transparent", border: 0, fontSize: 22, cursor: "pointer" }}>
              ×
            </button>
          </div>

          {/* BODY */}
          <div style={{ padding: 16, display: "grid", gap: 12 }}>
            <div>
              <label htmlFor="task-name" style={{ display: "block", marginBottom: 6 }}>
                {t("projects.detail.taskModal.name")}
              </label>
              <input id="task-name" name="name" className="input"
                     value={form.name} onChange={onChange} disabled={saving} />
              {errors.name ? <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>{errors.name}</p> : null}
            </div>

            <div>
              <label htmlFor="task-assignee" style={{ display: "block", marginBottom: 6 }}>
                {t("projects.detail.taskModal.assignee")}
              </label>
              <input id="task-assignee" name="assignee" className="input"
                     value={form.assignee} onChange={onChange} disabled={saving} />
            </div>

            <div>
              <label htmlFor="task-start" style={{ display: "block", marginBottom: 6 }}>
                {t("projects.detail.taskModal.startDate")}
              </label>
              <input id="task-start" type="date" name="startDate" className="input"
                     value={form.startDate} onChange={onChange} disabled={saving} />
              {errors.startDate ? <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>{errors.startDate}</p> : null}
            </div>

            <div>
              <label htmlFor="task-duration" style={{ display: "block", marginBottom: 6 }}>
                {t("projects.detail.taskModal.duration")}
              </label>
              <input id="task-duration" type="number" min="1" name="durationDays" className="input"
                     value={form.durationDays} onChange={onChange} disabled={saving} />
              {errors.durationDays ? <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>{errors.durationDays}</p> : null}
            </div>
          </div>

          {/* FOOTER */}
          <div style={{
            padding: "12px 16px",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            borderTop: "1px solid rgba(148,163,184,.15)",
          }}>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              {t("projects.detail.taskModal.cancel")}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default ProjectDetail;
