import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";

export default function BannerForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    imageUrl: "",
    linkUrl: "",
    isActive: true,
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
    };

  
    if (!payload.title) {
      alert("Vui lòng nhập tiêu đề");
      return;
    }
    if (!payload.imageUrl) {
      alert("Vui lòng nhập URL ảnh");
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

  if (loading) return <div>Đang tải...</div>;

  return (
    <div className="container">
      <h2>{id ? "Sửa banner" : "Thêm banner"}</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Tiêu đề</label>
          <input
            value={form.title}
            onChange={handleChange("title")}
            placeholder="Nhập tiêu đề banner"
          />
        </div>

        <div>
          <label>Ảnh (URL)</label>
          <input
            value={form.imageUrl}
            onChange={handleChange("imageUrl")}
            placeholder="https://..."
          />
          {form.imageUrl && (
            <div style={{ marginTop: 8 }}>
              <img
                src={form.imageUrl}
                alt="Preview"
                style={{ width: 300, height: 150, objectFit: "cover" }}
              />
            </div>
          )}
        </div>

        <div>
          <label>Link khi click</label>
          <input
            value={form.linkUrl}
            onChange={handleChange("linkUrl")}
            placeholder="Có thể để trống"
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={handleChange("isActive")}
            />
            Kích hoạt
          </label>
        </div>

        <button type="submit">Lưu</button>
        <button
          type="button"
          onClick={() => navigate("/admin/banner")}
          style={{ marginLeft: 8 }}
        >
          Quay lại
        </button>
      </form>
    </div>
  );
}
