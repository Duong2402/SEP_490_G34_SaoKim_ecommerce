import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";
import "../../../styles/admin-banner-form.css";

const API_BASE = import.meta.env.VITE_API_BASE || "";

function buildBannerUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function toLocalInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

export default function BannerForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
    startDate: "",
    endDate: "",
  });

  const [loading, setLoading] = useState(!!id);

  const [imageFile, setImageFile] = useState(null);
  const [filePreview, setFilePreview] = useState("");

  const previewUrl = useMemo(() => {
    if (filePreview) return filePreview;
    return buildBannerUrl(form.imageUrl);
  }, [filePreview, form.imageUrl]);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const data = await BannerAPI.getById(id);
        setForm({
          title: data.title ?? "",
          imageUrl: data.imageUrl ?? "",
          linkUrl: data.linkUrl ?? "",
          isActive: data.isActive ?? true,
          startDate: toLocalInputValue(data.startDate),
          endDate: toLocalInputValue(data.endDate),
        });
      } catch (err) {
        console.error(err);
        alert("Không tải được banner");
        navigate("/admin/banner");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, navigate]);

  useEffect(() => {
    return () => {
      if (filePreview) URL.revokeObjectURL(filePreview);
    };
  }, [filePreview]);

  const handleChange = (field) => (e) => {
    const value = field === "isActive" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;

    setImageFile(f);

    if (filePreview) URL.revokeObjectURL(filePreview);
    setFilePreview(f ? URL.createObjectURL(f) : "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title?.trim()) {
      alert("Vui lòng nhập tiêu đề");
      return;
    }

    if (!imageFile && !form.imageUrl?.trim()) {
      alert("Vui lòng chọn ảnh hoặc nhập URL ảnh");
      return;
    }

const payload = {
  title: form.title.trim(),
  imageFile,
  imageUrl: imageFile ? null : (form.imageUrl?.trim() || null),
  linkUrl: form.linkUrl?.trim() || null,
  isActive: !!form.isActive,
  startDate: form.startDate || null,
  endDate: form.endDate || null,
};


    try {
      if (id) await BannerAPI.update(id, payload);
      else await BannerAPI.create(payload);

      alert("Lưu banner thành công");
      navigate("/admin/banner");
    } catch (err) {
      console.error(err);
      const res = err?.response?.data;
      alert(res?.message || "Lưu banner thất bại");
    }
  };

  if (loading) return <div className="admin-banner-form__loading">Đang tải...</div>;

  return (
    <div className="admin-banner-form">
      <div className="admin-banner-form__panel">
        <div className="admin-banner-form__header">
          <div>
            <h2 className="admin-banner-form__title">{id ? "Sửa banner" : "Thêm banner"}</h2>
            <p className="admin-banner-form__subtitle">Cập nhật thông tin banner hiển thị trên trang chủ</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-banner-form__grid">
            <div className="admin-banner-form__card">
              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Tiêu đề</label>
                <input
                  className="admin-banner-form__input"
                  value={form.title}
                  onChange={handleChange("title")}
                  placeholder="Nhập tiêu đề banner"
                />
              </div>

              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Chọn ảnh từ máy</label>
                <input
                  className="admin-banner-form__input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                />
                <div className="admin-banner-form__hint">
                  Chọn file xong ảnh sẽ hiện ở khung Preview bên phải
                </div>
              </div>

              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Hoặc nhập URL ảnh</label>
                <input
                  className="admin-banner-form__input"
                  value={form.imageUrl}
                  onChange={handleChange("imageUrl")}
                  placeholder="https://... hoặc /uploads/..."
                />
                <div className="admin-banner-form__hint">Nếu đã chọn file thì URL sẽ được bỏ qua</div>
              </div>

              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Link khi click</label>
                <input
                  className="admin-banner-form__input"
                  value={form.linkUrl}
                  onChange={handleChange("linkUrl")}
                  placeholder="Có thể để trống"
                />
              </div>

              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Bắt đầu</label>
                <input
                  className="admin-banner-form__input"
                  type="datetime-local"
                  value={form.startDate}
                  onChange={handleChange("startDate")}
                />
              </div>

              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Kết thúc</label>
                <input
                  className="admin-banner-form__input"
                  type="datetime-local"
                  value={form.endDate}
                  onChange={handleChange("endDate")}
                />
              </div>

              <label className="admin-banner-form__switch">
                <input
                  className="admin-banner-form__checkbox"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={handleChange("isActive")}
                />
                Kích hoạt
              </label>

              <div className="admin-banner-form__actions">
                <button type="submit" className="btn btn-primary">
                  Lưu
                </button>
                <button type="button" className="btn btn-outline" onClick={() => navigate("/admin/banner")}>
                  Quay lại
                </button>
              </div>
            </div>

            <div className="admin-banner-form__card">
              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Preview</label>

                <div className="admin-banner-form__preview">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" />
                  ) : (
                    <div className="admin-banner-form__preview-empty">Chưa có ảnh để xem trước</div>
                  )}
                </div>

                <div className="admin-banner-form__hint">
                  Preview ưu tiên file bạn chọn; nếu không có file thì dùng URL (hỗ trợ /uploads/...)
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
