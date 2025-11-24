const PROJECT_STATUSES = [
  { value: "Draft", labelKey: "projects.statusLabels.Draft", tone: "neutral" },
  { value: "InProgress", labelKey: "projects.statusLabels.InProgress", tone: "warning" },
  { value: "Delivered", labelKey: "projects.statusLabels.Delivered", tone: "success" },
  { value: "Done", labelKey: "projects.statusLabels.Done", tone: "success" },
  { value: "Cancelled", labelKey: "projects.statusLabels.Cancelled", tone: "danger" },
];

const STATUS_LOOKUP = PROJECT_STATUSES.reduce((acc, status) => {
  acc[status.value] = status;
  return acc;
}, {});

const BADGE_TONE_CLASS = {
  success: "badge badge-success",
  warning: "badge badge-warning",
  danger: "badge badge-danger",
  neutral: "badge badge-neutral",
};

const numberFormatters = {
  vi: new Intl.NumberFormat("vi-VN"),
};

const dateLocales = {
  vi: "vi-VN",
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

const getStatusLabel = (status, t) => {
  const meta = getStatusMeta(status);
  return t(meta.labelKey);
};

export {
  PROJECT_STATUSES,
  STATUS_LOOKUP,
  BADGE_TONE_CLASS,
  formatBudget,
  formatBudgetCompact,
  formatDate,
  getStatusMeta,
  getStatusBadgeClass,
  getStatusLabel,
};
