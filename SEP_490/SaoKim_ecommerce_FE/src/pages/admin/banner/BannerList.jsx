import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BannerAPI } from "../../../api/banner";
import "../../../styles/admin-banner.css";

function buildBannerUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  return url.startsWith("/") ? url : `/${url}`;
}

export default function BannerList() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await BannerAPI.getAll();
      setBanners(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert("Không tải được banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const rows = useMemo(
    () =>
      banners.map((b) => ({
        ...b,
        _img: buildBannerUrl(b.imageUrl),
      })),
    [banners]
  );

  if (loading) {
    return <div className="admin-banner__loading">Đang tải banner...</div>;
  }

  return (
    <div className="admin-banner">
      <div className="admin-banner__header">
        <div>
          <h2 className="admin-banner__title">Quản lý Banner</h2>
          <p className="admin-banner__subtitle">
            Quản lý banner hiển thị trên trang chủ
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/admin/banner/create")}
        >
          Thêm banner
        </button>
      </div>

      <div className="admin-banner__table-wrap">
        <table className="admin-banner__table">
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tiêu đề</th>
              <th>Link</th>
              <th>Trạng thái</th>
              <th style={{ width: 160 }}>Hành động</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((b) => (
              <tr key={b.id}>
                <td>
                  {b._img ? (
                    <img
                    src={b._img}
                    alt={b.title}
                    className="admin-banner__image"
                  />
                  ) : (
                    "-"
                  )}
                </td>

                <td>{b.title}</td>

                <td>
                  {b.linkUrl ? (
                    <a href={b.linkUrl} target="_blank" rel="noreferrer">
                      {b.linkUrl}
                    </a>
                  ) : (
                    "-"
                  )}
                </td>

                <td>{b.isActive ? "Bật" : "Tắt"}</td>

                <td>
                  <div className="admin-banner__actions">
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() =>
                        navigate(`/admin/banner/edit/${b.id}`)
                      }
                    >
                      Sửa
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={async () => {
                        if (!window.confirm("Xóa banner này?")) return;
                        await BannerAPI.delete(b.id);
                        fetchBanners();
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!rows.length && (
              <tr>
                <td colSpan={5} className="admin-banner__empty">
                  Chưa có banner nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
