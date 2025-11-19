// src/pages/manager/Dashboard.jsx
import { useEffect, useState } from "react";

import {
  getManagerOverview,
  getRevenueByDay,
} from "../../api/manager-reports";

function formatCurrency(value) {
  if (value == null) return "0";
  return value.toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  });
}

function formatNumber(value) {
  if (value == null) return "0";
  return value.toLocaleString("vi-VN");
}

export default function ManagerDashboard() {
  const [overview, setOverview] = useState(null);
  const [revenueByDay, setRevenueByDay] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const [ov, rev] = await Promise.all([
          getManagerOverview(),
          getRevenueByDay(7),
        ]);

        if (!isMounted) return;

        setOverview(ov || {});
        setRevenueByDay(Array.isArray(rev) ? rev : []);
      } catch (err) {
        if (!isMounted) return;
        const msg =
          err?.response?.data ||
          err?.message ||
          "Đã xảy ra lỗi khi tải dữ liệu";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const revenue = overview?.revenue;
  const warehouse = overview?.warehouse;
  const projects = overview?.projects;

  return (
    <div
      className="manager-dashboard container"
      style={{ padding: "24px 24px 40px" }}
    >
      <h1
        style={{
          fontSize: "24px",
          fontWeight: 600,
          marginBottom: "16px",
        }}
      >
        Dashboard
      </h1>

      {loading && <div>Đang tải dữ liệu...</div>}

      {!loading && error && (
        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: 6,
            backgroundColor: "#fdecea",
            color: "#b71c1c",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && overview && (
        <>
          {/* REVENUE SECTION */}
          <section style={{ marginTop: "24px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Doanh thu
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard
                title="Tổng doanh thu"
                value={formatCurrency(revenue?.totalRevenue)}
              />
              <SummaryCard
                title="Doanh thu 7 ngày gần nhất"
                value={formatCurrency(revenue?.revenue7d)}
              />
              <SummaryCard
                title="Đơn hàng hôm nay"
                value={formatNumber(revenue?.ordersToday)}
              />
              <SummaryCard
                title="Đơn đang chờ xử lý"
                value={formatNumber(revenue?.pendingOrders)}
              />
            </div>
          </section>

          {/* WAREHOUSE SECTION */}
          <section style={{ marginTop: "32px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Hiệu suất kho
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard
                title="Tổng tồn kho (số lượng)"
                value={formatNumber(warehouse?.totalStock)}
              />

              <div style={cardStyle}>
                <div style={cardTitleStyle}>Nhập kho (phiếu)</div>
                <div style={cardRowStyle}>
                  <div>
                    <div style={labelStyle}>Tuần này</div>
                    <div style={valueStyle}>
                      {formatNumber(warehouse?.inbound?.thisWeek)}
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Tuần trước</div>
                    <div style={valueStyle}>
                      {formatNumber(warehouse?.inbound?.lastWeek)}
                    </div>
                  </div>
                </div>
              </div>

              <div style={cardStyle}>
                <div style={cardTitleStyle}>Xuất kho (phiếu)</div>
                <div style={cardRowStyle}>
                  <div>
                    <div style={labelStyle}>Tuần này</div>
                    <div style={valueStyle}>
                      {formatNumber(warehouse?.outbound?.thisWeek)}
                    </div>
                  </div>
                  <div>
                    <div style={labelStyle}>Tuần trước</div>
                    <div style={valueStyle}>
                      {formatNumber(warehouse?.outbound?.lastWeek)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* PROJECT SECTION */}
          <section style={{ marginTop: "32px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Dự án
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard
                title="Tổng số dự án"
                value={formatNumber(projects?.totalProjects)}
              />
              <SummaryCard
                title="Dự án nháp"
                value={formatNumber(projects?.draftProjects)}
              />
              <SummaryCard
                title="Dự án đang chạy"
                value={formatNumber(projects?.activeProjects)}
              />
              <SummaryCard
                title="Dự án hoàn thành"
                value={formatNumber(projects?.completedProjects)}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(260px, 1fr))",
                gap: "16px",
                marginTop: "16px",
              }}
            >
              <SummaryCard
                title="Tổng Budget"
                value={formatCurrency(projects?.totalBudget)}
              />
              <SummaryCard
                title="Tổng chi phí sản phẩm"
                value={formatCurrency(projects?.totalProductCost)}
              />
              <SummaryCard
                title="Tổng chi phí khác"
                value={formatCurrency(projects?.totalOtherExpenses)}
              />
              <SummaryCard
                title="Tổng chi phí thực tế"
                value={formatCurrency(projects?.totalActualCost)}
              />
            </div>
          </section>

          {/* REVENUE BY DAY */}
          <section style={{ marginTop: "32px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "12px",
              }}
            >
              Doanh thu 7 ngày gần nhất
            </h2>

            <div style={cardStyle}>
              {!revenueByDay || revenueByDay.length === 0 ? (
                <div>Không có dữ liệu doanh thu.</div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "14px",
                  }}
                >
                  <thead>
                    <tr>
                      <th style={thStyle}>Ngày</th>
                      <th style={thStyle}>Doanh thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByDay.map((item, idx) => {
                      const d = new Date(item.date);
                      const dateStr = d.toLocaleDateString("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      });
                      return (
                        <tr key={idx}>
                          <td style={tdStyle}>{dateStr}</td>
                          <td style={tdStyle}>
                            {formatCurrency(item.revenue)}
                          </td>
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

function SummaryCard({ title, value }) {
  return (
    <div style={cardStyle}>
      <div style={cardTitleStyle}>{title}</div>
      <div style={valueStyle}>{value}</div>
    </div>
  );
}

// styles đơn giản cho card
const cardStyle = {
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  padding: "16px 18px",
  backgroundColor: "#ffffff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const cardTitleStyle = {
  fontSize: "14px",
  fontWeight: 500,
  color: "#4b5563",
  marginBottom: "6px",
};

const valueStyle = {
  fontSize: "18px",
  fontWeight: 600,
  color: "#111827",
};

const labelStyle = {
  fontSize: "12px",
  color: "#6b7280",
};

const cardRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  marginTop: "8px",
};

const thStyle = {
  textAlign: "left",
  borderBottom: "1px solid #e5e7eb",
  padding: "8px 4px",
  fontWeight: 600,
};

const tdStyle = {
  borderBottom: "1px solid #f3f4f6",
  padding: "6px 4px",
};
