import { useEffect, useState } from "react";
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
import { Toast, ToastContainer } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";
import { ensureRealtimeStarted, getRealtimeConnection } from "../../signalr/realtimeHub";

const ALERTS = [
  {
    id: 1,
    badge: "SKU-LGT-201",
    title: "Tồn kho dưới ngưỡng cảnh báo",
    description:
      "Cần nhập tối thiểu 50 bộ đèn spotlight để đáp ứng tiến độ thi công showroom.",
  },
  {
    id: 2,
    badge: "PXK-3398",
    title: "Phiếu xuất chờ xác nhận",
    description:
      "Đơn hàng dự án Sao Kim Solar cần được duyệt trước 14:00 hôm nay.",
  },
  {
    id: 3,
    badge: "QC-08/11",
    title: "Lô hàng chờ kiểm định chất lượng",
    description:
      "02 pallet đèn panel nhập mới đang chờ QC tại khu vực tiếp nhận.",
  },
];

const SUMMARY = [
  { label: "Phiếu chờ duyệt", value: "07", note: "3 phiếu nhập • 4 phiếu xuất" },
  { label: "SKU dưới định mức", value: "12", note: "Đạt 6% tổng danh mục" },
];

const WarehouseDashboard = () => {
  const [stats, setStats] = useState({
    totalStock: 0,
    lowStockItems: 0,
  });

  const [weeklyInbound, setWeeklyInbound] = useState({
    thisWeek: 0,
    lastWeek: 0,
  });
  const [weeklyOutbound, setWeeklyOutbound] = useState({
    thisWeek: 0,
    lastWeek: 0,
  });

  const [chartData, setChartData] = useState([]);
  const [notify, setNotify] = useState(null);

  const navigate = useNavigate();

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
        const res = await apiFetch(
          "/api/warehousemanager/receiving-slips/weekly-summary"
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Không tải được thống kê nhập kho tuần (HTTP ${res.status}) ${text}`
          );
        }
        const data = await res.json();
        setWeeklyInbound(data);
      } catch (err) {
        console.error("Không thể tải thống kê phiếu nhập trong tuần:", err);
        setNotify(
          err.message || "Không thể tải thống kê phiếu nhập trong tuần."
        );
      }
    };

    const fetchWeeklyOutbound = async () => {
      try {
        const res = await apiFetch(
          "/api/warehousemanager/dispatch-slips/weekly-summary"
        );
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Không tải được thống kê xuất kho tuần (HTTP ${res.status}) ${text}`
          );
        }
        const data = await res.json();
        setWeeklyOutbound(data);
      } catch (err) {
        console.error("Không thể tải thống kê phiếu xuất trong tuần:", err);
        setNotify(
          err.message || "Không thể tải thống kê phiếu xuất trong tuần."
        );
      }
    };

    const fetchTotalStock = async () => {
      try {
        const resStock = await apiFetch(
          "/api/warehousemanager/total-stock"
        );
        if (!resStock.ok) {
          const text = await resStock.text().catch(() => "");
          throw new Error(
            `Không tải được tổng tồn kho (HTTP ${resStock.status}) ${text}`
          );
        }
        const dataStock = await resStock.json();

        setStats((prev) => ({
          ...prev,
          totalStock: dataStock.totalStock ?? 0,
        }));
      } catch (err) {
        console.error("Không thể tải tổng tồn kho:", err);
        setNotify(err.message || "Không thể tải tổng tồn kho.");
      }
    };

    const fetchLowStockItems = async () => {
      try {
        const makeCall = async (status) => {
          const params = new URLSearchParams({
            page: "1",
            pageSize: "1",
            status,
          });
          const res = await apiFetch(
            `/api/warehousemanager/inventory-report?${params.toString()}`
          );
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(
              `Không tải được thống kê tồn kho (${status}) (HTTP ${res.status}) ${text}`
            );
          }
          const data = await res.json();
          return data.totalItems ?? data.total ?? (data.items ? data.items.length : 0);
        };

        const [alertCount, criticalCount] = await Promise.all([
          makeCall("alert"),
          makeCall("critical"),
        ]);

        setStats((prev) => ({
          ...prev,
          lowStockItems: alertCount + criticalCount,
        }));
      } catch (err) {
        console.error("Không thể tải thống kê SKU dưới định mức:", err);
        setNotify(
          err.message || "Không thể tải thống kê SKU dưới định mức."
        );
      }
    };

    fetchWeeklyInbound();
    fetchWeeklyOutbound();
    fetchTotalStock();
    fetchLowStockItems();
  }, []);
  
  useEffect(() => {
    const conn = getRealtimeConnection();

    conn.off("evt");

    conn.on("evt", (evt) => {
      const type = evt?.type;
      if (!type) return;

      const shouldRefresh =
        type.startsWith("receiving.") ||
        type.startsWith("dispatch.") ||
        type.startsWith("inventory.");

      if (!shouldRefresh) return;

      fetchWeeklyInbound();
      fetchWeeklyOutbound();
      fetchTotalStock();
      fetchLowStockItems();
    });

    ensureRealtimeStarted().catch(() => {
      setNotify("Không thể kết nối realtime tới máy chủ.");
    });

    return () => {
      conn.off("evt");
    };
  }, []);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(null), 3500);
    return () => clearTimeout(t);
  }, [notify]);

  const statCards = [
    {
      key: "inbound",
      icon: faArrowDown,
      label: "Phiếu nhập tuần",
      value: weeklyInbound.thisWeek,
      meta: (() => {
        const { thisWeek, lastWeek } = weeklyInbound;
        if (!lastWeek) return "Chưa có dữ liệu so sánh";
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
        if (!lastWeek) return "Chưa có dữ liệu so sánh";
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
            Theo dõi hoạt động nhập - xuất, cảnh báo tồn kho và tình trạng thực
            thi trong tuần.
          </p>
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
              Dữ liệu thời gian thực
            </span>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={chartData}
              margin={{ top: 12, right: 24, left: -12, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke="#d6e3f4" />
              <XAxis dataKey="name" stroke="#6c7ba0" />
              <YAxis stroke="#6c7ba0" />
              <Tooltip
                cursor={{ fill: "rgba(31, 118, 192, 0.08)" }}
                contentStyle={{
                  borderRadius: 14,
                  border: "1px solid rgba(31, 118, 192, 0.18)",
                  boxShadow: "0 18px 40px -30px rgba(15, 27, 61, 0.8)",
                }}
              />
              <Bar dataKey="inbound" fill="#1f76c0" radius={[10, 10, 4, 4]} />
              <Bar dataKey="outbound" fill="#35a0e8" radius={[10, 10, 4, 4]} />
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

      {notify && (
        <ToastContainer
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
          }}
        >
          <Toast
            onClose={() => setNotify(null)}
            show={!!notify}
            delay={3500}
            autohide
            bg="danger"
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Thông báo</strong>
            </Toast.Header>
            <Toast.Body>{notify}</Toast.Body>
          </Toast>
        </ToastContainer>
      )}
    </WarehouseLayout>
  );
};

export default WarehouseDashboard;
