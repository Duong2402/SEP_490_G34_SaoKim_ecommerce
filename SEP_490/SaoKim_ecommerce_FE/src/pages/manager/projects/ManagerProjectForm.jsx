
import { useEffect, useState } from "react";
import { UserAPI } from "../../../api/users";
import { CustomerAPI } from "../../../api/customers";

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

const parseDateInput = (value) => {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    const [day, month, year] = value.split("/").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const getDateError = (startValue, endValue) => {
  const startDate = parseDateInput(startValue);
  const endDate = parseDateInput(endValue);
  if (!startDate || !endDate) return "";
  if (endDate.getTime() < startDate.getTime()) {
    return "Ngày kết thúc không được trước Ngày bắt đầu.";
  }
  return "";
};

const VN_PHONE_REGEX = /^0\d{9}$/;
const GMAIL_REGEX = /^[A-Za-z0-9._%+-]+@gmail\.com$/i;
const PHONE_LIKE_REGEX = /^[\d\s+().-]+$/;

const normalizeVietnamPhoneForValidation = (value = "") => {
  const digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("84")) {
    if (digits.length === 11) return `0${digits.slice(2)}`;
    if (digits.length === 12 && digits[2] === "0") return digits.slice(2);
  }
  return digits;
};

const getCustomerContactError = (raw) => {
  const value = String(raw || "").trim();
  if (!value) return "";

  if (value.includes("@")) {
    if (GMAIL_REGEX.test(value)) return "";
    return "Liên hệ khách hàng phải là Gmail hợp lệ (VD: example@gmail.com) hoặc số điện thoại (0xxxxxxxxx).";
  }

  if (!PHONE_LIKE_REGEX.test(value)) {
    return "Liên hệ khách hàng phải là số điện thoại (0xxxxxxxxx) hoặc Gmail hợp lệ (VD: example@gmail.com).";
  }

  const phone = normalizeVietnamPhoneForValidation(value);
  if (VN_PHONE_REGEX.test(phone)) return "";

  return "Số điện thoại phải bắt đầu bằng 0 và gồm đúng 10 chữ số (VD: 0359793323).";
};

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
    projectManagerId: "",
  });

  const [pmOptions, setPmOptions] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState("");
  const [dateError, setDateError] = useState("");
  const [contactTouched, setContactTouched] = useState(false);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerLoadError, setCustomerLoadError] = useState("");

  // Validation states
  const [touched, setTouched] = useState({
    name: false,
    customerName: false,
    customerContact: false,
    startDate: false,
    endDate: false,
    budget: false,
  });
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const q = String(values.customerName || "").trim();
    const handle = setTimeout(async () => {
      try {
        setCustomerLoading(true);
        setCustomerLoadError("");

        const res = await CustomerAPI.getAll({ q, page: 1, pageSize: 12 });
        const body = res?.data?.data ?? res?.data ?? res ?? {};
        const list = Array.isArray(body)
          ? body
          : body.items ?? body.data?.items ?? body.data ?? [];

        const normalized = (Array.isArray(list) ? list : [])
          .map((c) => ({
            id: c.id ?? c.customerId ?? c.userId ?? c.email ?? c.name,
            name: c.name ?? "",
            email: c.email,
            phoneNumber: c.phoneNumber,
          }))
          .filter((c) => String(c.name || "").trim());

        const uniqueByName = new Map();
        normalized.forEach((c) => {
          const key = String(c.name).trim().toLowerCase();
          if (!uniqueByName.has(key)) uniqueByName.set(key, c);
        });

        if (mounted) {
          setCustomerSuggestions(Array.from(uniqueByName.values()));
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setCustomerSuggestions([]);
          setCustomerLoadError("Không tải được danh sách khách hàng.");
        }
      } finally {
        if (mounted) setCustomerLoading(false);
      }
    }, 350);

    return () => {
      mounted = false;
      clearTimeout(handle);
    };
  }, [values.customerName]);

  useEffect(() => {
    if (initialValues) {
      setValues((prev) => ({
        ...prev,
        name: initialValues.name ?? "",
        customerName: initialValues.customerName ?? "",
        customerContact: initialValues.customerContact ?? "",
        status: initialValues.status ?? "Draft",
        startDate: initialValues.startDate ? initialValues.startDate.substring(0, 10) : "",
        endDate: initialValues.endDate ? initialValues.endDate.substring(0, 10) : "",
        budget: formatBudgetInput(initialValues.budget),
        description: initialValues.description ?? "",
        projectManagerId:
          initialValues.projectManagerId != null ? String(initialValues.projectManagerId) : "",
      }));
      setContactTouched(false);
    }
  }, [initialValues]);

  useEffect(() => {
    setDateError(getDateError(values.startDate, values.endDate));
  }, [values.startDate, values.endDate]);

  const contactError = getCustomerContactError(values.customerContact);

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
    setSubmitAttempted(true);

    // Validate all required fields
    const newErrors = {};

    if (!values.name?.trim()) {
      newErrors.name = "Vui lòng nhập tên dự án";
    }

    if (!values.customerName?.trim()) {
      newErrors.customerName = "Vui lòng nhập tên khách hàng";
    }

    if (!values.customerContact?.trim()) {
      newErrors.customerContact = "Vui lòng nhập thông tin liên hệ khách hàng";
    } else {
      const nextContactError = getCustomerContactError(values.customerContact);
      if (nextContactError) {
        newErrors.customerContact = nextContactError;
      }
    }

    if (!values.startDate) {
      newErrors.startDate = "Vui lòng chọn ngày bắt đầu";
    }

    if (!values.endDate) {
      newErrors.endDate = "Vui lòng chọn ngày kết thúc";
    }

    const nextDateError = getDateError(values.startDate, values.endDate);
    if (nextDateError) {
      newErrors.endDate = nextDateError;
      setDateError(nextDateError);
    }

    if (!values.budget?.trim()) {
      newErrors.budget = "Vui lòng nhập giá trị dự án";
    }

    setErrors(newErrors);

    // Mark all fields as touched
    setTouched({
      name: true,
      customerName: true,
      customerContact: true,
      startDate: true,
      endDate: true,
      budget: true,
    });
    setContactTouched(true);

    // If there are errors, don't submit
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const normalizedBudget = normalizeBudgetValue(values.budget);
    const normalizedCustomerContact = values.customerContact
      ? values.customerContact.includes("@")
        ? values.customerContact.trim()
        : normalizeVietnamPhoneForValidation(values.customerContact)
      : "";

    const payload = {
      ...values,
      customerContact: normalizedCustomerContact,
      budget: normalizedBudget,
      projectManagerId: values.projectManagerId ? Number(values.projectManagerId) : null,
    };

    await onSubmit(payload);
  };

  const handleBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  return (
    <form onSubmit={handleSubmit} className="manager-form">
      <div className="manager-form__field">
        <label>Tên dự án *</label>
        <input
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={() => handleBlur('name')}
          required
          className={`manager-form__control${(touched.name || submitAttempted) && errors.name ? " manager-form__control--error" : ""
            }`}
        />
        {(touched.name || submitAttempted) && errors.name && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {errors.name}
          </div>
        )}
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
          <div className="manager-form__hint" style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}>
            {pmError}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Tên khách hàng *</label>
        <input
          name="customerName"
          value={values.customerName}
          onChange={handleChange}
          onBlur={() => handleBlur('customerName')}
          list="customer-name-suggestions"
          placeholder="Chọn hoặc nhập tên khách hàng"
          autoComplete="off"
          className={`manager-form__control${(touched.customerName || submitAttempted) && errors.customerName ? " manager-form__control--error" : ""
            }`}
        />
        <datalist id="customer-name-suggestions">
          {customerSuggestions.map((c, idx) => (
            <option
              key={c.id ?? `${c.name}-${idx}`}
              value={c.name}
              label={[c.phoneNumber, c.email].filter(Boolean).join(" | ")}
            />
          ))}
        </datalist>
        {customerLoading && (
          <div
            className="manager-form__hint"
            style={{ color: "#5c6c82", fontSize: 12, marginTop: 4 }}
          >
            Đang tải danh sách khách hàng...
          </div>
        )}
        {!customerLoading && customerLoadError && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {customerLoadError}
          </div>
        )}
        {(touched.customerName || submitAttempted) && errors.customerName && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {errors.customerName}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Liên hệ khách hàng *</label>
        <input
          name="customerContact"
          value={values.customerContact}
          onChange={handleChange}
          onBlur={() => {
            setContactTouched(true);
            handleBlur('customerContact');
          }}
          placeholder="SDT (0xxxxxxxxx) hoặc Gmail (example@gmail.com)"
          aria-invalid={(contactTouched || touched.customerContact || submitAttempted) && (!!contactError || !!errors.customerContact)}
          className={`manager-form__control${(contactTouched || touched.customerContact || submitAttempted) && (contactError || errors.customerContact) ? " manager-form__control--error" : ""
            }`}
        />
        {(contactTouched || touched.customerContact || submitAttempted) && (contactError || errors.customerContact) && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {contactError || errors.customerContact}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Ngày bắt đầu *</label>
        <input
          type="date"
          name="startDate"
          value={values.startDate}
          onChange={handleChange}
          onBlur={() => handleBlur('startDate')}
          className={`manager-form__control${(touched.startDate || submitAttempted) && errors.startDate ? " manager-form__control--error" : ""
            }`}
        />
        {(touched.startDate || submitAttempted) && errors.startDate && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {errors.startDate}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Ngày kết thúc *</label>
        <input
          type="date"
          name="endDate"
          value={values.endDate}
          onChange={handleChange}
          onBlur={() => handleBlur('endDate')}
          className={`manager-form__control${(touched.endDate || submitAttempted) && (dateError || errors.endDate) ? " manager-form__control--error" : ""
            }`}
        />
        {(touched.endDate || submitAttempted) && (dateError || errors.endDate) && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {dateError || errors.endDate}
          </div>
        )}
      </div>

      <div className="manager-form__field">
        <label>Giá trị dự án (VND) *</label>
        <input
          name="budget"
          value={values.budget}
          onChange={handleChange}
          onBlur={() => handleBlur('budget')}
          placeholder="Nhập giá trị dự án"
          className={`manager-form__control${(touched.budget || submitAttempted) && errors.budget ? " manager-form__control--error" : ""
            }`}
        />
        {(touched.budget || submitAttempted) && errors.budget && (
          <div
            className="manager-form__hint"
            style={{ color: "#d94a4a", fontSize: 12, marginTop: 4 }}
          >
            {errors.budget}
          </div>
        )}
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
          disabled={submitting || Boolean(dateError)}
        >
          {submitting ? "Đang lưu..." : "Lưu dự án"}
        </button>
      </div>
    </form>
  );
}
