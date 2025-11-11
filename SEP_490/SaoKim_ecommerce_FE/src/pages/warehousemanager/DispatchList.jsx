import React, { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faEye,
  faCheck,
  faTrash,
  faPlus,
  faFileExport,
} from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Badge,
  Button,
} from "@themesberg/react-bootstrap";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import Dropdown from "react-bootstrap/Dropdown";
import { apiFetch } from "../../api/lib/apiClient";

const API_BASE = "https://localhost:7278";
const TYPE_FILTERS = ["All", "Sales", "Project"];
const toStatusCode = (v) => {
  if (v === 1 || v === "1") return 1;
  if (v === 0 || v === "0") return 0;
  if (typeof v === "string") {
    const s = v.toLowerCase();
    if (s.includes("confirm")) return 1;
    if (s.includes("draft")) return 0;
  }
  return 0;
};

const DispatchList = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      setLoading(true);
      try {
        const typeQuery = typeFilter === "All" ? "" : `?type=${typeFilter}`;
        const res = await apiFetch(`/api/warehousemanager/dispatch-slips${typeQuery}`);
        const data = await res.json();
        if (active) {
          setRows(data.items || []);
          setCurrentPage(1);
        }
      } catch (error) {
        console.error("Error loading dispatch slips:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [typeFilter]);

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("vi-VN") : "-";

  const normType = (type, row) => {
    if (type === 1 || type === "1") return "Sales";
    if (type === 2 || type === "2") return "Project";
    if (typeof type === "string") return type;
    return row?.customerId || row?.salesOrderNo ? "Sales" : "Project";
  };

  const handleConfirm = async (id) => {
    if (!window.confirm("Xác nhận phiếu xuất kho này?")) return;
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-slips/${id}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Confirm failed");
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, status: 1, confirmedAt: new Date().toISOString() } : r
        )
      );
    } catch (error) {
      console.error("Confirm failed:", error);
      alert("Không thể xác nhận phiếu.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa phiếu xuất kho này?")) return;
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-slips/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Không thể xóa phiếu.");
    }
  };

  const filteredRows = useMemo(() => {
    const keyword = search.toLowerCase();
    return rows.filter((r) => {
      if (!keyword) return true;
      const ref = r.referenceNo || "";
      const so = r.salesOrderNo || "";
      const req = r.requestNo || "";
      const customer = r.customerName || r.customer || "";
      const project = r.projectName || r.project || "";
      const site = r.siteName || r.shipTo || "";
      return (
        ref.toLowerCase().includes(keyword) ||
        so.toLowerCase().includes(keyword) ||
        req.toLowerCase().includes(keyword) ||
        customer.toLowerCase().includes(keyword) ||
        project.toLowerCase().includes(keyword) ||
        site.toLowerCase().includes(keyword)
      );
    });
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const renderStatus = (status) => {
    if (status === 1) return <Badge bg="success">Đã xuất</Badge>;
    if (status === 2) return <Badge bg="info">Đang giao</Badge>;
    return (
      <Badge bg="warning" text="dark">
        Nháp
      </Badge>
    );
  };

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Phiếu xuất kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Quản lý phiếu xuất kho</h1>
          <p className="wm-page-subtitle">
            Theo dõi đơn xuất theo khách hàng, dự án và trạng thái xử lý.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--primary"
            onClick={() => navigate("/warehouse-dashboard/dispatch-slips/create")}
          >
            <FontAwesomeIcon icon={faPlus} />
            Tạo phiếu xuất kho
          </button>
          <button type="button" className="wm-btn wm-btn--primary">
            <FontAwesomeIcon icon={faFileExport} />
            Xuất báo cáo
          </button>
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
              placeholder="Tìm theo khách hàng, mã phiếu, dự án..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>
        </div>

        <div className="wm-toolbar__actions">
          <Dropdown className="me-2">
            <Dropdown.Toggle variant="link" className="wm-btn wm-btn--light">
              {TYPE_FILTERS.includes(typeFilter) ? typeFilter : "All"}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              {TYPE_FILTERS.map((type) => (
                <Dropdown.Item
                  key={type}
                  active={typeFilter === type}
                  onClick={() => setTypeFilter(type)}
                >
                  {type === "All" ? "Tất cả loại phiếu" : type}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Loại phiếu</th>
              <th>Mã</th>
              <th>Phân Loại</th>
              <th>Ngày xuất</th>
              <th>Ngày tạo</th>
              <th>Ngày xác nhận</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : pagedRows.length === 0 ? (
              <tr>
                <td colSpan={11} className="wm-empty">
                  Không có phiếu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              pagedRows.map((r, index) => {
                const normalizedType = normType(r.type, r);
                const isSales = normalizedType === "Sales";
                const code = toStatusCode(r.status);      // 0 = Draft, 1 = Confirmed
                const isConfirmed = code === 1;

                return (
                  <tr key={r.id}>
                    <td>{(currentPage - 1) * pageSize + index + 1}</td>
                    <td>
                      <Badge bg={isSales ? "info" : "secondary"}>{normalizedType}</Badge>
                    </td>
                    <td>{isSales ? r.salesOrderNo || r.referenceNo : r.requestNo || r.referenceNo}</td>
                    <td>{isSales ? r.customerName || "-" : r.projectName || "-"}</td>

                    {/* Nếu API trả dispatchDate, nên dùng r.dispatchDate thay cho r.slipDate */}
                    <td>{formatDate(r.dispatchDate ?? r.slipDate)}</td>

                    <td>{formatDate(r.createdAt)}</td>
                    <td>{formatDate(r.confirmedAt)}</td>

                    {/* Trạng thái giống ReceivingList */}
                    <td>
                      {isConfirmed ? (
                        <Badge bg="success">Đã xác nhận</Badge>
                      ) : (
                        <Badge bg="warning" text="dark">Nháp</Badge>
                      )}
                    </td>

                    <td>{r.note || "-"}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => navigate(`/warehouse-dashboard/dispatch-slips/${r.id}/items`)}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>

                      {!isConfirmed && (
                        <>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleConfirm(r.id)}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(r.id)}
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div className="wm-subtle-text">
            Trang {currentPage}/{totalPages} • {filteredRows.length} phiếu
          </div>
          <div className="d-flex align-items-center gap-2">
            <Button
              variant="outline-primary"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            >
              Trước
            </Button>
            <Button
              variant="outline-primary"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            >
              Sau
            </Button>
          </div>
        </div>
      )}
    </WarehouseLayout>
  );
};

export default DispatchList;

