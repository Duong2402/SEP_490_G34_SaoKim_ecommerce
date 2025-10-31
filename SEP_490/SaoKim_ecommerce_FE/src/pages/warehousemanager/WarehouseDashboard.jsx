import React, { useEffect, useState } from "react";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { Breadcrumb } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faTruck, faBoxes, faArrowDown, faArrowUp } from "@fortawesome/free-solid-svg-icons";
import { Card, CardBody } from "react-bootstrap";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const WarehouseDashboard = () => {
  const [stats, setStats] = useState({
    totalInbound: 120,
    totalOutbound: 95,
    totalStock: 540,
    lowStockItems: 12,
  });

  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    // Fake chart data
    const data = [
      { name: "Mon", inbound: 30, outbound: 20 },
      { name: "Tue", inbound: 40, outbound: 25 },
      { name: "Wed", inbound: 50, outbound: 40 },
      { name: "Thu", inbound: 20, outbound: 35 },
      { name: "Fri", inbound: 45, outbound: 30 },
    ];
    setChartData(data);
  }, []);

  return (
    <WarehouseLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item active>
              <FontAwesomeIcon icon={faHome} /> Dashboard
            </Breadcrumb.Item>
          </Breadcrumb>

          <h4>Warehouse Manager Dashboard</h4>
          <p className="mb-0 text-muted">
            Overview of your warehouse activities and performance.
          </p>
        </div>
      </div>

      <div className="container-fluid">
        {/* --- STAT CARDS --- */}
        <div className="row g-4 mb-4">
          <div className="col-md-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <div className="card shadow-sm border-0 text-center">
                <div className="card-body">
                  <FontAwesomeIcon icon={faArrowDown} className="text-primary mb-2" size="2x" />
                  <h5>Inbound</h5>
                  <h3>{stats.totalInbound}</h3>
                  <small className="text-muted">Goods received</small>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <div className="card shadow-sm border-0 text-center">
                <div className="card-body">
                  <FontAwesomeIcon icon={faArrowUp} className="text-success mb-2" size="2x" />
                  <h5>Outbound</h5>
                  <h3>{stats.totalOutbound}</h3>
                  <small className="text-muted">Goods shipped</small>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <div className="card shadow-sm border-0 text-center">
                <div className="card-body">
                  <FontAwesomeIcon icon={faBoxes} className="text-warning mb-2" size="2x" />
                  <h5>Total Stock</h5>
                  <h3>{stats.totalStock}</h3>
                  <small className="text-muted">Items in inventory</small>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="col-md-3">
            <motion.div whileHover={{ scale: 1.05 }}>
              <div className="card shadow-sm border-0 text-center">
                <div className="card-body">
                  <FontAwesomeIcon icon={faTruck} className="text-danger mb-2" size="2x" />
                  <h5>Low Stock</h5>
                  <h3>{stats.lowStockItems}</h3>
                  <small className="text-muted">Items below reorder level</small>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* --- CHART SECTION --- */}
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <h5 className="mb-3">Weekly Inbound vs Outbound</h5>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="inbound" fill="#007bff" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outbound" fill="#28a745" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseDashboard;
