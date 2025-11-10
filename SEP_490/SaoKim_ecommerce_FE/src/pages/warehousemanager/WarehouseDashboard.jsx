import React, { useEffect, useState } from "react";
import { Breadcrumb } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowDown,
  faArrowUp,
  faBoxesStacked,
  faTriangleExclamation,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const ALERTS = [
  {
    id: 1,
    badge: "SKU-LGT-201",
    title: "Tồn kho dưới ngưỡng cảnh báo",
    description: "Cần nhập tối thiểu 50 bộ đèn spotlight để đáp ứng tiến độ thi công showroom.",
  },
  {
    id: 2,
    badge: "PXK-3398",
    title: "Phiếu xuất chờ xác nhận",
    description: "Đơn hàng dự án Sao Kim Solar cần được duyệt trước 14:00 hôm nay.",
  },
  {
    id: 3,
    badge: "QC-08/11",
    title: "Lô hàng chờ kiểm định chất lượng",
    description: "02 pallet đèn panel nhập mới đang chờ QC tại khu vực tiếp nhận.",
  },
];

const SUMMARY = [
  { label: "Phiếu chờ duyệt", value: "07", note: "3 phiếu nhập • 4 phiếu xuất" },
  { label: "SKU dưới định mức", value: "12", note: "Đạt 6% tổng danh mục" },
  { label: "Tỷ lệ đúng hạn", value: "96%", note: "Hiệu suất 4 tuần gần nhất" },
  { label: "Giá trị tồn kho", value: "≈ 4.2B", note: "Theo giá trung bình" },
];

const WarehouseDashboard = () => {
  const [stats, setStats] = useState({
    totalInbound: 0,
    totalOutbound: 95,
    totalStock: 540,
    lowStockItems: 12,
  });

  const navigate = useNavigate();
  const [weeklyInbound, setWeeklyInbound] = useState({ thisWeek: 0, lastWeek: 0 });
  const [weeklyOutbound, setWeeklyOutbound] = useState({ thisWeek: 0, lastWeek: 0 });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const data = [
      { name: "Th 2", inbound: 30, outbound: 20 },
      { name: "Th 3", inbound: 42, outbound: 24 },
      { name: "Th 4", inbound: 51, outbound: 40 },
      { name: "Th 5", inbound: 28, outbound: 38 },
      { name: "Th 6", inbound: 46, outbound: 33 },
      { name: "Th 7", inbound: 35, outbound: 27 },
    ];
    setChartData(data);
    const fetchWeeklyInbound = async () => {
      try {
        const res = await fetch("https://localhost:7278/api/warehousemanager/receiving-slips/weekly-summary");
        const data = await res.json();
        setWeeklyInbound(data);
        setStats(prev => ({
          ...prev,
          totalInbound: data.thisWeek,
        }));
      } catch (err) {
        console.error("Failed to fetch weekly inbound:", err);
      }
    };

    fetchWeeklyInbound();

    const fetchWeeklyOutbound = async () => {
      try {
        const res = await fetch("https://localhost:7278/api/warehousemanager/dispatch-slips/weekly-summary");
        const data = await res.json();
        setWeeklyInbound(data);
        setStats(prev => ({
          ...prev,
          totalInbound: data.thisWeek,
        }));
      } catch (err) {
        console.error("Failed to fetch weekly inbound:", err);
      }
    };

    fetchWeeklyOutbound();

    const fetchStats = async () => {
      try {
        const resStock = await fetch("https://localhost:7278/api/warehousemanager/total-stock");
        const dataStock = await resStock.json();

        setStats(prev => ({
          ...prev,
          totalStock: dataStock.totalStock
        }));
      } catch (err) {
        console.error("Failed to fetch total stock:", err);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      key: "inbound",
      icon: faArrowDown,
      label: "Phiếu nhập tuần",
      value: weeklyInbound.thisWeek,
      meta: (() => {
        const { thisWeek, lastWeek } = weeklyInbound;
        if (lastWeek === 0) return "N/A";
        const diffPercent = ((thisWeek - lastWeek) / lastWeek) * 100;
        return diffPercent >= 0
          ? `+${diffPercent.toFixed(1)}% so với tuần trước`
          : `${diffPercent.toFixed(1)}% so với tuần trước`;
      })(),
      onClick: () => navigate("/warehouse-dashboard/receiving-slips"),
    },
    {
      key: "outbound",
      icon: faArrowUp,
      label: "Phiếu xuất tuần",
      value: weeklyOutbound.thisWeek,
      meta: (() => {
        const { thisWeek, lastWeek } = weeklyOutbound;
        if (lastWeek === 0) return "N/A";
        const diffPercent = ((thisWeek - lastWeek) / lastWeek) * 100;
        return diffPercent >= 0
          ? `+${diffPercent.toFixed(1)}% so với tuần trước`
          : `${diffPercent.toFixed(1)}% so với tuần trước`;
      })(),
      onClick: () => navigate("/warehouse-dashboard/dispatch-slips"),
    },
    {
      key: "stock",
      icon: faBoxesStacked,
      label: "Tổng SKU đang quản lý",
      value: stats.totalStock,
      meta: "Bao gồm thành phẩm & phụ kiện",
    },
    {
      key: "lowStock",
      icon: faTriangleExclamation,
      label: "Cần bổ sung",
      value: stats.lowStockItems,
      meta: "SKU dưới định mức an toàn",
    },
  ];

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item active>
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Tổng quan kho Sao Kim</h1>
          <p className="wm-page-subtitle">
            Theo dõi hoạt động nhập - xuất, cảnh báo tồn kho và tình trạng thực thi trong tuần.
          </p>
        </div>

        <div className="wm-page-actions">
          <button type="button" className="wm-btn wm-btn--primary">
            <FontAwesomeIcon icon={faArrowTrendUp} />
            Tải báo cáo tuần
          </button>
        </div>
      </div>

      <div className="wm-stat-grid">
        {statCards.map((stat) => (
          <div
            key={stat.key}
            className="wm-stat-card"
            style={{ cursor: stat.onClick ? "pointer" : "default" }}
            onClick={stat.onClick}
          >
            <div className="wm-stat-card__icon">
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <span className="wm-stat-card__label">{stat.label}</span>
            <span className="wm-stat-card__value">{stat.value}</span>
            <span className="wm-stat-card__meta">{stat.meta}</span>
          </div>
        ))}
      </div>

      <div className="wm-summary">
        {SUMMARY.map((item) => (
          <div key={item.label} className="wm-summary__card">
            <span className="wm-summary__label">{item.label}</span>
            <span className="wm-summary__value">{item.value}</span>
            <span className="wm-subtle-text">{item.note}</span>
          </div>
        ))}
      </div>

      <div className="wm-grid-two">
        <section className="wm-surface">
          <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-3">
            <div>
              <h2 className="wm-section-title mb-1">Biểu đồ luân chuyển</h2>
              <p className="wm-subtle-text mb-0">
                So sánh lượng nhập và xuất trong 6 ngày gần nhất.
              </p>
            </div>
            <span className="wm-tag">
              <FontAwesomeIcon icon={faArrowTrendUp} />
              Dữ liệu realtime
            </span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 12, right: 24, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" stroke="#dbe3ff" />
              <XAxis dataKey="name" stroke="#7081b9" />
              <YAxis stroke="#7081b9" />
              <Tooltip
                cursor={{ fill: "rgba(31, 91, 255, 0.08)" }}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid rgba(31, 91, 255, 0.18)",
                  boxShadow: "0 18px 40px -30px rgba(15, 27, 61, 0.8)",
                }}
              />
              <Bar dataKey="inbound" fill="#1f5bff" radius={[10, 10, 4, 4]} />
              <Bar dataKey="outbound" fill="#0ea5e9" radius={[10, 10, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="wm-surface">
          <h2 className="wm-section-title">Cảnh báo ưu tiên</h2>
          <ul className="wm-alert-list">
            {ALERTS.map((alert, index) => (
              <li key={alert.id} className="wm-alert-item">
                <span className="wm-alert-item__badge">{index + 1}</span>
                <div className="wm-alert-item__content">
                  <h6>{alert.title}</h6>
                  <p>{alert.description}</p>
                  <span className="wm-tag">{alert.badge}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseDashboard;

