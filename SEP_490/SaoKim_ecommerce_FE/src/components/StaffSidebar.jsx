import React from "react";
import { Nav } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTruckLoading,
  faTruckMoving,
  faChartBar,
  faUsers,
} from "@fortawesome/free-solid-svg-icons";
import { faFileInvoiceDollar } from "@fortawesome/free-solid-svg-icons";
import { Link, useLocation } from "react-router-dom";

const StaffSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { title: "Dashboard", icon: faChartBar, link: "/staff/manager-dashboard" },
    { title: "Manage Product", icon: faTruckLoading, link: "/staff/manager-products" },

    // mục mới bạn yêu cầu
    { title: "Orders", icon: faTruckMoving, link: "/staff/manager-orders" },

    { title: "Customers", icon: faUsers, link: "/staff/manager-customers" },
    { title: "Invoices", icon: faFileInvoiceDollar, link: "/staff/invoices" },
  ];

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div
      className="sidebar d-flex flex-column bg-dark text-white p-3"
      style={{ minHeight: "100vh", width: "280px" }}
    >
      <div className="sidebar-header mb-4">
        <h5 className="text-white">Staff Manager</h5>
      </div>

      <Nav className="flex-column">
        {menuItems.map((item, idx) => (
          <Nav.Item key={idx} className="mb-2">
            <Nav.Link
              as={Link}
              to={item.link}
              className={`text-white d-flex align-items-center ${
                isActive(item.link) ? "active" : ""
              }`}
              style={{
                backgroundColor: isActive(item.link) ? "#495057" : "transparent",
                borderRadius: "8px",
                padding: "10px 12px",
              }}
            >
              <FontAwesomeIcon icon={item.icon} className="me-2" />
              {item.title}
            </Nav.Link>
          </Nav.Item>
        ))}
      </Nav>
    </div>
  );
};

export default StaffSidebar;
