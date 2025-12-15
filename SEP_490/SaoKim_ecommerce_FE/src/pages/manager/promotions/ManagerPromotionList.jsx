
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PromotionsAPI } from "../../../api/promotions";
import MultiAddPromotionProductsModal from "../../../components/MultiAddPromotionProductsModal";
import { formatDate } from "../../ProjectManager/projectHelpers";

const STATUS_LABELS = {
  Draft: "Nháp",
  Scheduled: "Đã lên lịch",
  Active: "Đang chạy",
  Inactive: "Tạm dừng",
  Expired: "Đã kết thúc",
};

export default function ManagerPromotionList() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [selectedPromotionId, setSelectedPromotionId] = useState(null);

  const params = useMemo(
    () => ({
      q: q || undefined,
      status: status || undefined,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [q, status, sortBy, sortDir, page, pageSize]
  );

  const loadPromotions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await PromotionsAPI.list(params);
      const payload = res?.data?.data ?? res?.data ?? {};
      setRows(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (error) {
      console.error(error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDelete = async (id) => {
    if (!window.confirm("Xóa chương trình khuyến mãi này? Hành động không thể hoàn tác.")) {
      return;
    }
    try {
      await PromotionsAPI.remove(id);
      await loadPromotions();
    } catch (error) {
      console.error(error);
      alert("Không thể xóa khuyến mãi.");
    }
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Khuyến mãi</h2>
          <p className="manager-panel__subtitle">
            Thiết lập ưu đãi và quản lý sản phẩm tham gia để tối ưu doanh số.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button type="button" className="manager-btn manager-btn--outline" onClick={loadPromotions}>
            Làm mới
          </button>
          <button
            type="button"
            className="manager-btn manager-btn--primary"
            onClick={() => navigate("/manager/promotions/create")}
          >
            + Tạo khuyến mãi
          </button>
        </div>
      </div>

      <div className="manager-filters">
        <input
          className="manager-input"
          placeholder="Tìm theo tên khuyến mãi"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="manager-select"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Nháp</option>
          <option value="Scheduled">Đã lên lịch</option>
          <option value="Active">Đang chạy</option>
          <option value="Inactive">Tạm dừng</option>
          <option value="Expired">Đã kết thúc</option>
        </select>

        <select
          className="manager-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created">Ngày tạo</option>
          <option value="name">Tên khuyến mãi</option>
          <option value="startDate">Ngày bắt đầu</option>
          <option value="endDate">Ngày kết thúc</option>
          <option value="discountValue">Giá trị ưu đãi</option>
          <option value="status">Trạng thái</option>
        </select>

        <select
          className="manager-select"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
        >
          <option value="desc">Giảm dần</option>
          <option value="asc">Tăng dần</option>
        </select>
      </div>

      <div className="manager-table__wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tên chương trình</th>
              <th>Giá trị ưu đãi</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="manager-table__empty" colSpan={8}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="manager-table__empty" colSpan={8}>
                  Chưa có chương trình khuyến mãi nào.
                </td>
              </tr>
            ) : (
              rows.map((promo, idx) => (
                <tr key={promo.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{promo.name}</div>
                    {promo.description && (
                      <div className="manager-card__meta">{promo.description}</div>
                    )}
                  </td>
                  <td>
                    {promo.discountType === "Percentage"
                      ? `${promo.discountValue}%`
                      : `${Number(promo.discountValue).toLocaleString("vi-VN")} ₫`}
                  </td>
                  <td>{formatDate(promo.startDate, "vi")}</td>
                  <td>{formatDate(promo.endDate, "vi")}</td>
                  <td>{STATUS_LABELS[promo.status] ?? promo.status}</td>
                  <td>{promo.createdAt ? new Date(promo.createdAt).toLocaleString("vi-VN") : "-"}</td>
                  <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      onClick={() => setSelectedPromotionId(promo.id)}
                    >
                      Sản phẩm
                    </button>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      onClick={() => navigate(`/manager/promotions/${promo.id}/edit`)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      style={{ color: "#d64a4a", borderColor: "rgba(214,74,74,0.4)" }}
                      onClick={() => handleDelete(promo.id)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="manager-pagination">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Trước
        </button>
        <span>
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </button>
        <label>Hiển thị</label>
        <select
          className="manager-select"
          style={{ width: 90 }}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {selectedPromotionId !== null && (
        <MultiAddPromotionProductsModal
          promotionId={selectedPromotionId}
          onClose={() => setSelectedPromotionId(null)}
        />
      )}
    </div>
  );
}
