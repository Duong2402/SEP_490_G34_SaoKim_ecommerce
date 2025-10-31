import React from "react";
import { Link } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { Breadcrumb } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";

const WarehouseReport = () => {
  return (
    <WarehouseLayout>
      {/* Breadcrumb header */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item href="/warehouse-dashboard">
              <FontAwesomeIcon icon={faHome} href="/warehouse-dashboard" />
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Warehouse Reports</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Warehouse Reports</h4>
          <p className="mb-0">
            View inbound, outbound, and stock summary reports.
          </p>
        </div>
      </div>

      {/* Report cards */}
      <div className="container-fluid">
        <div className="row g-4">
          {/* Inbound Report */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Inbound Report</h5>
                <p className="card-text">
                  View all goods received by supplier, project, or source.
                </p>
                <Link
                  to="/warehouse-dashboard/warehouse-report/inbound-report"
                  className="btn btn-primary"
                >
                  View Report
                </Link>
              </div>
            </div>
          </div>

          {/* Outbound Report */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Outbound Report</h5>
                <p className="card-text">
                  Track all goods shipped out and destinations.
                </p>
                <Link
                  to="/warehouse-report/outbound-report"
                  className="btn btn-outline-primary disabled"
                >
                  Coming Soon
                </Link>
              </div>
            </div>
          </div>

          {/* Stock Summary */}
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Stock Summary</h5>
                <p className="card-text">
                  Check current stock levels across all products.
                </p>
                <Link
                  to="/warehouse-report/stock-summary"
                  className="btn btn-outline-primary disabled"
                >
                  Coming Soon
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WarehouseLayout>
  );
};

export default WarehouseReport;
