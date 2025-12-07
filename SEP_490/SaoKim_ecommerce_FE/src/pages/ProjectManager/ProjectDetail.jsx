﻿// src/pages/ProjectManager/ProjectDetail.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { createPortal } from "react-dom";
import "dayjs/locale/vi";
import { ProjectAPI, TaskAPI } from "../../api/ProjectManager/projects";
import { ProjectProductAPI } from "../../api/ProjectManager/project-products";
import { ProjectExpenseAPI } from "../../api/ProjectManager/project-expenses";
import {
  formatBudget,
  formatDate,
  getStatusBadgeClass,
  getStatusLabel,
  formatNumber,
} from "./projectHelpers";
import AddEditProjectProductModal from "../../components/AddEditProjectProductModal.jsx";
import MultiAddProjectProductsModal from "../../components/MultiAddProjectProductsModal.jsx";
import AddEditProjectExpenseModal from "../../components/AddEditProjectExpenseModal.jsx";

const UI_TO_BE = {

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
const lang = "vi";

const COPY = {
  "common.actions.edit": "Chỉnh sửa",
  "common.actions.cancel": "Hủy",
  "common.status.loading": "Đang tải...",
  "projects.detail.actions.addTask": "Thêm công việc",
  "projects.detail.actions.backToList": "Quay lại danh sách",
  "projects.detail.budget": "Giá trị dự án",
  "projects.detail.budgetHint": "Giá trị dự án dự kiến cho toàn bộ dự án.",
  "projects.detail.customer": "Khách hàng",
  "projects.detail.customerContactEmpty": "Chưa có thông tin liên hệ.",
  "projects.detail.customerEmpty": "Chưa có khách hàng.",
  "projects.detail.description": "Mô tả",
  "projects.detail.descriptionEmpty": "Chưa có mô tả.",
  "projects.detail.legendHint":
    "Bấm vào ô để chuyển luân phiên: Chưa thực hiện -> Đang làm -> Hoàn thành -> Trễ hạn -> Xóa.",
  "projects.detail.loadingProject": "Đang tải dự án...",
  "projects.detail.loadingTasks": "Đang tải công việc...",
  "projects.detail.messages.saveTaskFailure": "Không thể lưu công việc.",
  "projects.detail.messages.updateDayFailure": "Không cập nhật được trạng thái ngày.",
  "projects.detail.metrics.completed": "Đã hoàn thành",
  "projects.detail.metrics.completedHint": "Đã đánh dấu xong",
  "projects.detail.metrics.delayed": "Chậm tiến độ",
  "projects.detail.metrics.delayedHint": "Cần theo dõi",
  "projects.detail.metrics.progress": "Tiến độ",
  "projects.detail.metrics.progressHint": "Dựa trên công việc đã hoàn thành",
  "projects.detail.metrics.total": "Tổng số công việc",
  "projects.detail.metrics.totalHint": "{{active}} đang hoạt động",
  "projects.detail.nextMonth": "Tháng sau",
  "projects.detail.noStatus": "Chưa có trạng thái",
  "projects.detail.notFoundSubtitle":
    "Không tìm thấy dự án này. Có thể dự án đã bị xóa hoặc bạn không có quyền truy cập.",
  "projects.detail.notFoundTitle": "Không tìm thấy dự án",
  "projects.detail.previousMonth": "Tháng trước",
  "projects.detail.searchPlaceholder": "Tìm công việc theo tên hoặc người phụ trách",
  "projects.detail.subtitle": "Mã dự án {{code}}.",
  "projects.detail.subtitleFallback": "Xem chi tiết thời gian, người phụ trách và giá trị dự án.",
  "projects.detail.taskDuration": "{{count}} ngày",
  "projects.detail.taskEmptySubtitle": "Thêm công việc để lập kế hoạch và phân công người phụ trách.",
  "projects.detail.taskEmptyTitle": "Chưa có công việc",
  "projects.detail.taskModal.assignee": "Người phụ trách",
  "projects.detail.taskModal.cancel": "Hủy",
  "projects.detail.taskModal.create": "Tạo công việc",
  "projects.detail.taskModal.createTitle": "Tạo công việc",
  "projects.detail.taskModal.duration": "Thời lượng (ngày)",
  "projects.detail.taskModal.editTitle": "Chỉnh sửa công việc",
  "projects.detail.taskModal.name": "Tên công việc",
  "projects.detail.taskModal.startDate": "Ngày bắt đầu",
  "projects.detail.taskModal.update": "Lưu thay đổi",
  "projects.detail.taskModal.validations.duration": "Thời lượng phải từ 1 ngày trở lên.",
  "projects.detail.taskModal.validations.name": "Vui lòng nhập tên công việc.",
  "projects.detail.taskModal.validations.startDate": "Chọn ngày bắt đầu.",
  "projects.detail.taskTable.assignee": "Phụ trách",
  "projects.detail.taskTable.duration": "Thời lượng",
  "projects.detail.taskTable.name": "Công việc",
  "projects.detail.taskTable.overallStatus": "Trạng thái chung",
  "projects.detail.taskTable.start": "Ngày bắt đầu",
  "projects.detail.tasksSubtitle": "Quản lý phân công và cập nhật theo từng ngày trong tháng.",
  "projects.detail.tasksTitle": "Lịch công việc",
  "projects.detail.timeline": "Tiến độ",
  "projects.detail.timelineHint": "Kéo dài khoảng {{days}} ngày.",
  "projects.detail.unassigned": "Chưa phân công",
  "projects.detail.untitledTask": "Chưa đặt tên",
  "projects.detail.taskStatus.Pending": "Chưa thực hiện",
  "projects.detail.taskStatus.Doing": "Đang làm",
  "projects.detail.taskStatus.Done": "Hoàn thành",
  "projects.detail.taskStatus.Delayed": "Trễ hạn",
};

const interpolate = (template, params) =>
  typeof template === "string" && params
    ? template.replace(/\{\{(\w+)\}\}/g, (_, key) => (key in params ? params[key] : ""))
    : template;

const t = (key, params) => {
  const value = COPY[key];
  if (typeof value === "string") return interpolate(value, params);
  return key;
};

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

const isInTaskRange = (task, dateObj) => {
  if (!task?.startDate || !task?.durationDays) return false;
  const start = dayjs(task.startDate);
  if (!start.isValid()) return false;
  const duration = Number(task.durationDays) || 0;
  if (duration < 1) return false;
  const end = start.add(duration - 1, "day");
  return (dateObj.isSame(start, "day") || dateObj.isSame(end, "day")) || (dateObj.isAfter(start, "day") && dateObj.isBefore(end, "day"));
};

const buildDefaultForm = (referenceMonth) => {
  const today = dayjs().startOf("day");
  const start = referenceMonth.isBefore(today, "day") ? today : referenceMonth;
  return {
    name: "",
    assignee: "",
    startDate: start.format("YYYY-MM-DD"),
    durationDays: "1",
  };
};

const LEGEND_ITEMS = ["Pending", "Doing", "Done", "Delayed"];
const DAY_HEADERS = ["Hai", "Ba", "Tư", "Năm", "Sáu", "Bảy", "CN"];

function ProjectDetail() {
  const { id } = useParams();
  const timelineRef = useRef(null);

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
  const [showRangePicker, setShowRangePicker] = useState(false);
  const [rangeStart, setRangeStart] = useState(dayjs().format("YYYY-MM-DD"));
  const [rangeEnd, setRangeEnd] = useState(dayjs().add(6, "day").format("YYYY-MM-DD"));
  const [dayPickerTask, setDayPickerTask] = useState(null);

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
  const monthLabel = month.locale("vi").format("MMMM YYYY");

  const openCreateTask = () => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm công việc.");
      return;
    }
    setEditingTask(null);
    setForm(buildDefaultForm(month));
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditTask = (task) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể chỉnh sửa công việc.");
      return;
    }
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
    const today = dayjs().startOf("day");
    if (!form.name.trim()) {
      errors.name = t("projects.detail.taskModal.validations.name");
    }
    if (!form.startDate) {
      errors.startDate = t("projects.detail.taskModal.validations.startDate");
    } else {
      const start = dayjs(form.startDate);
      if (!start.isValid() || start.isBefore(today, "day")) {
        errors.startDate = "Ngày bắt đầu phải từ hôm nay trở đi.";
      }
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

  const scrollToDay = useCallback(
    (day) => {
      if (!timelineRef.current) return;
      const target = typeof day === "string" ? day : day.format("YYYY-MM-DD");
      const el = timelineRef.current.querySelector(`[data-date="${target}"]`);
      if (el) {
        const container = timelineRef.current;
        const left = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2;
        container.scrollTo({ left: Math.max(left, 0), behavior: "smooth" });
      }
    },
    [timelineRef],
  );

  const handleDeleteTask = async (taskId) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể xóa công việc.");
      return;
    }
    if (!window.confirm("Bạn chắc chắn muốn xóa công việc này?")) return;
    try {
      await TaskAPI.remove(id, taskId);
      await loadTasks();
    } catch (error) {
      console.error(error);
      alert("Không thể xóa công việc.");
    }
  };

  // --- Product guards ---
  const openAddProduct = () => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm/chỉnh sửa sản phẩm.");
      return;
    }
    setEditingProduct(null);
    setShowAddProductModal(true);
  };

  const openEditProduct = (item) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm/chỉnh sửa sản phẩm.");
      return;
    }
    setEditingProduct(item);
    setShowAddProductModal(true);
  };

  const handleDeleteProduct = async (item) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể xóa sản phẩm.");
      return;
    }
    if (!window.confirm("Bạn chắc chắn muốn xóa sản phẩm này?")) return;
    try {
      await ProjectProductAPI.remove(id, item.id);
      await loadProducts();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại!");
    }
  };

  const openMultiAddProducts = () => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm sản phẩm.");
      return;
    }
    setShowMultiAddModal(true);
  };

  // --- Expense guards ---
  const openAddExpense = () => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm/chỉnh sửa chi phí.");
      return;
    }
    setEditingExpense(null);
    setShowExpenseModal(true);
  };

  const openEditExpense = (expense) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể thêm/chỉnh sửa chi phí.");
      return;
    }
    setEditingExpense(expense);
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (expense) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể xóa chi phí.");
      return;
    }
    if (!window.confirm("Bạn chắc chắn muốn xóa khoản chi này?")) return;
    try {
      await ProjectExpenseAPI.remove(id, expense.id);
      await loadExpenses();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại!");
    }
  };

  const handleCellClick = async (task, dateKey) => {
    if (isProjectDone) {
      alert("Dự án đã hoàn thành, không thể cập nhật trạng thái công việc.");
      return;
    }
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
    if (dayPickerTask?.id === nextTask.id) {
      setDayPickerTask(nextTask);
    }

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
  const goToToday = () => {
    const todayDate = dayjs();
    if (todayDate.isSame(month, "month")) {
      scrollToDay(todayDate);
    } else {
      setMonth(todayDate.startOf("month"));
      setTimeout(() => scrollToDay(todayDate), 50);
    }
  };
  const goToEndOfMonth = () => {
    const end = month.endOf("month");
    scrollToDay(end);
  };

  const applyRangeSelection = () => {
    const start = dayjs(rangeStart);
    const end = dayjs(rangeEnd);
    if (!start.isValid() || !end.isValid() || end.isBefore(start, "day")) {
      alert("Khoảng ngày không hợp lệ.");
      return;
    }
    setMonth(start.startOf("month"));
    setShowRangePicker(false);
  };

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
      <div className="pm-page">
        <div className="panel loading-state">{t("projects.detail.loadingProject")}</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="pm-page">
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

  const isProjectDone = project.status === "Done";

  return (
    <div className="pm-page">
      <div className="project-detail">
        <section className="panel project-hero">
          <div className="project-hero__top">
            <div>
              <div className="project-hero__badges">
                {project.code ? <span className="project-hero__code">#{project.code}</span> : null}
                <span className={getStatusBadgeClass(project.status)}>
                  <span className="badge-dot" />
                  {getStatusLabel(project.status)}
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
              <div>
                <button type="button" className="btn btn-primary" onClick={openCreateTask}>
                  + Thêm công việc
                </button>
              </div>
            </div>
          </div>

          {showRangePicker &&
            createPortal(
              <div className="pm-modal" onClick={() => setShowRangePicker(false)}>
                <div
                  className="pm-modal__dialog"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="task-range-picker"
                  onClick={(e) => e.stopPropagation()}
                  style={{ maxWidth: 480 }}
                >
                  <div className="pm-modal__header">
                    <div>
                      <h3 id="task-range-picker" className="pm-modal__title">
                        Chọn ngày theo dõi
                      </h3>
                      <p className="pm-modal__subtitle">
                        Chọn khoảng ngày để nhảy nhanh tới dải thời gian cần xem.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="pm-modal__close"
                      aria-label="Đóng"
                      onClick={() => setShowRangePicker(false)}
                    >
                      ×
                    </button>
                  </div>
                  <div className="pm-modal__body">
                    <div className="pm-modal__grid" style={{ marginBottom: 12 }}>
                      <div className="pm-field">
                        <label className="pm-field__label">Từ ngày</label>
                        <input
                          type="date"
                          className="input"
                          value={rangeStart}
                          onChange={(e) => setRangeStart(e.target.value)}
                        />
                      </div>
                      <div className="pm-field">
                        <label className="pm-field__label">Đến ngày</label>
                        <input
                          type="date"
                          className="input"
                          value={rangeEnd}
                          onChange={(e) => setRangeEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      {[7, 15, 30].map((days) => (
                        <button
                          key={days}
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            const start = dayjs();
                            setRangeStart(start.format("YYYY-MM-DD"));
                            setRangeEnd(start.add(days - 1, "day").format("YYYY-MM-DD"));
                          }}
                        >
                          {days} ngày
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="pm-modal__footer">
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setShowRangePicker(false)}
                    >
                      Hủy
                    </button>
                    <button type="button" className="btn btn-primary" onClick={applyRangeSelection}>
                      Chọn ngày
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )}

          {loadingTasks ? (
            <div className="loading-state">{t("projects.detail.loadingTasks")}</div>
          ) : sortedTasks.length ? (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Công việc</th>
                    <th>Phụ trách</th>
                    <th>Bắt đầu</th>
                    <th>Kết thúc</th>
                    <th>Trạng thái</th>
                    <th style={{ width: 140, textAlign: "right" }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks
                    .filter((task) => {
                      const start = dayjs(task.startDate);
                      const duration = Number(task.durationDays) || 0;
                      const end = duration > 0 ? start.add(duration - 1, "day") : start;
                      const from = dayjs(rangeStart);
                      const to = dayjs(rangeEnd);
                      if (!from.isValid() || !to.isValid()) return true;
                      const overlaps =
                        (start.isSame(from, "day") || start.isAfter(from, "day")) &&
                        (start.isSame(to, "day") || start.isBefore(to, "day"));
                      const endInside =
                        (end.isSame(from, "day") || end.isAfter(from, "day")) &&
                        (end.isSame(to, "day") || end.isBefore(to, "day"));
                      const spanCoversRange =
                        start.isBefore(from, "day") && end.isAfter(to, "day");
                      return overlaps || endInside || spanCoversRange;
                    })
                    .map((task) => {
                      const overall = getOverallStatusUI(task);
                      const start = dayjs(task.startDate);
                      const duration = Number(task.durationDays) || 0;
                      const end = duration > 0 ? start.add(duration - 1, "day") : start;
                      const displayName = task.name || t("projects.detail.untitledTask");
                      const assignee = task.assignee || t("projects.detail.unassigned");
                      return (
                        <tr key={task.id}>
                          <td>{displayName}</td>
                          <td>{assignee}</td>
                          <td>{formatDate(task.startDate, lang)}</td>
                          <td>{formatDate(end, lang)}</td>
                          <td>
                            <span className={getStatusBadgeClass(overall)}>
                              <span className="badge-dot" />
                              {t(`projects.detail.taskStatus.${overall}`)}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                gap: 6,
                                justifyContent: "flex-end",
                                alignItems: "center",
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-outline btn-compact"
                                onClick={() => openEditTask(task)}
                              >
                                {t("common.actions.edit")}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline btn-compact"
                                onClick={() => setDayPickerTask(task)}
                              >
                                Chọn ngày
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-compact"
                                style={{ color: "#dc2626" }}
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
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

        {dayPickerTask &&
          createPortal(
            <div className="pm-modal" onClick={() => setDayPickerTask(null)}>
              <div
                className="pm-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-day-picker"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: 520 }}
              >
                <div className="pm-modal__header">
                  <div>
                    <h3 id="task-day-picker" className="pm-modal__title">
                      Chọn ngày theo dõi - {dayPickerTask.name || "Không tên"}
                    </h3>
                    <p className="pm-modal__subtitle">
                      Nhấp vào ngày để chuyển trạng thái: Chưa thực hiện → Đang làm → Hoàn thành → Trễ hạn → Xóa.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="pm-modal__close"
                    aria-label="Đóng"
                    onClick={() => setDayPickerTask(null)}
                  >
                    ×
                  </button>
                </div>
                <div className="pm-modal__body">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 12,
                    }}
                  >
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

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, textAlign: "center", marginBottom: 6 }}>
                    {DAY_HEADERS.map((d) => (
                      <div key={d} style={{ fontWeight: 600, color: "#0f172a" }}>
                        {d}
                      </div>
                    ))}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                    {(() => {
                      const startMonth = month.startOf("month");
                      const leading = (startMonth.day() + 6) % 7; // Monday-first offset
                      const blanks = Array.from({ length: leading }, (_, i) => (
                        <div key={`blank-${i}`} />
                      ));
                      const dayCells = daysInView.map((date) => {
                        const key = date.format("YYYY-MM-DD");
                        const dayEntry = dayPickerTask.days?.find((entry) => entry.date === key);
                        const inRange = isInTaskRange(dayPickerTask, date);
                        const statusColor = dayEntry ? STATUS_COLORS[dayEntry.status] || DEFAULT_CELL_COLOR : undefined;
                        const bg = statusColor || (inRange ? "rgba(78, 52, 226, 1)" : "#fff");
                        return (
                          <button
                            key={key}
                            type="button"
                            data-date={key}
                            onClick={() => handleCellClick(dayPickerTask, key)}
                            title={
                              dayEntry
                                ? t(`projects.detail.taskStatus.${dayEntry.status}`)
                                : t("projects.detail.noStatus")
                            }
                            style={{
                              height: 64,
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              background: bg,
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                              color: "#0f172a",
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>{date.format("D")}</div>
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
                              {dayEntry ? t(`projects.detail.taskStatus.${dayEntry.status}`) : "Trống"}
                            </div>
                          </button>
                        );
                      });
                      return [...blanks, ...dayCells];
                    })()}
                  </div>
                </div>
                <div className="pm-modal__footer">
                  <button type="button" className="btn" onClick={() => setDayPickerTask(null)}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}

        {/* ---- PROJECT PRODUCTS ---- */}
        <section className="panel">
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">Sản phẩm sử dụng</h2>
              <p className="project-section-subtitle">
                Danh sách sản phẩm thuộc dự án này, bao gồm số lượng và đơn giá.
              </p>
            </div>
            <div className="actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={openMultiAddProducts}
              >
                + Thêm nhiều sản phẩm
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openAddProduct}
              >
                + Thêm sản phẩm
              </button>
            </div>
          </div>

          {loadingProducts ? (
            <div className="loading-state">Đang tải danh sách sản phẩm...</div>
          ) : products.length ? (
            <div className="table-responsive">
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
                      <td>
                        <strong>{formatNumber(item.total)}</strong>
                      </td>
                      <td>{item.note || "-"}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openEditProduct(item)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#dc2626" }}
                            onClick={() => handleDeleteProduct(item)}
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
                      <strong>
                        {formatNumber(
                          products.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
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
              <div className="empty-state-subtitle">
                Hãy thêm sản phẩm cho dự án này.
              </div>
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
              existingProductIds={(products || []).map((item) => item.productId)}
              onClose={() => setShowMultiAddModal(false)}
              onSaved={loadProducts}
            />
          )}
        </section>{/* ---- PROJECT EXPENSES (OTHER COSTS) ---- */}
        <section className="panel" style={{ marginTop: 16 }}>
          <div className="project-section-header">
            <div>
              <h2 className="project-section-title">Hạch toán</h2>
              <p className="project-section-subtitle">
                Quản lý các khoản chi liên quan đến dự án (mua hàng phụ trợ, vận chuyển, lắp đặt, v.v.).
              </p>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={openAddExpense}
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
              <div className="project-overview__label">Kế hoạch (giá trị dự án)</div>
              <div className="project-overview__value">
                {formatBudget(project.budget, lang)}
              </div>
              <div className="project-overview__description">Giá trị dự án đã duyệt.</div>
            </div>
            <div className="project-overview__card">
              <div className="project-overview__label">Thực tế (tổng)</div>
              <div className="project-overview__value">
                {formatBudget(totalActualAllIn, lang)}
              </div>
              <div className="project-overview__description">
                Gồm sản phẩm {formatBudget(totalProductCost, lang)} + chi phí khác {formatBudget(totalExpenseCost, lang)}.
              </div>
            </div>
            <div className="project-overview__card">
              <div className="project-overview__label">Chênh lệch</div>
              <div
                className="project-overview__value"
                style={{ color: variance < 0 ? "#dc2626" : "#16a34a" }}
              >
                {formatBudget(variance, lang)}
              </div>
              <div className="project-overview__description">
                {variance < 0 ? "Vượt giá trị dự án" : "Còn trong giá trị dự án"}
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
                            onClick={() => openEditExpense(e)}
                          >
                            Sửa
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "#dc2626" }}
                            onClick={() => handleDeleteExpense(e)}
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
                onClick={openAddExpense}
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
    <div className="pm-modal" onClick={onClose}>
      <div
        className="pm-modal__dialog pm-modal__dialog--narrow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="pm-modal__header">
            <div>
              <h2 id="task-modal-title" className="pm-modal__title">
                {title}
              </h2>
              <p className="pm-modal__subtitle">
                Khai báo công việc, người phụ trách và thời gian thực hiện.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t("common.actions.cancel")}
              className="pm-modal__close"
            >
              ×
            </button>
          </div>

          <div className="pm-modal__body pm-modal__grid pm-modal__section">
            <div className="pm-field">
              <label htmlFor="task-name" className="pm-field__label">
                {t("projects.detail.taskModal.name")}
              </label>
              <input
                id="task-name"
                name="name"
                className="input"
                value={form.name}
                onChange={onChange}
                disabled={saving}
              />
              {errors.name ? (
                <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>{errors.name}</p>
              ) : (
                <span className="pm-field__hint">Ví dụ: Lắp đặt chiếu sáng tầng 2.</span>
              )}
            </div>

            <div className="pm-field">
              <label htmlFor="task-assignee" className="pm-field__label">
                {t("projects.detail.taskModal.assignee")}
              </label>
              <input
                id="task-assignee"
                name="assignee"
                className="input"
                value={form.assignee}
                onChange={onChange}
                disabled={saving}
                placeholder="Nhập người phụ trách"
              />
            </div>

            <div className="pm-field">
              <label htmlFor="task-start" className="pm-field__label">
                {t("projects.detail.taskModal.startDate")}
              </label>
              <input
                id="task-start"
                type="date"
                name="startDate"
                className="input"
                value={form.startDate}
                onChange={onChange}
                disabled={saving}
              />
              {errors.startDate ? (
                <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>{errors.startDate}</p>
              ) : null}
            </div>

            <div className="pm-field">
              <label htmlFor="task-duration" className="pm-field__label">
                {t("projects.detail.taskModal.duration")}
              </label>
              <input
                id="task-duration"
                type="number"
                min="1"
                name="durationDays"
                className="input"
                value={form.durationDays}
                onChange={onChange}
                disabled={saving}
              />
              {errors.durationDays ? (
                <p style={{ marginTop: 4, color: "#b91c1c", fontSize: 12 }}>
                  {errors.durationDays}
                </p>
              ) : (
                <span className="pm-field__hint">Số ngày thực hiện.</span>
              )}
            </div>
          </div>

          <div className="pm-modal__footer">
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
    document.body,
  );
}
export default ProjectDetail;
