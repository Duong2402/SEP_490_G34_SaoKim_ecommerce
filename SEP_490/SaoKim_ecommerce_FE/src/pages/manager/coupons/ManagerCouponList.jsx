import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CouponsAPI } from "../../../api/coupons";
import { formatDate } from "../../ProjectManager/projectHelpers";

const STATUS_LABELS = {
  Draft: "Nháp",
  Scheduled: "Đã lên lịch",
  Active: "Đang chạy",
  Inactive: "Tạm dừng",
  Expired: "Đã hết hạn",
};

export default function ManagerCouponList() {
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

  const params = useMemo(
    () => ({ q: q || undefined, status: status || undefined, sortBy, sortDir, page, pageSize }),
    [q, status, sortBy, sortDir, page, pageSize]
  );

  const loadCoupons = useCallback(async () => {
    try {
      setLoading(true);
      const res = await CouponsAPI.list(params);
      const payload = res?.data?.data ?? res?.data ?? {};
      setRows(payload.items ?? []);
      setTotal(payload.totalItems || payload.total || 0);
    } catch (error) {
      console.error(error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const onDelete = async (id) => {
    if (!window.confirm("Xóa mã giảm giá này?")) return;
    await CouponsAPI.remove(id);
    await loadCoupons();
  };

  const onToggle = async (id) => {
    await CouponsAPI.toggle(id);
    await loadCoupons();
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Mã giảm giá</h2>
          <p className="manager-panel__subtitle">
            Quản lý coupon cho các chiến dịch bán hàng và chăm sóc khách hàng.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button type="button" className="manager-btn manager-btn--outline" onClick={loadCoupons}>
            Làm mới
          </button>
          <button
            type="button"
            className="manager-btn manager-btn--primary"
            onClick={() => navigate("/manager/coupons/create")}
          >
            + Tạo mã mới
          </button>
        </div>
      </div>

      <div className="manager-filters">
        <input
          className="manager-input"
          placeholder="Tìm theo mã hoặc tên"
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
          <option value="Expired">Đã hết hạn</option>
        </select>
        <select
          className="manager-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created">Ngày tạo</option>
          <option value="name">Tên mã</option>
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
              <th>Mã</th>
              <th>Tên chiến dịch</th>
              <th>Giá trị</th>
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
                <td className="manager-table__empty" colSpan={9}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="manager-table__empty" colSpan={9}>
                  Chưa có mã giảm giá nào.
                </td>
              </tr>
            ) : (
              rows.map((coupon, idx) => (
                <tr key={coupon.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td style={{ fontWeight: 600 }}>{coupon.code}</td>
                  <td>{coupon.name}</td>
                  <td>
                    {coupon.discountType === "Percentage"
                      ? `${coupon.discountValue}%`
                      : `${Number(coupon.discountValue).toLocaleString("vi-VN")} ₫`}
                  </td>
                  <td>{formatDate(coupon.startDate, "vi")}</td>
                  <td>{formatDate(coupon.endDate, "vi")}</td>
                  <td>{STATUS_LABELS[coupon.status] ?? coupon.status}</td>
                  <td>{coupon.createdAt ? new Date(coupon.createdAt).toLocaleString("vi-VN") : "-"}</td>
                  <td style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      onClick={() => navigate(`/manager/coupons/${coupon.id}/edit`)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      onClick={() => onToggle(coupon.id)}
                    >
                      {coupon.status === "Active" ? "Tạm dừng" : "Kích hoạt"}
                    </button>
                    <button
                      type="button"
                      className="manager-btn manager-btn--outline"
                      style={{ color: "#d64a4a", borderColor: "rgba(214,74,74,0.4)" }}
                      onClick={() => onDelete(coupon.id)}
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
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}
