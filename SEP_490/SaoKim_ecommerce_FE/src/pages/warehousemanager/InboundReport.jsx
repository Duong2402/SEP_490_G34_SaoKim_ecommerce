import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faSearch } from "@fortawesome/free-solid-svg-icons";
import { Breadcrumb, Form, InputGroup, Badge } from "@themesberg/react-bootstrap";
import { Toast, ToastContainer } from "react-bootstrap";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";
import { ensureRealtimeStarted, getRealtimeConnection } from "../../signalr/realtimeHub";

export default function InboundReport() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [supplier, setSupplier] = useState("");
  const [project, setProject] = useState("");
  const [source, setSource] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [viewMode, setViewMode] = useState("slips");

  const [notify, setNotify] = useState(null);

  const truncate = (value, maxLength = 40, fallback = "-") => {
    if (value === null || value === undefined || value === "") return fallback;
    const str = String(value);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + "...";
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      if (supplier) params.append("supplier", supplier);
      if (project) params.append("project", project);
      if (source) params.append("source", source);
      if (fromDate) params.append("fromDate", fromDate);
      if (toDate) params.append("toDate", toDate);

      const res = await apiFetch(`/api/warehousemanager/inbound-report?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Không thể tải báo cáo nhập kho.");
      }

      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (error) {
      console.error("Lỗi khi tải báo cáo nhập kho:", error);
      setNotify(error.message || "Có lỗi khi tải báo cáo.");
    } finally {
      setLoading(false);
    }
  }, [supplier, project, source, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(null), 3500);
    return () => clearTimeout(t);
  }, [notify]);

  useEffect(() => {
    let disposed = false;

    const getAccessToken = async () => localStorage.getItem("token") || "";

    ensureRealtimeStarted(getAccessToken)
      .then(() => {
        if (disposed) return;

        const conn = getRealtimeConnection(getAccessToken);

        conn.off("evt");

        conn.on("evt", (payload) => {
          const type = payload?.type;
          if (!type) return;

          if (
            type.startsWith("receiving.") ||
            type.startsWith("inbound.") ||
            type === "receiving.created" ||
            type === "receiving.updated" ||
            type === "receiving.deleted"
          ) {
            loadData();
          }
        });
      })
      .catch((err) => {
        console.error("Lỗi kết nối realtime (InboundReport):", err);
        setNotify("Không thể kết nối realtime tới máy chủ.");
      });

    return () => {
      disposed = true;
      const conn = getRealtimeConnection(getAccessToken);
      conn.off("evt");
    };
  }, [loadData]);

  const searchedData = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) => (r.supplier || "").toLowerCase().includes(s));
  }, [rows, search]);

  const supplierSummary = useMemo(() => {
    const map = new Map();
    for (const r of searchedData) {
      const key = r.supplier || "Khác";
      if (!map.has(key)) {
        map.set(key, {
          supplier: key,
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
          firstReceiptDate: r.receiptDate,
          lastReceiptDate: r.receiptDate,
          slipsCount: 0,
        });
      }
      const entry = map.get(key);
      entry.totalItems += Number(r.totalItems || 0);
      entry.totalQuantity += Number(r.totalQuantity || 0);
      entry.totalValue += Number(r.totalValue || 0);
      entry.slipsCount += 1;

      const d = r.receiptDate ? new Date(r.receiptDate) : null;
      const first = entry.firstReceiptDate ? new Date(entry.firstReceiptDate) : null;
      const last = entry.lastReceiptDate ? new Date(entry.lastReceiptDate) : null;

      if (d) {
        if (!first || d < first) entry.firstReceiptDate = r.receiptDate;
        if (!last || d > last) entry.lastReceiptDate = r.receiptDate;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [searchedData]);

  const currentData = viewMode === "slips" ? searchedData : supplierSummary;

  const total = currentData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return currentData.slice(start, start + pageSize);
  }, [currentData, page, pageSize]);

  const summary = useMemo(() => {
    const base = viewMode === "slips" ? searchedData : supplierSummary;

    const totalQty = base.reduce((acc, r) => acc + Number(r.totalQuantity || 0), 0);
    const totalValue = base.reduce((acc, r) => acc + Number(r.totalValue || 0), 0);
    const totalSuppliers = new Set((viewMode === "slips" ? searchedData : supplierSummary).map((r) => r.supplier)).size;

    return { totalQty, totalValue, totalSuppliers };
  }, [searchedData, supplierSummary, viewMode]);

  const topSuppliers = useMemo(() => [...supplierSummary].slice(0, 5), [supplierSummary]);

  const formatDate = (v) => (v ? new Date(v).toLocaleDateString("vi-VN") : "-");

  const formatNumber = (v) =>
    typeof v === "number" ? v.toLocaleString("vi-VN") : Number(v || 0).toLocaleString("vi-VN");

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
              <Breadcrumb.Item href="/warehouse-dashboard/warehouse-report">Thống kê báo cáo</Breadcrumb.Item>
              <Breadcrumb.Item active>Báo cáo nhập kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Báo cáo nhập kho</h1>
          <p className="wm-page-subtitle">
            Tổng quan hàng đã tiếp nhận theo nhà cung cấp và ngày nhận, hỗ trợ đối soát và lập kế hoạch nhập hàng.
          </p>
        </div>

        <div className="wm-page-actions">
          <div className="btn-group me-3" role="group">
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "slips" ? "active" : ""}`}
              onClick={() => {
                setViewMode("slips");
                setPage(1);
              }}
            >
              Theo từng phiếu
            </button>
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "suppliers" ? "active" : ""}`}
              onClick={() => {
                setViewMode("suppliers");
                setPage(1);
              }}
            >
              Tổng hợp theo nhà cung cấp
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
            <span className="wm-summary__label">Nhà cung cấp tham gia</span>
            <span className="wm-summary__value">{summary.totalSuppliers}</span>
            <span className="wm-subtle-text">Đang có hàng trong báo cáo</span>
          </div>
          <div className="wm-summary__card">
            <span className="wm-summary__label">Tổng số lượng</span>
            <span className="wm-summary__value">{formatNumber(summary.totalQty)}</span>
            <span className="wm-subtle-text">Theo đơn vị nhập báo cáo</span>
          </div>
          <div className="wm-summary__card">
            <span className="wm-summary__label">Tổng giá trị</span>
            <span className="wm-summary__value">{formatNumber(summary.totalValue)}</span>
            <span className="wm-subtle-text">Tổng giá trị các phiếu</span>
          </div>
        </div>

        <div className="wm-surface" style={{ minWidth: 280 }}>
          <h6 className="mb-3">Top nhà cung cấp theo số lượng</h6>
          {topSuppliers.length === 0 && <div className="wm-empty">Chưa có dữ liệu.</div>}
          <ul className="list-unstyled mb-0">
            {topSuppliers.map((s, idx) => (
              <li
                key={s.supplier + idx}
                className="d-flex justify-content-between align-items-center mb-2"
              >
                <div>
                  <div className="fw-semibold" title={s.supplier}>
                    {truncate(s.supplier, 30, "Khác")}
                  </div>
                  <small className="text-muted">
                    {s.slipsCount} phiếu • {formatNumber(s.totalQuantity)} đơn vị
                  </small>
                </div>
                <Badge bg={idx === 0 ? "success" : "info"}>
                  {(((s.totalQuantity / (summary.totalQty || 1)) * 100) || 0).toFixed(1)}%
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
                placeholder="Tìm theo nhà cung cấp..."
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
            <Form.Control type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>

          <div>
            <label className="form-label mb-1">Đến ngày</label>
            <Form.Control type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>

          <div>
            <label className="form-label mb-1">Khoảng thời gian nhanh</label>
            <div className="btn-group d-flex">
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => applyRangePreset("7d")}>
                Tuần
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => applyRangePreset("30d")}>
                Tháng
              </button>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => applyRangePreset("year")}>
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
                <th>Nhà cung cấp</th>
                <th>Ngày tiếp nhận</th>
                <th>Số dòng hàng</th>
                <th>Tổng số lượng</th>
                <th>Tổng giá trị</th>
                <th>Ghi chú</th>
              </tr>
            ) : (
              <tr>
                <th>#</th>
                <th>Nhà cung cấp</th>
                <th>Số phiếu</th>
                <th>Số dòng hàng</th>
                <th>Tổng số lượng</th>
                <th>Tổng giá trị</th>
                <th>Khoảng thời gian nhập</th>
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
                    key={`${item.supplier}-${item.receiptDate}-${index}`}
                    className={heavy ? "table-warning" : ""}
                  >
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td className="fw-semibold" title={item.supplier}>
                      {truncate(item.supplier, 40, "Không rõ")}
                      {heavy && (
                        <Badge bg="danger" className="ms-2">
                          Lô lớn
                        </Badge>
                      )}
                    </td>
                    <td>{formatDate(item.receiptDate)}</td>
                    <td>
                      <Badge bg="info">{item.totalItems ?? 0} dòng</Badge>
                    </td>
                    <td>{formatNumber(item.totalQuantity)}</td>
                    <td>{formatNumber(item.totalValue)}</td>
                    <td className="text-muted" title={item.note || ""}>
                      {truncate(item.note, 60, "Không có ghi chú")}
                    </td>
                  </tr>
                );
              })
            ) : (
              pagedData.map((item, index) => (
                <tr
                  key={`${item.supplier}-${index}`}
                  className={isHeavyRecord(item) ? "table-warning" : ""}
                >
                  <td>{(page - 1) * pageSize + index + 1}</td>
                  <td className="fw-semibold" title={item.supplier}>
                    {truncate(item.supplier, 40, "Khác")}
                  </td>
                  <td>{item.slipsCount}</td>
                  <td>{item.totalItems}</td>
                  <td>{formatNumber(item.totalQuantity)}</td>
                  <td>{formatNumber(item.totalValue)}</td>
                  <td>
                    {formatDate(item.firstReceiptDate)} - {formatDate(item.lastReceiptDate)}
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
            .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
            .reduce((acc, p, idx, arr) => {
              if (idx && p - arr[idx - 1] > 1) acc.push("...");
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === "..." ? (
                <button key={`gap-${i}`} className="btn btn-outline-light" disabled>
                  ...
                </button>
              ) : (
                <button
                  key={p}
                  className={`btn ${p === page ? "btn-primary" : "btn-outline-secondary"}`}
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
          <Toast onClose={() => setNotify(null)} show={!!notify} delay={3500} autohide bg="warning">
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
