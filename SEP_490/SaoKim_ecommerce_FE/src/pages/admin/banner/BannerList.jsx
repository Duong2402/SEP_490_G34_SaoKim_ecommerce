import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";
import "../../../styles/admin-banner.css";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.valueOf())) return "-";
  return d.toLocaleDateString("vi-VN");
};

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

  if (loading) return <div>Đang tải banner...</div>;

  return (
    <div>
      <div className="admin-banner__header">
        <div>
          <h2 className="admin-banner__title">Quản lý Banner</h2>
          <p className="admin-banner__subtitle">
            Quản lý banner hiển thị trên trang chủ
          </p>
        </div>

        <div className="admin-banner__actions">
          <button
            className="btn btn-primary"
            onClick={() => navigate("/admin/banner/create")}
          >
            Thêm banner
          </button>
        </div>
      </div>

      <table
        style={{ marginTop: "20px", width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Ảnh
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Tiêu đề
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Link
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Ngày bắt đầu
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Ngày hết hạn
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Kích hoạt
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "8px" }}>
              Hành động
            </th>
          </tr>
        </thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id}>
              <td style={{ padding: "8px" }}>
                <img
                  src={b.imageUrl}
                  alt={b.title}
                  style={{ width: "140px", height: "70px", objectFit: "cover" }}
                />
              </td>
              <td style={{ padding: "8px" }}>{b.title}</td>
              <td style={{ padding: "8px" }}>{b.linkUrl}</td>
              <td style={{ padding: "8px" }}>{formatDate(b.startDate)}</td>
              <td style={{ padding: "8px" }}>{formatDate(b.endDate)}</td>
              <td style={{ padding: "8px" }}>{b.isActive ? "Có" : "Không"}</td>
              <td style={{ padding: "8px" }}>
                <button
                  onClick={() => navigate(`/admin/banner/edit/${b.id}`)}
                  style={{ marginRight: "8px" }}
                >
                  Sửa
                </button>
                <button onClick={() => handleDelete(b.id)}>Xóa</button>
              </td>
            </tr>
          ))}
          {!banners.length && (
            <tr>
              <td colSpan={7} style={{ padding: "8px", textAlign: "center" }}>
                Chưa có banner nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
