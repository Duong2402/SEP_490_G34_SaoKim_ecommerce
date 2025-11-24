import React from "react";
import { Nav } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faGaugeHigh,
  faArrowDownWideShort,
  faArrowUpWideShort,
  faWarehouse,
  faBarcode,
  faChartColumn,
} from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    title: "Quản lý kho",
    icon: faGaugeHigh,
    link: "/warehouse-dashboard",
  },
  {
    title: "Phiếu nhập kho",
    icon: faArrowDownWideShort,
    link: "/warehouse-dashboard/receiving-slips",
  },
  {
    title: "Phiếu xuất kho",
    icon: faArrowUpWideShort,
    link: "/warehouse-dashboard/dispatch-slips",
  },
  {
    title: "Quản lý tồn kho",
    icon: faWarehouse,
    link: "/warehouse-dashboard/inventory",
  },
  {
    title: "Truy xuất sản phẩm",
    icon: faBarcode,
    link: "/warehouse-dashboard/trace",
  },
  {
    title: "Thống kê báo cáo",
    icon: faChartColumn,
    link: "/warehouse-dashboard/warehouse-report",
  },
];

const WarehouseSidebar = () => {
  const location = useLocation();

  return (
    <aside className="warehouse-sidebar" aria-label="Điều hướng quản lý kho">
      <div className="warehouse-sidebar__inner">
        <div className="warehouse-sidebar__brand">
          <span className="warehouse-sidebar__brand-badge">Sao Kim</span>
          <h3 className="warehouse-sidebar__brand-title">Kho Sao Kim</h3>
          <p className="warehouse-sidebar__brand-subtitle">
            Trung tâm điều phối nhập - xuất - tồn cho Warehouse Manager.
          </p>
        </div>

        <Nav className="warehouse-sidebar__menu flex-column">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === item.link ||
              (item.link !== "/warehouse-dashboard" && location.pathname.startsWith(item.link));

            return (
              <Nav.Link
                key={item.link}
                as={Link}
                to={item.link}
                className={`warehouse-sidebar__link${isActive ? " active" : ""}`}
              >
                <FontAwesomeIcon icon={item.icon} />
                <span>{item.title}</span>
              </Nav.Link>
            );
          })}
        </Nav>

        <div className="warehouse-sidebar__footer">
          Cần hỗ trợ?{" "}
          <a href="mailto:support@saokim.vn" rel="noreferrer">
            support@saokim.vn
          </a>
        </div>
      </div>
    </aside>
  );
};

export default WarehouseSidebar;
