import React, { useEffect, useState, useCallback } from "react";
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
import { getDispatchHubConnection } from "../../signalr/dispatchHub";
import * as signalR from "@microsoft/signalr";

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

const normType = (type, row) => {
  if (type === 1 || type === "1") return "Sales";
  if (type === 2 || type === "2") return "Project";
  if (typeof type === "string") return type;
  return row?.customerId || row?.salesOrderNo ? "Sales" : "Project";
};

const getSlipId = (row) =>
  row?.id ??
  row?.dispatchSlipId ??
  row?.dispatchSlipID ??
  row?.dispatchId ??
  row?.slipId ??
  row?.slipID;

const DispatchList = () => {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");

  const [pageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [sortBy, setSortBy] = useState("dispatchDate");
  const [sortOrder, setSortOrder] = useState("desc");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString("vi-VN") : "-";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("pageSize", pageSize);

      if (typeFilter !== "All") {
        params.append("type", typeFilter);
      }
      if (search) {
        params.append("search", search);
      }
      if (sortBy) {
        params.append("sortBy", sortBy);
      }
      if (sortOrder) {
        params.append("sortOrder", sortOrder);
      }

      const res = await apiFetch(
        `/api/warehousemanager/dispatch-slips?${params.toString()}`
      );
      const data = await res.json();

      setRows(data.items || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error("Error loading dispatch slips:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, typeFilter, search, sortBy, sortOrder]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const connection = getDispatchHubConnection();

    connection.off("DispatchSlipsUpdated");

    connection.on("DispatchSlipsUpdated", (payload) => {
      console.log("DispatchSlipsUpdated:", payload);

      const { action } = payload || {};
      if (!action) return;
      switch (action) {
        case "created":
        case "deleted":
        case "confirmed":
        case "updated":
        case "imported":
          loadData();
          break;
        default:
          break;
      }
    });

    if (connection.state === signalR.HubConnectionState.Disconnected) {
      connection
        .start()
        .then(() => console.log("SignalR connected in DispatchList"))
        .catch((err) => console.error("SignalR connection error:", err));
    }

    return () => {
      connection.off("DispatchSlipsUpdated");
    };
  }, [loadData]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const handleConfirm = async (id) => {
    const slipId = id ?? null;
    if (!slipId) {
      alert("Không tìm thấy ID phiếu để xác nhận.");
      return;
    }
    const targetId = Number.isFinite(Number(slipId)) ? Number(slipId) : slipId;
    if (!window.confirm("Xác nhận phiếu xuất kho này?")) return;
    try {
      await apiFetch(`/api/warehousemanager/dispatch-slips/${targetId}/confirm`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      await loadData();
      alert("Đã xác nhận phiếu.");
    } catch (error) {
      console.error("Confirm failed:", error);
      alert(error.message || "Không thể xác nhận phiếu.");
    }
  };

  const handleDelete = async (id) => {
    if (!id) {
      alert("Không tìm thấy ID phiếu để xóa.");
      return;
    }
    const targetId = Number.isFinite(Number(id)) ? Number(id) : id;
    if (!window.confirm("Bạn có chắc muốn xóa phiếu xuất kho này?")) return;
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-slips/${targetId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Không thể xóa phiếu.");
    }
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
            onClick={() =>
              navigate("/warehouse-dashboard/dispatch-slips/create")
            }
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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
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
                  onClick={() => {
                    setTypeFilter(type);
                    setPage(1);
                  }}
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
              <th role="button" onClick={() => handleSort("type")}>Loại phiếu</th>
              <th role="button" onClick={() => handleSort("referenceNo")}>Mã</th>
              <th>Khách Hàng</th>
              <th role="button" onClick={() => handleSort("dispatchDate")}>Ngày xuất</th>
              <th role="button" onClick={() => handleSort("createdAt")}>Ngày tạo</th>
              <th role="button" onClick={() => handleSort("confirmedAt")}>Ngày xác nhận</th>
              <th role="button" onClick={() => handleSort("status")}>Trạng thái</th>
              <th>Ghi chú</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="wm-empty">
                  Không có phiếu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              rows.map((r, index) => {
                const normalizedType = normType(r.type, r);
                const isSales = normalizedType === "Sales";
                const code = toStatusCode(r.status);
                const isConfirmed = code === 1;
                const slipId = getSlipId(r);

                return (
                  <tr key={r.id}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>
                      <Badge bg={isSales ? "info" : "secondary"}>
                        {normalizedType}
                      </Badge>
                    </td>
                    <td>
                      {isSales
                        ? r.salesOrderNo || r.referenceNo
                        : r.requestNo || r.referenceNo}
                    </td>
                    <td>
                      {isSales
                        ? r.customerName || "-"
                        : r.projectName || "-"}
                    </td>

                    <td>{formatDate(r.dispatchDate ?? r.slipDate)}</td>

                    <td>{formatDate(r.createdAt)}</td>
                    <td>{formatDate(r.confirmedAt)}</td>

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
                        onClick={() =>
                          navigate(
                            `/warehouse-dashboard/dispatch-slips/${slipId}/items`
                          )
                        }
                        disabled={!slipId}
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>

                      {!isConfirmed && (
                        <>
                          <Button
                            variant="outline-success"
                            size="sm"
                            className="me-2"
                            onClick={() => handleConfirm(slipId)}
                            disabled={!slipId}
                          >
                            <FontAwesomeIcon icon={faCheck} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(slipId)}
                            disabled={!slipId}
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

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div className="wm-subtle-text">
          Trang {page}/{totalPages} • {total} phiếu
        </div>

        <div className="btn-group">
          <button
            className="btn btn-outline-secondary"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce((acc, p, idx, arr) => {
              if (idx && p - arr[idx - 1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <button
                  key={`gap-${i}`}
                  className="btn btn-outline-light"
                  disabled
                >
                  ...
                </button>
              ) : (
                <button
                  key={p}
                  className={`btn ${p === page ? "btn-primary" : "btn-outline-secondary"
                    }`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p}
                </button>
              )
            )}

          <button
            className="btn btn-outline-secondary"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Sau
          </button>
        </div>
      </div>
    </WarehouseLayout>
  );
};

export default DispatchList;

