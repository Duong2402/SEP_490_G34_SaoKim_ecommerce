import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
} from "@fortawesome/free-solid-svg-icons";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Badge,
} from "@themesberg/react-bootstrap";
import { Toast, ToastContainer } from "react-bootstrap";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";
import * as signalR from "@microsoft/signalr";
import { getDispatchHubConnection } from "../../signalr/dispatchHub";

export default function OutboundReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [customer, setCustomer] = useState("");
  const [project, setProject] = useState("");
  const [destination, setDestination] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [viewMode, setViewMode] = useState("slips"); 

  const [notify, setNotify] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (customer) params.append("customer", customer);
      if (project) params.append("project", project);
      if (destination) params.append("destination", destination);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const res = await apiFetch(
        `/api/warehousemanager/outbound-report?${params.toString()}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể tải báo cáo xuất kho");
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (error) {
      console.error(error);
      setNotify(error.message || "Có lỗi khi tải báo cáo xuất kho.");
    } finally {
      setLoading(false);
    }
  }, [customer, project, destination, fromDate, toDate]);

  useEffect(() => {
    loadData();

    const connection = getDispatchHubConnection();

    connection.off("DispatchSlipsUpdated");

    connection.on("DispatchSlipsUpdated", (payload) => {
      console.log("DispatchSlipsUpdated (OutboundReport):", payload);
      loadData();
    });

    if (connection.state === signalR.HubConnectionState.Disconnected) {
      connection
        .start()
        .then(() => {
          console.log("SignalR connected (OutboundReport)");
        })
        .catch((err) => {
          console.error("SignalR connection error (OutboundReport):", err);
          setNotify("Không thể kết nối realtime tới máy chủ.");
        });
    }

    return () => {
      connection.off("DispatchSlipsUpdated");
    };
  }, [loadData]);

  useEffect(() => {
    if (notify) {
      const t = setTimeout(() => setNotify(null), 3500);
      return () => clearTimeout(t);
    }
  }, [notify]);

  const searchedData = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => (r.customer || "").toLowerCase().includes(s));
  }, [rows, search]);

  const customerSummary = useMemo(() => {
    const map = new Map();
    for (const r of searchedData) {
      const key = r.customer || "Khác";
      if (!map.has(key)) {
        map.set(key, {
          customer: key,
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
          firstIssueDate: r.issueDate,
          lastIssueDate: r.issueDate,
          slipsCount: 0,
        });
      }
      const entry = map.get(key);
      entry.totalItems += Number(r.totalItems || 0);
      entry.totalQuantity += Number(r.totalQuantity || 0);
      entry.totalValue += Number(r.totalValue || 0);
      entry.slipsCount += 1;

      const d = r.issueDate ? new Date(r.issueDate) : null;
      const first = entry.firstIssueDate
        ? new Date(entry.firstIssueDate)
        : null;
      const last = entry.lastIssueDate
        ? new Date(entry.lastIssueDate)
        : null;

      if (d) {
        if (!first || d < first) entry.firstIssueDate = r.issueDate;
        if (!last || d > last) entry.lastIssueDate = r.issueDate;
      }
    }

    return Array.from(map.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );
  }, [searchedData]);

  const currentData =
    viewMode === "slips" ? searchedData : customerSummary;

  const total = currentData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentData.slice(start, start + pageSize);
  }, [currentData, page, pageSize]);

  const summary = useMemo(() => {
    const base = viewMode === "slips" ? searchedData : customerSummary;

    const totalQty = base.reduce(
      (acc, r) => acc + Number(r.totalQuantity || 0),
      0
    );
    const totalValue = base.reduce(
      (acc, r) => acc + Number(r.totalValue || 0),
      0
    );
    const totalCustomers = new Set(
      (viewMode === "slips" ? searchedData : customerSummary).map(
        (r) => r.customer
      )
    ).size;

    return { totalQty, totalValue, totalCustomers };
  }, [searchedData, customerSummary, viewMode]);

  const topCustomers = useMemo(() => {
    return [...customerSummary].slice(0, 5);
  }, [customerSummary]);

  const formatDate = (v) =>
    v ? new Date(v).toLocaleDateString("vi-VN") : "-";

  const formatNumber = (v) =>
    typeof v === "number"
      ? v.toLocaleString("vi-VN")
      : Number(v || 0).toLocaleString("vi-VN");

  const applyRangePreset = (type) => {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);

    if (type === "7d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 7);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(to);
    } else if (type === "30d") {
      const from = new Date(today);
      from.setDate(from.getDate() - 30);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(to);
    } else if (type === "year") {
      const from = new Date(today.getFullYear(), 0, 1);
      setFromDate(from.toISOString().slice(0, 10));
      setToDate(to);
    }
  };

  const isHeavyRecord = (r) => {
    const qty = Number(r.totalQuantity || 0);
    const val = Number(r.totalValue || 0);
    return qty > 1000 || val > 100000000;
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
              <Breadcrumb.Item href="/warehouse-dashboard/warehouse-report">
                Thống kê báo cáo
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Báo cáo xuất kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Báo cáo xuất kho</h1>
          <p className="wm-page-subtitle">
            Theo dõi hàng đã xuất theo khách hàng và ngày xuất để kiểm soát tồn
            kho và hiệu suất giao hàng.
          </p>
        </div>

        <div className="wm-page-actions">
          <div className="btn-group me-3" role="group">
            <button
              type="button"
              className={`wm-btn wm-btn--light ${
                viewMode === "slips" ? "active" : ""
              }`}
              onClick={() => {
                setViewMode("slips");
                setPage(1);
              }}
            >
              Theo từng phiếu
            </button>
            <button
              type="button"
              className={`wm-btn wm-btn--light ${
                viewMode === "customers" ? "active" : ""
              }`}
              onClick={() => {
                setViewMode("customers");
                setPage(1);
              }}
            >
              Tổng hợp theo khách hàng
            </button>
          </div>
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3">
        <div className="wm-summary flex-grow-1">
          <div className="wm-summary__card">
            <span className="wm-summary__label">Tổng dòng dữ liệu</span>
            <span className="wm-summary__value">{currentData.length}</span>
            <span className="wm-subtle-text">Theo bộ lọc hiện tại</span>
          </div>
          <div className="wm-summary__card">
            <span className="wm-summary__label">Khách hàng có xuất kho</span>
            <span className="wm-summary__value">
              {summary.totalCustomers}
            </span>
            <span className="wm-subtle-text">
              Đang có đơn xuất trong báo cáo
            </span>
          </div>
          <div className="wm-summary__card">
            <span className="wm-summary__label">Tổng số lượng xuất</span>
            <span className="wm-summary__value">
              {formatNumber(summary.totalQty)}
            </span>
            <span className="wm-subtle-text">
              Tổng theo đơn vị xuất kho
            </span>
          </div>
          <div className="wm-summary__card">
            <span className="wm-summary__label">Tổng giá trị hàng xuất</span>
            <span className="wm-summary__value">
              {formatNumber(summary.totalValue)}
            </span>
            <span className="wm-subtle-text">
              Tính theo các phiếu đã xuất
            </span>
          </div>
        </div>

        <div className="wm-surface" style={{ minWidth: 280 }}>
          <h6 className="mb-3">Top khách hàng theo số lượng xuất</h6>
          {topCustomers.length === 0 && (
            <div className="wm-empty">Chưa có dữ liệu.</div>
          )}
          <ul className="list-unstyled mb-0">
            {topCustomers.map((c, idx) => (
              <li
                key={c.customer + idx}
                className="d-flex justify-content-between align-items-center mb-2"
              >
                <div>
                  <div className="fw-semibold">{c.customer}</div>
                  <small className="text-muted">
                    {c.slipsCount} phiếu • {formatNumber(c.totalQuantity)} đơn vị
                  </small>
                </div>
                <Badge bg={idx === 0 ? "success" : "info"}>
                  {((c.totalQuantity /
                    (summary.totalQty || 1)) *
                    100).toFixed(1)}
                  %
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="wm-surface wm-toolbar mt-3">
        <div className="d-flex flex-wrap gap-3 w-100 align-items-end">
          <div className="flex-grow-1">
            <label className="form-label mb-1">Tìm nhanh</label>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tìm theo khách hàng..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </div>

          <div>
            <label className="form-label mb-1">Từ ngày</label>
            <Form.Control
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label mb-1">Đến ngày</label>
            <Form.Control
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <div>
            <label className="form-label mb-1">Khoảng thời gian nhanh</label>
            <div className="btn-group d-flex">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => applyRangePreset("7d")}
              >
                Tuần
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => applyRangePreset("30d")}
              >
                Tháng
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={() => applyRangePreset("year")}
              >
                Năm
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <table className="table align-middle mb-0">
          <thead>
            {viewMode === "slips" ? (
              <tr>
                <th>#</th>
                <th>Khách hàng</th>
                <th>Ngày xuất</th>
                <th>Số dòng hàng</th>
                <th>Tổng số lượng</th>
                <th>Tổng giá trị</th>
                <th>Ghi chú</th>
              </tr>
            ) : (
              <tr>
                <th>#</th>
                <th>Khách hàng</th>
                <th>Số phiếu</th>
                <th>Số dòng hàng</th>
                <th>Tổng số lượng</th>
                <th>Tổng giá trị</th>
                <th>Khoảng thời gian xuất</th>
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td colSpan={7} className="wm-empty">
                  Không có dữ liệu phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            ) : viewMode === "slips" ? (
              pagedData.map((item, index) => {
                const heavy = isHeavyRecord(item);
                return (
                  <tr
                    key={`${item.customer}-${item.issueDate}-${index}`}
                    className={heavy ? "table-warning" : ""}
                  >
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td className="fw-semibold">
                      {item.customer}
                      {heavy && (
                        <Badge bg="danger" className="ms-2">
                          Lô lớn
                        </Badge>
                      )}
                    </td>
                    <td>{formatDate(item.issueDate)}</td>
                    <td>
                      <Badge bg="info">
                        {item.totalItems ?? 0} dòng
                      </Badge>
                    </td>
                    <td>{formatNumber(item.totalQuantity)}</td>
                    <td>{formatNumber(item.totalValue)}</td>
                    <td className="text-muted">
                      {item.note || "Không có ghi chú"}
                    </td>
                  </tr>
                );
              })
            ) : (
              pagedData.map((item, index) => (
                <tr
                  key={`${item.customer}-${index}`}
                  className={isHeavyRecord(item) ? "table-warning" : ""}
                >
                  <td>{(page - 1) * pageSize + index + 1}</td>
                  <td className="fw-semibold">{item.customer}</td>
                  <td>{item.slipsCount}</td>
                  <td>{item.totalItems}</td>
                  <td>{formatNumber(item.totalQuantity)}</td>
                  <td>{formatNumber(item.totalValue)}</td>
                  <td>
                    {formatDate(item.firstIssueDate)} -{" "}
                    {formatDate(item.lastIssueDate)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          Tổng: {total} dòng • Trang {page}/{totalPages}
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
            .filter(
              (p) =>
                Math.abs(p - page) <= 2 || p === 1 || p === totalPages
            )
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
                  className={`btn ${
                    p === page ? "btn-primary" : "btn-outline-secondary"
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

      {notify && (
        <ToastContainer
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 9999,
          }}
        >
          <Toast
            onClose={() => setNotify(null)}
            show={!!notify}
            delay={3500}
            autohide
            bg="warning"
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Thông báo</strong>
            </Toast.Header>
            <Toast.Body>{notify}</Toast.Body>
          </Toast>
        </ToastContainer>
      )}
    </WarehouseLayout>
  );
}
