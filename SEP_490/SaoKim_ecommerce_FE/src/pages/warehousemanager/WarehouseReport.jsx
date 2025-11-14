import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumb, Badge } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faChartColumn,
  faArrowDown,
  faArrowUp,
  faBoxesStacked,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";

const REPORT_CARDS = [
  {
    title: "Báo cáo nhập kho",
    description: "Theo dõi chi tiết hàng nhập theo nhà cung cấp, dự án và nguồn hàng.",
    link: "/warehouse-dashboard/warehouse-report/inbound-report",
    status: "ready",
    icon: faArrowDown,
  },
  {
    title: "Báo cáo xuất kho",
    description: "Tổng hợp luồng xuất theo khách hàng, trạng thái giao và hiệu suất giao hàng.",
    link: "#",
    status: "coming",
    icon: faArrowUp,
  },
  {
    title: "Tổng hợp tồn kho",
    description: "Đánh giá tồn kho theo SKU, khu vực lưu trữ và mức cảnh báo định mức.",
    link: "#",
    status: "coming",
    icon: faBoxesStacked,
  },
];

const WarehouseReport = () => (
  <WarehouseLayout>
    <div className="wm-page-header">
      <div>
        <div className="wm-breadcrumb">
          <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
            <Breadcrumb.Item href="/warehouse-dashboard">
              <FontAwesomeIcon icon={faHome} /> Bảng điều phối
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Thống kê báo cáo</Breadcrumb.Item>
          </Breadcrumb>
        </div>
        <h1 className="wm-page-title">Trung tâm báo cáo kho</h1>
        <p className="wm-page-subtitle">
          Khai thác dữ liệu kho với các báo cáo chuyên sâu giúp vận hành chính xác hơn.
        </p>
      </div>
    </div>

    <div className="wm-summary">
      <div className="wm-summary__card">
        <span className="wm-summary__label">Báo cáo khả dụng</span>
        <span className="wm-summary__value">01</span>
        <span className="wm-subtle-text">Đã hoàn thiện và sẵn sàng sử dụng</span>
      </div>
      <div className="wm-summary__card">
        <span className="wm-summary__label">Báo cáo sắp ra mắt</span>
        <span className="wm-summary__value">02</span>
        <span className="wm-subtle-text">Đang được ưu tiên phát triển</span>
      </div>
      <div className="wm-summary__card">
        <span className="wm-summary__label">Phiên bản hệ thống</span>
        <span className="wm-summary__value">v1.4.0</span>
        <span className="wm-subtle-text">Cập nhật gần nhất: 02/2025</span>
      </div>
    </div>

    <div className="d-grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
      {REPORT_CARDS.map((card) => (
        <div key={card.title} className="wm-surface d-flex flex-column gap-3 h-100">
          <div className="d-flex align-items-center gap-3">
            <span className="wm-alert-item__badge" style={{ minWidth: 44 }}>
              <FontAwesomeIcon icon={card.icon} />
            </span>
            <div>
              <h2 className="wm-section-title mb-1">{card.title}</h2>
              <p className="wm-subtle-text mb-0">{card.description}</p>
            </div>
          </div>

          {card.status === "ready" ? (
            <Link to={card.link} className="wm-btn wm-btn--primary text-center">
              <FontAwesomeIcon icon={faChartColumn} />
              Xem báo cáo
            </Link>
          ) : (
            <div className="d-flex align-items-center justify-content-between">
              <Badge bg="warning" text="dark">
                Đang phát triển
              </Badge>
              <span className="wm-subtle-text">Liên hệ hỗ trợ nếu cần ưu tiên.</span>
            </div>
          )}
        </div>
      ))}
    </div>
  </WarehouseLayout>
);

export default WarehouseReport;

