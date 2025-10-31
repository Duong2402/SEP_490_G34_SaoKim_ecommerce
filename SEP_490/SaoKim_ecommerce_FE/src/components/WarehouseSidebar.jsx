import React from "react";
import { Nav } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
  faTruckLoading, 
  faTruckMoving, 
  faBoxes, 
  faChartBar, 
  faSearchLocation 
} from "@fortawesome/free-solid-svg-icons";

import { Link, useLocation } from "react-router-dom";

const WarehouseSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { title: "Manage Inbound", icon: faTruckLoading, link: "/warehouse-dashboard/receiving-slips" },
    { title: "Manage Outbound", icon: faTruckMoving, link: "/warehouse-dashboard/dispatch-slips" },
    { title: "Manage Inventory", icon: faBoxes, link: "/warehouse-dashboard/inventory" },
    { title: "Warehouse Report", icon: faChartBar, link: "/warehouse-dashboard/warehouse-report" },
    { title: "Traceability", icon: faSearchLocation, link: "/warehouse-dashboard/traceability" },

  ];

  return (
    <div className="sidebar d-flex flex-column bg-dark text-white p-3" style={{ minHeight: "100vh", width: "400px" }}>
      <div className="sidebar-header mb-4">
        <h5 className="text-white">📦 Warehouse Manager</h5>
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

export default WarehouseSidebar;
