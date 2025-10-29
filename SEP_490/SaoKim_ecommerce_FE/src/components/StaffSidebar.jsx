import React from "react";
import { Nav } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTruckLoading, 
  faTruckMoving, 
  faBoxes, 
  faChartBar, 
  faSearchLocation, 
  faUsers
} from "@fortawesome/free-solid-svg-icons";

import { Link, useLocation } from "react-router-dom";

const StaffSidebar = () => {
  const location = useLocation();

  const menuItems = [
  { title: "Dashboard", icon: faChartBar, link: "/dashboard" },
  { title: "Manage Product", icon: faTruckLoading, link: "/products" },
  { title: "Orders", icon: faTruckMoving, link: "/orders" },
  { title: "Invoices", icon: faBoxes, link: "/invoices" },
  { title: "Promotions", icon: faSearchLocation, link: "/promotions" },
  { title: "Customers", icon: faUsers, link: "/customers" },
  { title: "Reports", icon: faChartBar, link: "/reports" },
];

  return (
    <div className="sidebar d-flex flex-column bg-dark text-white p-3" style={{ minHeight: "100vh", width: "400px" }}>
      <div className="sidebar-header mb-4">
        <h5 className="text-white"> Staff Manager</h5>
      </div>

      <Nav className="flex-column">
        {menuItems.map((item, index) => (
          <Nav.Item key={index} className="mb-2">
            <Nav.Link
              as={Link}
              to={item.link}
              className={`text-white d-flex align-items-center ${location.pathname === item.link ? "active" : ""}`}
              style={{
                backgroundColor: location.pathname === item.link ? "#495057" : "transparent",
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
