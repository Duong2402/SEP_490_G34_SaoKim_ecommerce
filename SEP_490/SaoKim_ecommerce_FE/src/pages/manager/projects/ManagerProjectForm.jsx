// src/pages/manager/projects/ManagerProjectForm.jsx
import { useEffect, useState } from "react";

const STATUS_OPTIONS = [
  { value: "Draft", label: "Nháp" },
  { value: "Active", label: "Đang triển khai" },
  { value: "Done", label: "Hoàn thành" },
  { value: "Cancelled", label: "Đã hủy" },
];

export default function ManagerProjectForm({ initialValues, onSubmit, submitting }) {
  const [values, setValues] = useState({
    name: "",
    customerName: "",
    customerContact: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    budget: "",
    description: "",
  });

  useEffect(() => {
    if (initialValues) {
      setValues({
        name: initialValues.name ?? "",
        customerName: initialValues.customerName ?? "",
        customerContact: initialValues.customerContact ?? "",
        status: initialValues.status ?? "Draft",
        startDate: initialValues.startDate ? initialValues.startDate.substring(0, 10) : "",
        endDate: initialValues.endDate ? initialValues.endDate.substring(0, 10) : "",
        budget: initialValues.budget ?? "",
        description: initialValues.description ?? "",
      });
    }
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(values);
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
