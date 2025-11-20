import { useEffect, useState } from "react";
import { getManagerOverview, getRevenueByDay } from "../../api/manager-reports";

const formatCurrency = (value) => {
  if (value == null || Number.isNaN(value)) return "0 ₫";
  return Number(value).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
};

const formatNumber = (value) => {
  if (value == null || Number.isNaN(value)) return "0";
  return Number(value).toLocaleString("vi-VN");
};

export default function ManagerDashboard() {
  const [overview, setOverview] = useState(null);
  const [revenueByDay, setRevenueByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError("");
        const [overviewRes, revenueRes] = await Promise.all([
          getManagerOverview(),
          getRevenueByDay(7),
        ]);
        if (!mounted) return;
        setOverview(overviewRes || {});
        setRevenueByDay(Array.isArray(revenueRes) ? revenueRes : []);
      } catch (err) {
        if (!mounted) return;
        const message =
          err?.response?.data ||
          err?.message ||
          "Có lỗi xảy ra khi tải dữ liệu tổng quan.";
        setError(typeof message === "string" ? message : JSON.stringify(message));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const revenue = overview?.revenue ?? {};
  const warehouse = overview?.warehouse ?? {};
  const projects = overview?.projects ?? {};

  return (
    <div className="manager-section">
      {loading && (
        <div className="manager-panel manager-empty">Đang tải dữ liệu tổng quan...</div>
      )}

      {!loading && error && (
        <div className="manager-panel" role="alert">
          <div className="manager-panel__header">
            <div>
              <h2 className="manager-panel__title">Không thể tải dữ liệu</h2>
              <p className="manager-panel__subtitle">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h2 className="manager-panel__title">Chỉ số doanh thu</h2>
                <p className="manager-panel__subtitle">
                  Số liệu cập nhật theo thời gian thực từ hệ thống bán hàng.
                </p>
              </div>
            </div>
            <div className="manager-summary-grid">
              <SummaryCard label="Tổng doanh thu" value={formatCurrency(revenue.totalRevenue)} />
              <SummaryCard
                label="Doanh thu 7 ngày gần nhất"
                value={formatCurrency(revenue.revenue7d)}
              />
              <SummaryCard
                label="Đơn hàng hôm nay"
                value={formatNumber(revenue.ordersToday)}
              />
              <SummaryCard
                label="Đơn đang chờ xử lý"
                value={formatNumber(revenue.pendingOrders)}
              />
            </div>
          </section>

          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h2 className="manager-panel__title">Hiệu suất kho</h2>
                <p className="manager-panel__subtitle">
                  Theo dõi mức tồn và số phiếu nhập - xuất để cân bằng cung ứng.
                </p>
              </div>
            </div>
            <div className="manager-summary-grid">
              <SummaryCard
                label="Tổng tồn kho (số lượng)"
                value={formatNumber(warehouse.totalStock)}
              />
              <SplitCard
                label="Phiếu nhập kho"
                currentLabel="Tuần này"
                currentValue={formatNumber(warehouse?.inbound?.thisWeek)}
                previousLabel="Tuần trước"
                previousValue={formatNumber(warehouse?.inbound?.lastWeek)}
              />
              <SplitCard
                label="Phiếu xuất kho"
                currentLabel="Tuần này"
                currentValue={formatNumber(warehouse?.outbound?.thisWeek)}
                previousLabel="Tuần trước"
                previousValue={formatNumber(warehouse?.outbound?.lastWeek)}
              />
            </div>
          </section>

          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h2 className="manager-panel__title">Dự án trọng điểm</h2>
                <p className="manager-panel__subtitle">
                  Tình trạng triển khai và ngân sách tổng hợp của các dự án.
                </p>
              </div>
            </div>
            <div className="manager-summary-grid">
              <SummaryCard
                label="Tổng số dự án"
                value={formatNumber(projects.totalProjects)}
              />
              <SummaryCard label="Dự án nháp" value={formatNumber(projects.draftProjects)} />
              <SummaryCard label="Dự án đang chạy" value={formatNumber(projects.activeProjects)} />
              <SummaryCard
                label="Dự án hoàn thành"
                value={formatNumber(projects.completedProjects)}
              />
            </div>

            <div className="manager-summary-grid" style={{ marginTop: 18 }}>
              <SummaryCard label="Tổng ngân sách" value={formatCurrency(projects.totalBudget)} />
              <SummaryCard
                label="Chi phí sản phẩm"
                value={formatCurrency(projects.totalProductCost)}
              />
              <SummaryCard
                label="Chi phí khác"
                value={formatCurrency(projects.totalOtherExpenses)}
              />
              <SummaryCard
                label="Chi phí thực tế"
                value={formatCurrency(projects.totalActualCost)}
              />
            </div>
          </section>

          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h2 className="manager-panel__title">Doanh thu theo ngày (7 ngày)</h2>
                <p className="manager-panel__subtitle">
                  Phân bổ doanh thu từng ngày giúp phát hiện xu hướng tăng giảm.
                </p>
              </div>
            </div>
            <div className="manager-table__wrapper">
              {revenueByDay.length === 0 ? (
                <div className="manager-table__empty">Chưa có dữ liệu doanh thu gần đây.</div>
              ) : (
                <table className="manager-table">
                  <thead>
                    <tr>
                      <th>Ngày</th>
                      <th>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByDay.map((item, index) => {
                      const formattedDate = new Date(item.date).toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      return (
                        <tr key={`${item.date}-${index}`}>
                          <td>{formattedDate}</td>
                          <td>{formatCurrency(item.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, meta }) {
  return (
    <div className="manager-card">
      <div className="manager-card__label">{label}</div>
      <div className="manager-card__value">{value}</div>
      {meta && <div className="manager-card__meta">{meta}</div>}
    </div>
  );
}

function SplitCard({ label, currentLabel, currentValue, previousLabel, previousValue }) {
  return (
    <div className="manager-card">
      <div className="manager-card__label">{label}</div>
      <div className="manager-grid-two" style={{ gap: 8 }}>
        <div>
          <div className="manager-card__meta">{currentLabel}</div>
          <div className="manager-card__value">{currentValue}</div>
        </div>
        <div>
          <div className="manager-card__meta">{previousLabel}</div>
          <div className="manager-card__value">{previousValue}</div>
        </div>
      </div>
    </div>
  );
}
