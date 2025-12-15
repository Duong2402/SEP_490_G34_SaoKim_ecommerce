import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faChartBar,
  faFileInvoiceDollar,
  faTruckMoving,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { NavLink, useLocation } from "react-router-dom";

const StaffSidebar = ({ onNavigate }) => {
  const location = useLocation();

  const menuItems = [
    {
      title: "Tổng quan",
      subtitle: "Số liệu nhanh",
      icon: faChartBar,
      link: "/staff/manager-dashboard",
    },
    {
      title: "Sản phẩm",
      subtitle: "Danh mục & tồn kho",
      icon: faBoxOpen,
      link: "/staff/manager-products",
    },
    {
      title: "Đơn hàng",
      subtitle: "Theo dõi & xử lý",
      icon: faTruckMoving,
      link: "/staff/manager-orders",
    },
    {
      title: "Khách hàng",
      subtitle: "Hồ sơ & lịch sử",
      icon: faUsers,
      link: "/staff/manager-customers",
    },
    {
      title: "Hóa đơn",
      subtitle: "Xuất & gửi",
      icon: faFileInvoiceDollar,
      link: "/staff/invoices",
    },
  ];

  const isActive = (path) =>
    location.pathname === path ||
    location.pathname.startsWith(`${path}/`) ||
    (path === "/staff/manager-customers" && location.pathname.startsWith("/staff-view-customers"));

  return (
    <nav className="staff-sidebar__nav" aria-label="Điều hướng Nhân viên">
      {menuItems.map((item) => (
        <NavLink
          key={item.link}
          to={item.link}
          className={({ isActive: activeByRoute }) =>
            `staff-nav-link ${activeByRoute || isActive(item.link) ? "is-active" : ""}`
          }
          onClick={onNavigate}
        >
          <span className="staff-nav-link__icon">
            <FontAwesomeIcon icon={item.icon} />
          </span>
          <div className="staff-nav-link__meta">
            <span>{item.title}</span>
            {item.subtitle && <small>{item.subtitle}</small>}
          </div>
        </NavLink>
      ))}
    </nav>
  );
};

export default StaffSidebar;
