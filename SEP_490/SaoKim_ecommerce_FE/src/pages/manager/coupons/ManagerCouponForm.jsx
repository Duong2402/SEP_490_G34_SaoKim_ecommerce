import { useEffect, useState } from "react";

const DEFAULT_FORM = {
  code: "",
  name: "",
  description: "",
  discountType: "Percentage",
  discountValue: "",
  minOrderAmount: "",
  maxUsage: "",
  perUserLimit: "",
  startDate: "",
  endDate: "",
  status: "Draft",
};

const STATUS_OPTIONS = [
  { value: "Draft", label: "Nháp" },
  { value: "Scheduled", label: "Đã lên lịch" },
  { value: "Active", label: "Đang chạy" },
  { value: "Inactive", label: "Tạm dừng" },
  { value: "Expired", label: "Đã hết hạn" },
];

export default function ManagerCouponForm({ initialValues, submitting, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!initialValues) return;
    setForm({
      code: initialValues.code ?? "",
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      discountType: initialValues.discountType ?? "Percentage",
      discountValue: initialValues.discountValue ?? "",
      minOrderAmount: initialValues.minOrderAmount ?? "",
      maxUsage: initialValues.maxUsage ?? "",
      perUserLimit: initialValues.perUserLimit ?? "",
      startDate: initialValues.startDate ? initialValues.startDate.substring(0, 16) : "",
      endDate: initialValues.endDate ? initialValues.endDate.substring(0, 16) : "",
      status: initialValues.status ?? "Draft",
    });
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description || null,
      discountType: form.discountType,
      discountValue: form.discountValue ? Number(form.discountValue) : 0,
      minOrderAmount: form.minOrderAmount === "" ? null : Number(form.minOrderAmount),
      maxUsage: form.maxUsage === "" ? null : Number(form.maxUsage),
      perUserLimit: form.perUserLimit === "" ? null : Number(form.perUserLimit),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      status: form.status,
    });
  };

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <div className="manager-form__field">
        <label>Mã coupon *</label>
        <input
          className="manager-form__control"
          name="code"
          maxLength={20}
          required
          value={form.code}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Tên chiến dịch *</label>
        <input
          className="manager-form__control"
          name="name"
          required
          value={form.name}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field" style={{ gridColumn: "1 / -1" }}>
        <label>Mô tả</label>
        <textarea
          className="manager-form__control"
          name="description"
          rows={3}
          value={form.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Loại ưu đãi</label>
        <select
          className="manager-form__control"
          name="discountType"
          value={form.discountType}
          onChange={handleChange}
          disabled={submitting}
        >
          <option value="Percentage">Phần trăm</option>
          <option value="FixedAmount">Số tiền cố định</option>
        </select>
      </div>

      <div className="manager-form__field">
        <label>Giá trị ưu đãi *</label>
        <input
          className="manager-form__control"
          type="number"
          min="0"
          step="1"
          name="discountValue"
          value={form.discountValue}
          onChange={handleChange}
          disabled={submitting}
          required
        />
      </div>

      <div className="manager-form__field">
        <label>Đơn hàng tối thiểu (VND)</label>
        <input
          className="manager-form__control"
          type="number"
          min="0"
          step="1000"
          name="minOrderAmount"
          value={form.minOrderAmount}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Tổng số lần sử dụng</label>
        <input
          className="manager-form__control"
          type="number"
          min="0"
          step="1"
          name="maxUsage"
          value={form.maxUsage}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Giới hạn mỗi khách</label>
        <input
          className="manager-form__control"
          type="number"
          min="0"
          step="1"
          name="perUserLimit"
          value={form.perUserLimit}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Bắt đầu</label>
        <input
          className="manager-form__control"
          type="datetime-local"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Kết thúc</label>
        <input
          className="manager-form__control"
          type="datetime-local"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>

      <div className="manager-form__field">
        <label>Trạng thái</label>
        <select
          className="manager-form__control"
          name="status"
          value={form.status}
          onChange={handleChange}
          disabled={submitting}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="manager-form__actions">
        <button type="submit" className="manager-btn manager-btn--primary" disabled={submitting}>
          {submitting ? "Đang lưu..." : "Lưu coupon"}
        </button>
      </div>
    </form>
  );
}
