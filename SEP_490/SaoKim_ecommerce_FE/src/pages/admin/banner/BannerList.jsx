import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";
import { FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import "../../../styles/admin-banner.css";

export default function BannerList() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await BannerAPI.getAll();
      setBanners(data || []);
    } catch (err) {
      console.error(err);
      alert("Không tải được danh sách banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa banner này?")) return;
    try {
      await BannerAPI.delete(id);
      await fetchBanners();
    } catch (err) {
      console.error(err);
      alert("Xóa thất bại");
    }
  };

  if (loading) {
    return (
      <div className="admin-banner">
        <div className="admin-panel">
          <div className="admin-banner__loading">Đang tải banner...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-banner">
      <div className="admin-panel">
        <div className="admin-banner__header">
          <div>
            <h2 className="admin-panel__title">Quản lý Banner</h2>
            <p className="admin-panel__subtitle">
              Quản lý banner hiển thị trên trang chủ
            </p>
          </div>

          <div className="admin-banner__actions">
            <button
              className="admin-btn admin-btn--primary"
              onClick={() => navigate("/admin/banner/create")}
            >
              <FaPlus style={{ marginRight: 8 }} />
              Thêm banner
            </button>
          </div>
        </div>

        <div className="admin-banner__table-wrap">
          <table className="admin-banner__table">
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Link</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id}>
                  <td>
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="admin-banner__image"
                    />
                  </td>
                  <td>{b.title}</td>
                  <td>
                    <a
                      href={b.linkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--wm-primary)", textDecoration: "none" }}
                    >
                      {b.linkUrl}
                    </a>
                  </td>
                  <td>
                    <span
                      className={`admin-banner__status ${b.isActive
                          ? "admin-banner__status--active"
                          : "admin-banner__status--inactive"
                        }`}
                    >
                      {b.isActive ? "Đang hiển thị" : "Ẩn"}
                    </span>
                  </td>
                  <td>
                    <div className="admin-banner__row-actions">
                      <button
                        className="admin-btn admin-btn--outline"
                        onClick={() => navigate(`/admin/banner/edit/${b.id}`)}
                      >
                        <FaEdit style={{ marginRight: 6 }} />
                        Sửa
                      </button>
                      <button
                        className="admin-btn admin-btn--danger"
                        onClick={() => handleDelete(b.id)}
                      >
                        <FaTrash style={{ marginRight: 6 }} />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!banners.length && (
                <tr>
                  <td colSpan={5} className="admin-banner__empty">
                    Chưa có banner nào. Bấm "Thêm banner" để tạo mới.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
