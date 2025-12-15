import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";
import "../../../styles/admin-banner-form.css";

const toInputDate = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
};

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
          startDate: toInputDate(data.startDate),
          endDate: toInputDate(data.endDate),
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

  const handleChange = (field) => (e) => {
    const value = field === "isActive" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      title: form.title?.trim() || "",
      imageUrl: form.imageUrl?.trim() || "",
      linkUrl: form.linkUrl?.trim() || null,
      isActive: !!form.isActive,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
    };

    if (!payload.title) {
      alert("Vui lòng nhập tiêu đề");
      return;
    }
    if (!payload.imageUrl) {
      alert("Vui lòng nhập URL ảnh");
      return;
    }
    if (!payload.endDate) {
      alert("Vui lòng chọn ngày hết hạn banner");
      return;
    }

    try {
      if (id) {
        await BannerAPI.update(id, payload);
      } else {
        await BannerAPI.create(payload);
      }
      alert("Lưu banner thành công");
      navigate("/admin/banner");
    } catch (err) {
      console.error(err);
      const res = err?.response?.data;
      let msg = "Lưu banner thất bại";

      if (res?.errors) {
        const firstKey = Object.keys(res.errors)[0];
        if (firstKey && res.errors[firstKey]?.length) {
          msg = res.errors[firstKey][0];
        }
      } else if (res?.title) {
        msg = res.title;
      }

      alert(msg);
    }
  };
  if (loading) return <div className="admin-banner-form__loading">Đang tải...</div>;

  return (
    <div className="admin-banner-form">
      <div className="admin-banner-form__panel">
        <div className="admin-banner-form__header">
          <div>
            <h2 className="admin-banner-form__title">
              {id ? "Sửa banner" : "Thêm banner"}
            </h2>
            <p className="admin-banner-form__subtitle">
              Cập nhật thông tin banner hiển thị trên trang chủ
            </p>
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
                <label className="admin-banner-form__label">Ảnh (URL)</label>
                <input
                  className="admin-banner-form__input"
                  value={form.imageUrl}
                  onChange={handleChange("imageUrl")}
                  placeholder="https://..."
                />
                <div className="admin-banner-form__hint">
                  Dán link ảnh hợp lệ để xem preview
                </div>
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
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => navigate("/admin/banner")}
                >
                  Quay lại
                </button>
              </div>
            </div>

            <div className="admin-banner-form__card">
              <div className="admin-banner-form__field">
                <label className="admin-banner-form__label">Preview</label>

                <div className="admin-banner-form__preview">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="Preview" />
                  ) : (
                    <div className="admin-banner-form__preview-empty">
                      Chưa có ảnh để xem trước
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

}
