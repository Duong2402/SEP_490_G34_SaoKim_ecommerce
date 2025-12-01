import { useEffect, useRef, useState } from "react";

const DEFAULT_FORM = {
  name: "",
  description: "",
  discountType: "Percentage",
  discountValue: "",
  startDate: "",
  endDate: "",
  status: "Draft",

  // multimedia
  imageUrl: "",
  linkUrl: "",
  descriptionHtml: "",
};

const STATUS_OPTIONS = [
  { value: "Draft", label: "Nháp" },
  { value: "Scheduled", label: "Đã lên lịch" },
  { value: "Active", label: "Đang chạy" },
  { value: "Inactive", label: "Tạm dừng" },
  { value: "Expired", label: "Đã kết thúc" },
];

export default function ManagerPromotionForm({ initialValues, submitting, onSubmit }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [richFocused, setRichFocused] = useState(false);
  const editorRef = useRef(null);

  useEffect(() => {
    if (!initialValues) return;
    setForm({
      name: initialValues.name ?? "",
      description: initialValues.description ?? "",
      discountType: initialValues.discountType ?? "Percentage",
      discountValue: initialValues.discountValue ?? "",
      startDate: initialValues.startDate
        ? initialValues.startDate.substring(0, 16)
        : "",
      endDate: initialValues.endDate
        ? initialValues.endDate.substring(0, 16)
        : "",
      status: initialValues.status ?? "Draft",

      imageUrl: initialValues.imageUrl ?? "",
      linkUrl: initialValues.linkUrl ?? "",
      descriptionHtml: initialValues.descriptionHtml ?? "",
    });
  }, [initialValues]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRichInput = (event) => {
    const html = event.currentTarget.innerHTML;
    setForm((prev) => ({ ...prev, descriptionHtml: html }));
  };

  const focusEditor = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const applyFormat = (command) => {
    focusEditor();
    try {
      document.execCommand(command, false, null);
    } catch (e) {
      console.warn("execCommand không hỗ trợ:", command, e);
    }
  };

  const applyLink = () => {
    const url = window.prompt("Nhập đường dẫn liên kết:");
    if (!url) return;
    focusEditor();
    try {
      document.execCommand("createLink", false, url);
    } catch (e) {
      console.warn("Không tạo được link", e);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      name: form.name,
      description: form.description || null,
      discountType: form.discountType,
      discountValue: form.discountValue ? Number(form.discountValue) : 0,
      startDate: form.startDate
        ? new Date(form.startDate).toISOString()
        : null,
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      status: form.status,

      imageUrl: form.imageUrl || null,
      linkUrl: form.linkUrl || null,
      descriptionHtml: form.descriptionHtml || null,
    });
  };

  return (
    <form className="manager-form" onSubmit={handleSubmit}>
      <div className="manager-form__field">
        <label>Tên chương trình *</label>
        <input
          className="manager-form__control"
          name="name"
          required
          value={form.name}
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
        <label>Bắt đầu *</label>
        <input
          className="manager-form__control"
          type="datetime-local"
          name="startDate"
          value={form.startDate}
          onChange={handleChange}
          disabled={submitting}
          required
        />
      </div>

      <div className="manager-form__field">
        <label>Kết thúc *</label>
        <input
          className="manager-form__control"
          type="datetime-local"
          name="endDate"
          value={form.endDate}
          onChange={handleChange}
          disabled={submitting}
          required
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

      {/* Mô tả ngắn (plain text) */}
      <div className="manager-form__field" style={{ gridColumn: "1 / -1" }}>
        <label>Mô tả ngắn</label>
        <textarea
          className="manager-form__control"
          rows={3}
          name="description"
          value={form.description}
          onChange={handleChange}
          disabled={submitting}
          placeholder="Mô tả tóm tắt để quản lý nội bộ hoặc hiển thị nhanh."
        />
      </div>

      {/* Ảnh và link */}
      <div className="manager-form__field">
        <label>Hình ảnh khuyến mãi (URL)</label>
        <input
          className="manager-form__control"
          name="imageUrl"
          value={form.imageUrl}
          onChange={handleChange}
          disabled={submitting}
          placeholder="https://..."
        />
      </div>

      <div className="manager-form__field">
        <label>Liên kết khi khách nhấp</label>
        <input
          className="manager-form__control"
          name="linkUrl"
          value={form.linkUrl}
          onChange={handleChange}
          disabled={submitting}
          placeholder="https://trang-khuyen-mai-hoac-trang-san-pham"
        />
      </div>

      {/* Rich-text description */}
      <div className="manager-form__field" style={{ gridColumn: "1 / -1" }}>
        <label>Nội dung chi tiết (rich-text)</label>
        <div
          className={
            "manager-richtext" + (richFocused ? " manager-richtext--focus" : "")
          }
        >
          <div className="manager-richtext__toolbar">
            <span className="manager-richtext__label">Định dạng:</span>
            <button
              type="button"
              className="manager-richtext__button"
              onClick={() => applyFormat("bold")}
              disabled={submitting}
            >
              B
            </button>
            <button
              type="button"
              className="manager-richtext__button"
              onClick={() => applyFormat("italic")}
              disabled={submitting}
            >
              I
            </button>
            <button
              type="button"
              className="manager-richtext__button"
              onClick={() => applyFormat("underline")}
              disabled={submitting}
            >
              U
            </button>
            <button
              type="button"
              className="manager-richtext__button"
              onClick={() => applyFormat("insertUnorderedList")}
              disabled={submitting}
            >
              • Danh sách
            </button>
            <button
              type="button"
              className="manager-richtext__button"
              onClick={applyLink}
              disabled={submitting}
            >
              Thêm link
            </button>
          </div>
          <div
            ref={editorRef}
            className="manager-richtext__editor"
            contentEditable={!submitting}
            suppressContentEditableWarning
            onInput={handleRichInput}
            onFocus={() => setRichFocused(true)}
            onBlur={() => setRichFocused(false)}
            dangerouslySetInnerHTML={{ __html: form.descriptionHtml }}
          />
        </div>
        <p className="manager-richtext__hint">
          Nội dung này sẽ được lưu dưới dạng HTML để hiển thị đẹp (tiêu đề, đoạn
          văn, danh sách, liên kết).
        </p>
      </div>

      <div className="manager-form__actions">
        <button
          type="submit"
          className="manager-btn manager-btn--primary"
          disabled={submitting}
        >
          {submitting ? "Đang lưu..." : "Lưu khuyến mãi"}
        </button>
      </div>
    </form>
  );
}