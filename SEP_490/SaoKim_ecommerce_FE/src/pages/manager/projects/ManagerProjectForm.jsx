// src/pages/manager/projects/ManagerProjectForm.jsx
import { useEffect, useState } from "react";
import { UserAPI } from "../../../api/users";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Nháp" },
  { value: "Active", label: "Đang triển khai" },
  { value: "Done", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã hủy" },
];

const formatBudgetInput = (raw) => {
  if (raw == null) return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  if (!digits) return "";
  const number = Number(digits);
  if (Number.isNaN(number)) return "";
  return number.toLocaleString("vi-VN");
};

const normalizeBudgetValue = (formatted) =>
  formatted ? Number(String(formatted).replace(/[^\d]/g, "")) : null;

export default function ManagerProjectForm({
  initialValues,
  onSubmit,
  submitting,
}) {
  const [values, setValues] = useState({
    name: "",
    customerName: "",
    customerContact: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
    projectManagerId: "", // string để bind với <select>
  });

  const [pmOptions, setPmOptions] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState("");

  // Load danh sách PM
  useEffect(() => {
    let mounted = true;
    async function loadPms() {
      try {
        setPmLoading(true);
        setPmError("");
        const res = await UserAPI.getProjectManagers();
        const body = res?.data ?? res ?? [];
        const list = Array.isArray(body) ? body : body.data ?? [];
        if (mounted) {
          setPmOptions(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setPmOptions([]);
          setPmError("Không thể tải danh sách PM.");
        }
      } finally {
        if (mounted) setPmLoading(false);
      }
    }

    loadPms();
    return () => {
      mounted = false;
    };
  }, []);

  // Bind initial values (khi edit)
  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({
        ...prev,
        name: initialValues.name ?? "",
        customerName: initialValues.customerName ?? "",
        customerContact: initialValues.customerContact ?? "",
        status: initialValues.status ?? "Draft",
        startDate: initialValues.startDate
          ? initialValues.startDate.substring(0, 10)
          : "",
        endDate: initialValues.endDate
          ? initialValues.endDate.substring(0, 10)
          : "",
        budget: formatBudgetInput(initialValues.budget),
        description: initialValues.description ?? "",
        projectManagerId:
          initialValues.projectManagerId != null
            ? String(initialValues.projectManagerId)
            : "",
      }));
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    if (name === "budget") {
      setValues((prev) => ({ ...prev, budget: formatBudgetInput(value) }));
      return;
    }
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedBudget = normalizeBudgetValue(values.budget);

    const payload = {
      ...values,
      budget: normalizedBudget,
      projectManagerId: values.projectManagerId
        ? Number(values.projectManagerId)
        : null,
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="manager-form">
      <div className="manager-form__field">
        <label>Tên dự án *</label>
        <input
          name="name"
          value={values.name}
          onChange={handleChange}
          required
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Trạng thái</label>
        <select
          name="status"
          value={values.status}
          onChange={handleChange}
          className="manager-form__control"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="manager-form__field">
        <label>Người phụ trách dự án (PM)</label>
        <select
          name="projectManagerId"
          value={values.projectManagerId}
          onChange={handleChange}
          className="manager-form__control"
          disabled={pmLoading}
        >
          <option value="">Chưa phân công</option>
          {pmOptions.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name || pm.email}
            </option>
          ))}
        </select>
        {pmError && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {pmError}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Tên khách hàng</label>
        <input
          name="customerName"
          value={values.customerName}
          onChange={handleChange}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Liên hệ khách hàng</label>
        <input
          name="customerContact"
          value={values.customerContact}
          onChange={handleChange}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Ngày bắt đầu</label>
        <input
          type="date"
          name="startDate"
          value={values.startDate}
          onChange={handleChange}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Ngày kết thúc</label>
        <input
          type="date"
          name="endDate"
          value={values.endDate}
          onChange={handleChange}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field">
        <label>Giá trị dự án (VND)</label>
        <input
          name="budget"
          value={values.budget}
          onChange={handleChange}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__field" style={{ gridColumn: "1 / -1" }}>
        <label>Mô tả chi tiết</label>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          rows={4}
          className="manager-form__control"
        />
      </div>

      <div className="manager-form__actions">
        <button
          type="submit"
          className="manager-btn manager-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Đang lưu..." : "Lưu dự án"}
        </button>
      </div>
    </form>
  );
}