const PROJECT_STATUSES = [
  { value: "Draft", label: "Bản nháp", tone: "neutral" },
  { value: "Active", label: "Đang triển khai", tone: "warning" },
  { value: "InProgress", label: "Đang thực hiện", tone: "warning" },
  { value: "Delivered", label: "Đã bàn giao", tone: "success" },
  { value: "Done", label: "Hoàn thành", tone: "success" },
  { value: "Cancelled", label: "Đã hủy", tone: "danger" },
];

const STATUS_LOOKUP = PROJECT_STATUSES.reduce((acc, status) => {
  acc[status.value] = status;
  return acc;
}, {});

const BADGE_TONE_CLASS = {
  success: "badge badge-status badge-status--success",
  warning: "badge badge-status badge-status--warning",
  danger: "badge badge-status badge-status--danger",
  neutral: "badge badge-status badge-status--neutral",
};

const numberFormatters = {
  vi: new Intl.NumberFormat("vi-VN"),
};

const dateLocales = {
  vi: "vi-VN",
};

const formatNumber = (value, lang = "vi") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "";
  const formatter = numberFormatters[lang] || numberFormatters.vi;
  return formatter.format(value);
};

const formatBudget = (value, lang = "vi") => {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  const formatter = numberFormatters[lang] || numberFormatters.vi;
  return `${formatter.format(value)} VND`;
};

const formatBudgetCompact = (value, lang = "vi") => {
  if (typeof value !== "number" || Number.isNaN(value)) return "0";
  const formatter = numberFormatters[lang] || numberFormatters.vi;
  return formatter.format(value);
};

const formatDate = (value, lang = "vi") => {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(dateLocales[lang] || dateLocales.vi);
  } catch {
    return "-";
  }
};

const getStatusMeta = (status) => STATUS_LOOKUP[status] ?? STATUS_LOOKUP.Draft;

const getStatusBadgeClass = (status) => {
  const meta = getStatusMeta(status);
  return BADGE_TONE_CLASS[meta.tone] ?? BADGE_TONE_CLASS.neutral;
};

const getStatusLabel = (status) => getStatusMeta(status).label;

export {
  PROJECT_STATUSES,
  STATUS_LOOKUP,
  BADGE_TONE_CLASS,
  formatBudget,
  formatBudgetCompact,
  formatDate,
  formatNumber,
  getStatusMeta,
  getStatusBadgeClass,
  getStatusLabel,
};
