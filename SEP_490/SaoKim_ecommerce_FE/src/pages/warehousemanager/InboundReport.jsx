import React, { useEffect, useState } from "react";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { Breadcrumb } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome } from "@fortawesome/free-solid-svg-icons";
import { Link } from "react-router-dom";

const InboundReport = () => {
  const [inboundData, setInboundData] = useState([]);
  const [search, setSearch] = useState("");

  // useEffect(() => {
  //   fetch("https://localhost:7278/api/warehouse-report/inbound-report")
  //     .then((res) => res.json())
  //     .then((d) => setData(d.items || []))
  //     .catch((err) => console.error("Failed to load report", err));
  // }, []);

  useEffect(() => {
    const dummyData = [
      { id: 1, supplier: "ABC Supplies", project: "Project A", source: "Import", date: "2025-10-25", quantity: 200 },
      { id: 2, supplier: "XYZ Co.", project: "Project B", source: "Local", date: "2025-10-28", quantity: 120 },
      { id: 3, supplier: "Delta Ltd.", project: "Project A", source: "Import", date: "2025-10-29", quantity: 300 },
    ];
    setInboundData(dummyData);
  }, []);

  const filteredData = inboundData.filter(
    (item) =>
      item.supplier.toLowerCase().includes(search.toLowerCase()) ||
      item.project.toLowerCase().includes(search.toLowerCase()) ||
      item.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <WarehouseLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item href="/warehouse-dashboard">
              <FontAwesomeIcon icon={faHome} href="/warehouse-dashboard" />
            </Breadcrumb.Item>
            <Breadcrumb.Item href="/warehouse-dashboard/warehouse-report">Warehouse Report</Breadcrumb.Item>
            <Breadcrumb.Item active>Inbound Report</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Inbound Report</h4>
          <p className="mb-0">
            View all goods received by supplier, project, or source.
          </p>
        </div>
      </div>

      <div className="container-fluid">
        <div className="mb-3 d-flex justify-content-between align-items-center">
          <input
            type="text"
            className="form-control w-50"
            placeholder="Search by supplier, project, or source..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="card shadow-sm">
          <div className="card-body table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-primary">
                <tr>
                  <th>ID</th>
                  <th>Supplier</th>
                  <th>Project</th>
                  <th>Source</th>
                  <th>Date Received</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length > 0 ? (
                  filteredData.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.supplier}</td>
                      <td>{item.project}</td>
                      <td>{item.source}</td>
                      <td>{item.date}</td>
                      <td>{item.quantity}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No data found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </WarehouseLayout>
  );
};

export default InboundReport;
