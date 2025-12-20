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

// Format số thành định dạng VND với dấu chấm phân cách hàng nghìn (vd: 100.000)
const formatVND = (value) => {
  if (!value && value !== 0) return "";
  const numStr = String(value).replace(/\D/g, ""); // Chỉ giữ lại số
  if (!numStr) return "";
  return numStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Parse chuỗi VND thành số (vd: "100.000" -> 100000)
const parseVND = (formattedValue) => {
  if (!formattedValue) return "";
  const numStr = String(formattedValue).replace(/\./g, ""); // Xóa dấu chấm
  return numStr ? Number(numStr) : "";
};

export default function ManagerCouponForm({ initialValues, submitting, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  // State riêng để lưu giá trị hiển thị đã format cho FixedAmount
  const [displayDiscountValue, setDisplayDiscountValue] = useState("");

  useEffect(() => {
    if (!initialValues) return;
    const discountType = initialValues.discountType ?? "Percentage";
    const discountValue = initialValues.discountValue ?? "";

    setForm({
      code: initialValues.code ?? "",
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      discountType: discountType,
      discountValue: discountValue,
      minOrderAmount: initialValues.minOrderAmount ?? "",
      maxUsage: initialValues.maxUsage ?? "",
      perUserLimit: initialValues.perUserLimit ?? "",
      startDate: initialValues.startDate ? initialValues.startDate.substring(0, 16) : "",
      endDate: initialValues.endDate ? initialValues.endDate.substring(0, 16) : "",
      status: initialValues.status ?? "Draft",
    });

    // Format giá trị hiển thị nếu là FixedAmount
    if (discountType === "FixedAmount" && discountValue) {
      setDisplayDiscountValue(formatVND(discountValue));
    } else {
      setDisplayDiscountValue(String(discountValue));
    }
  }, [initialValues]);

  // Validate discount value based on discount type
  const validateDiscountValue = (value, discountType) => {
    if (!value && value !== 0) return "";
    const numValue = Number(value);
    if (isNaN(numValue)) return "Giá trị ưu đãi phải là số";
    if (numValue < 0) return "Giá trị ưu đãi phải lớn hơn 0";
    if (discountType === "Percentage" && numValue > 99) {
      return "Giá trị phần trăm không được vượt quá 99%";
    }
    return "";
  };

  // Xử lý thay đổi giá trị ưu đãi với format VND
  const handleDiscountValueChange = (event) => {
    const { value } = event.target;

    if (form.discountType === "FixedAmount") {
      // Cho FixedAmount: format với dấu chấm
      const rawValue = parseVND(value);
      const formattedValue = formatVND(value);

      setDisplayDiscountValue(formattedValue);
      setForm((prev) => ({ ...prev, discountValue: rawValue }));

      const error = validateDiscountValue(rawValue, "FixedAmount");
      setErrors((prevErrors) => ({ ...prevErrors, discountValue: error }));
    } else {
      // Cho Percentage: giữ nguyên như cũ
      setDisplayDiscountValue(value);
      setForm((prev) => ({ ...prev, discountValue: value }));

      const error = validateDiscountValue(value, "Percentage");
      setErrors((prevErrors) => ({ ...prevErrors, discountValue: error }));
    }
  };

  // Xử lý thay đổi loại ưu đãi
  const handleDiscountTypeChange = (event) => {
    const newType = event.target.value;
    const currentValue = form.discountValue;

    setForm((prev) => ({ ...prev, discountType: newType }));

    // Cập nhật format hiển thị dựa trên loại mới
    if (newType === "FixedAmount" && currentValue) {
      setDisplayDiscountValue(formatVND(currentValue));
    } else {
      setDisplayDiscountValue(String(currentValue));
    }

    // Re-validate với loại mới
    const error = validateDiscountValue(currentValue, newType);
    setErrors((prevErrors) => ({ ...prevErrors, discountValue: error }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    // Validate before submit
    const discountError = validateDiscountValue(form.discountValue, form.discountType);
    if (discountError) {
      setErrors((prevErrors) => ({ ...prevErrors, discountValue: discountError }));
      return;
    }

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
          onChange={handleDiscountTypeChange}
          disabled={submitting}
        >
          <option value="Percentage">Phần trăm</option>
          <option value="FixedAmount">Số tiền cố định</option>
        </select>
      </div>

      <div className="manager-form__field">
        <label>
          Giá trị ưu đãi *
          {form.discountType === "Percentage" && (
            <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: '#6c757d' }}> (tối đa 99%)</span>
          )}
          {form.discountType === "FixedAmount" && (
            <span style={{ fontWeight: 'normal', fontSize: '0.85em', color: '#6c757d' }}> (VND)</span>
          )}
        </label>
        <input
          className={`manager-form__control ${errors.discountValue ? 'manager-form__control--error' : ''}`}
          type={form.discountType === "Percentage" ? "text" : "text"}
          min={form.discountType === "Percentage" ? "0" : undefined}
          max={form.discountType === "Percentage" ? "99" : undefined}
          step={form.discountType === "Percentage" ? "1" : undefined}
          name="discountValue"
          value={displayDiscountValue}
          onChange={handleDiscountValueChange}
          disabled={submitting}
          required
          placeholder={form.discountType === "Percentage" ? "Nhập từ 1 đến 99" : "Ví dụ: 100.000"}
        />
        {errors.discountValue && (
          <span className="manager-form__error">{errors.discountValue}</span>
        )}
      </div>

      <div className="manager-form__field">
        <label>Đơn hàng tối thiểu (VND)</label>
        <input
          className="manager-form__control"
          type="text"
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
          type="text"
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
          type="text"
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
