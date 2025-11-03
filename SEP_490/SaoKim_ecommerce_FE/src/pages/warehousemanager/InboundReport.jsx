import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, Form, InputGroup, Badge } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch, faTruckLoading } from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const InboundReport = () => {
  const [inboundData, setInboundData] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const dummyData = [
      { id: 1, supplier: "ABC Supplies", project: "Project A", source: "Import", date: "2025-10-25", quantity: 200 },
      { id: 2, supplier: "XYZ Co.", project: "Project B", source: "Local", date: "2025-10-28", quantity: 120 },
      { id: 3, supplier: "Delta Ltd.", project: "Project A", source: "Import", date: "2025-10-29", quantity: 300 },
      { id: 4, supplier: "Omega Group", project: "Project C", source: "Local", date: "2025-11-02", quantity: 180 },
    ];
    setInboundData(dummyData);
  }, []);

  const filteredData = useMemo(
    () =>
      inboundData.filter(
        (item) =>
          item.supplier.toLowerCase().includes(search.toLowerCase()) ||
          item.project.toLowerCase().includes(search.toLowerCase()) ||
          item.source.toLowerCase().includes(search.toLowerCase())
      ),
    [inboundData, search]
  );

  const totals = useMemo(() => {
    const totalQty = filteredData.reduce((acc, curr) => acc + Number(curr.quantity || 0), 0);
    const totalSuppliers = new Set(filteredData.map((item) => item.supplier)).size;
    return { totalQty, totalSuppliers };
  }, [filteredData]);

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
              <Breadcrumb.Item href="/warehouse-dashboard/warehouse-report">
                Thống kê báo cáo
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Báo cáo nhập kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Báo cáo nhập kho</h1>
          <p className="wm-page-subtitle">
            Tổng quan hàng hóa đã tiếp nhận theo nhà cung cấp, dự án và nguồn hàng.
          </p>
        </div>
      </div>

      <div className="wm-summary">
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng dòng dữ liệu</span>
          <span className="wm-summary__value">{filteredData.length}</span>
          <span className="wm-subtle-text">Theo bộ lọc hiện tại</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Nhà cung cấp tham gia</span>
          <span className="wm-summary__value">{totals.totalSuppliers}</span>
          <span className="wm-subtle-text">Đang có hàng trong báo cáo</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số lượng</span>
          <span className="wm-summary__value">{totals.totalQty}</span>
          <span className="wm-subtle-text">Theo đơn vị nhập báo cáo</span>
        </div>
      </div>

      <div className="wm-surface wm-toolbar">
        <div className="wm-toolbar__search">
          <InputGroup>
            <InputGroup.Text>
              <FontAwesomeIcon icon={faSearch} />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Tìm kiếm theo nhà cung cấp, dự án hoặc nguồn hàng..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Nhà cung cấp</th>
              <th>Dự án</th>
              <th>Nguồn hàng</th>
              <th>Ngày tiếp nhận</th>
              <th>Số lượng</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td className="fw-semibold">{item.supplier}</td>
                  <td>{item.project}</td>
                  <td>
                    <Badge bg={item.source === "Import" ? "info" : "success"}>
                      {item.source}
                    </Badge>
                  </td>
                  <td>{item.date}</td>
                  <td>{item.quantity}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="wm-empty">
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="wm-surface d-flex flex-column gap-2">
        <h2 className="wm-section-title d-flex align-items-center gap-2">
          <FontAwesomeIcon icon={faTruckLoading} className="text-primary" />
          Ghi chú vận hành
        </h2>
        <ul className="wm-alert-list">
          <li className="wm-alert-item">
            <span className="wm-alert-item__badge">1</span>
            <div className="wm-alert-item__content">
              <h6>Tỷ lệ nhập đúng lịch 92%</h6>
              <p>
                3 lô hàng nhập sớm hơn dự kiến, giúp tối ưu lịch vận hành kho. Theo dõi lại năng lực
                tiếp nhận cho tuần tới.
              </p>
            </div>
          </li>
          <li className="wm-alert-item">
            <span className="wm-alert-item__badge">2</span>
            <div className="wm-alert-item__content">
              <h6>Kiểm định chất lượng</h6>
              <p>
                Lô hàng từ Delta Ltd. cần bổ sung chứng nhận chất lượng trước khi nhập kho chính thức.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </WarehouseLayout>
  );
};

export default InboundReport;

