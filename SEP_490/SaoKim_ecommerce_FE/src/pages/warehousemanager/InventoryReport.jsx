import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Breadcrumb,
  Badge,
  Form,
  InputGroup,
  Table,
  Spinner,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Dropdown from "react-bootstrap/Dropdown";
import {
  faHome,
  faSearch,
  faLayerGroup,
  faBoxesStacked,
  faBell,
  faChartBar,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { apiFetch } from "../../api/lib/apiClient";
import { ensureRealtimeStarted, getRealtimeConnection } from "../../signalr/realtimeHub";

const truncate = (value, maxLength = 40, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  const str = String(value);
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
};

const normalizeStatus = (s) => {
  const v = String(s || "").toLowerCase();
  return ["stock", "alert", "critical"].includes(v) ? v : null;
};

const calcStatus = ({ closingQty, onHand, minStock }) => {
  const q = Number(closingQty ?? onHand ?? 0);
  const m = Number(minStock ?? 0);

  if (m <= 0) return "stock";
  if (q <= 0) return "critical";
  if (q < m) return "alert";
  return "stock";
};

const statusLabel = (s) => {
  switch (s) {
    case "stock":
      return <Badge bg="success">Đủ hàng</Badge>;
    case "alert":
      return (
        <Badge bg="warning" text="dark">
          Cần theo dõi
        </Badge>
      );
    case "critical":
      return <Badge bg="danger">Thiếu hàng</Badge>;
    default:
      return <Badge bg="secondary">Không xác định</Badge>;
  }
};

export default function InventoryReport() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("detail");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page khi đổi bộ lọc / view
  useEffect(() => {
    setPage(1);
  }, [searchDebounced, statusFilter, fromDate, toDate, viewMode, pageSize]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        ...(searchDebounced ? { search: searchDebounced } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
        ...(fromDate ? { dateFrom: fromDate } : {}),
        ...(toDate ? { dateTo: toDate } : {}),
      });

      const res = await apiFetch(
        `/api/warehousemanager/inventory-report?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Lỗi HTTP ${res.status}`);

      const data = await res.json();

      const items = (data.items || []).map((x) => {
        const item = {
          productId: x.productId ?? x.id ?? x.ProductId ?? x.ProductID,
          productCode: x.productCode ?? x.ProductCode ?? "-",
          productName: x.productName ?? x.ProductName ?? "",
          categoryName: x.categoryName ?? x.CategoryName ?? "",
          onHand: x.onHand ?? x.OnHand ?? x.quantity ?? x.Quantity ?? 0,
          uomName: x.uomName ?? x.UomName ?? x.Uom ?? x.Unit ?? "",
          minStock: x.minStock ?? x.MinStock ?? 0,

          openingQty: x.openingQty ?? x.OpeningQty ?? 0,
          inboundQty: x.inboundQty ?? x.InboundQty ?? 0,
          outboundQty: x.outboundQty ?? x.OutboundQty ?? 0,
          closingQty: x.closingQty ?? x.ClosingQty ?? x.onHand ?? x.OnHand ?? 0,

          note: x.note ?? x.Note ?? "",
          status: normalizeStatus(x.status ?? x.Status),
        };

        item.gap =
          Number(item.closingQty ?? item.onHand ?? 0) - Number(item.openingQty ?? 0);

        item.effectiveStatus = item.status ?? calcStatus(item);

        return item;
      });

      setRows(items);
      setTotal(data.totalItems ?? data.total ?? items.length);
    } catch (err) {
      console.error("Lỗi tải báo cáo tồn kho:", err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchDebounced, statusFilter, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime
  useEffect(() => {
    let disposed = false;
    const tokenProvider = () => localStorage.getItem("token") || "";

    ensureRealtimeStarted(tokenProvider)
      .then(() => {
        if (disposed) return;

        const conn = getRealtimeConnection(tokenProvider);

        conn.off("evt");
        conn.on("evt", (payload) => {
          const type = payload?.type;
          if (!type) return;

          if (type.startsWith("inventory.") || type.startsWith("stock.")) {
            loadData();
          }
        });
      })
      .catch((err) => {
        console.error("Lỗi kết nối realtime (InventoryReport):", err);
      });

    return () => {
      disposed = true;
      const conn = getRealtimeConnection(tokenProvider);
      conn.off("evt");
    };
  }, [loadData]);

  const summary = useMemo(() => {
    const totalSku = total;

    let safe = 0;
    let alert = 0;
    let critical = 0;

    rows.forEach((r) => {
      const st = r.effectiveStatus;
      if (st === "stock") safe++;
      else if (st === "alert") alert++;
      else if (st === "critical") critical++;
    });

    const totalWithStatus = safe + alert + critical || 1;
    const safePercent = (safe / totalWithStatus) * 100;
    const alertPercent = (alert / totalWithStatus) * 100;
    const criticalPercent = (critical / totalWithStatus) * 100;

    const totalStock = rows.reduce(
      (acc, x) => acc + Number(x.closingQty ?? x.onHand ?? 0),
      0
    );

    return {
      totalSku,
      safe,
      alert,
      critical,
      safePercent,
      alertPercent,
      criticalPercent,
      totalStock,
    };
  }, [rows, total]);

  const groupedByStatus = useMemo(() => {
    const groups = {
      stock: { status: "stock", skuCount: 0, totalStock: 0 },
      alert: { status: "alert", skuCount: 0, totalStock: 0 },
      critical: { status: "critical", skuCount: 0, totalStock: 0 },
    };

    rows.forEach((r) => {
      const st = r.effectiveStatus;
      if (!groups[st]) return;
      groups[st].skuCount += 1;
      groups[st].totalStock += Number(r.closingQty ?? r.onHand ?? 0);
    });

    return Object.values(groups);
  }, [rows]);

  const topOverstock = useMemo(() => {
    return [...rows]
      .filter((r) => Number(r.gap || 0) > 0)
      .sort((a, b) => Number(b.gap || 0) - Number(a.gap || 0))
      .slice(0, 5);
  }, [rows]);

  const topCritical = useMemo(() => {
    return [...rows]
      .filter((r) => r.effectiveStatus === "critical")
      .sort((a, b) => Number(a.gap || 0) - Number(b.gap || 0))
      .slice(0, 5);
  }, [rows]);

  const statusFilterLabel =
    {
      all: "Tất cả trạng thái",
      stock: "Đủ hàng",
      alert: "Cần theo dõi",
      critical: "Thiếu hàng",
    }[statusFilter] || "Tất cả trạng thái";

  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 10)));

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
              <Breadcrumb.Item active>Báo cáo tồn kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Báo cáo tồn kho</h1>
          <p className="wm-page-subtitle">
            Ảnh tổng thể về tồn kho theo sản phẩm và theo trạng thái cảnh báo,
            hỗ trợ lập kế hoạch nhập hàng và kiểm soát rủi ro thiếu hàng.
          </p>
        </div>

        <div className="wm-page-actions">
          <div className="d-flex gap-2">
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "detail" ? "active" : ""}`}
              onClick={() => setViewMode("detail")}
            >
              Chi tiết theo sản phẩm
            </button>
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "overview" ? "active" : ""}`}
              onClick={() => setViewMode("overview")}
            >
              Tổng quan & top sản phẩm
            </button>
          </div>
        </div>
      </div>

      <div className="wm-stat-grid">
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faBoxesStacked} />
          </div>
          <span className="wm-stat-card__label">Số SKU trong báo cáo</span>
          <span className="wm-stat-card__value">{summary.totalSku || 0}</span>
          <span className="wm-stat-card__meta">Theo bộ lọc đang áp dụng (server)</span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </div>
          <span className="wm-stat-card__label">Tổng tồn hiện tại</span>
          <span className="wm-stat-card__value">{summary.totalStock}</span>
          <span className="wm-stat-card__meta">Đơn vị lưu kho</span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <span className="wm-stat-card__label">SKU trong vùng cảnh báo</span>
          <span className="wm-stat-card__value">{summary.alert + summary.critical}</span>
          <span className="wm-stat-card__meta">Bao gồm Cần theo dõi và Thiếu hàng</span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faChartBar} />
          </div>
          <span className="wm-stat-card__label">SKU thiếu hàng</span>
          <span className="wm-stat-card__value">{summary.critical}</span>
          <span className="wm-stat-card__meta">Cần ưu tiên nhập bổ sung</span>
        </div>
      </div>

      <div className="wm-surface mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold">Phân bố trạng thái tồn kho</span>
          <div className="d-flex gap-3 small text-muted">
            <span>
              <Badge bg="success" className="me-1" /> Đủ hàng:{" "}
              <span className="text-success fw-semibold">
                {Number.isFinite(summary.safePercent) ? summary.safePercent.toFixed(1) : "0.0"}%
              </span>
            </span>
            <span>
              <Badge bg="warning" text="dark" className="me-1" /> Cần theo dõi:{" "}
              <span className="text-warning fw-semibold">
                {Number.isFinite(summary.alertPercent) ? summary.alertPercent.toFixed(1) : "0.0"}%
              </span>
            </span>
            <span>
              <Badge bg="danger" className="me-1" /> Thiếu hàng:{" "}
              <span className="text-danger fw-semibold">
                {Number.isFinite(summary.criticalPercent) ? summary.criticalPercent.toFixed(1) : "0.0"}%
              </span>
            </span>
          </div>
        </div>

        <div className="wm-stock-distribution-bar">
          <div
            className="wm-stock-distribution-bar__segment wm-stock-distribution-bar__segment--safe"
            style={{ width: `${summary.safePercent || 0}%` }}
          />
          <div
            className="wm-stock-distribution-bar__segment wm-stock-distribution-bar__segment--alert"
            style={{ width: `${summary.alertPercent || 0}%` }}
          />
          <div
            className="wm-stock-distribution-bar__segment wm-stock-distribution-bar__segment--critical"
            style={{ width: `${summary.criticalPercent || 0}%` }}
          />
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
              placeholder="Tìm theo mã hoặc tên sản phẩm..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </InputGroup>
        </div>

        <div className="wm-toolbar__actions">
          <div className="d-flex align-items-center gap-2 me-2">
            <Form.Control
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <span className="text-muted small">đến</span>
            <Form.Control
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <Dropdown>
            <Dropdown.Toggle variant="link" className="wm-btn wm-btn--light">
              {statusFilterLabel}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              {["all", "stock", "alert", "critical"].map((st) => (
                <Dropdown.Item
                  key={st}
                  active={statusFilter === st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                >
                  {{
                    all: "Tất cả trạng thái",
                    stock: "Đủ hàng",
                    alert: "Cần theo dõi",
                    critical: "Thiếu hàng",
                  }[st]}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>

          {viewMode === "detail" && (
            <Form.Select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value) || 10);
                setPage(1);
              }}
              style={{ width: 140 }}
              className="ms-2"
              title="Số dòng mỗi trang"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/trang
                </option>
              ))}
            </Form.Select>
          )}
        </div>
      </div>

      {viewMode === "overview" ? (
        <div className="d-grid gap-3" style={{ gridTemplateColumns: "2fr 3fr" }}>
          <div className="wm-surface wm-table wm-scroll">
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Số SKU</th>
                  <th>Tổng tồn cuối kỳ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="wm-empty">
                      <Spinner animation="border" size="sm" /> Đang tải...
                    </td>
                  </tr>
                ) : (
                  groupedByStatus.map((g) => (
                    <tr key={g.status}>
                      <td>{statusLabel(g.status)}</td>
                      <td>{g.skuCount}</td>
                      <td>{g.totalStock}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="d-flex flex-column gap-3">
            <div className="wm-surface">
              <h6 className="mb-3">Top sản phẩm dư tồn</h6>
              {loading ? (
                <div className="wm-empty">
                  <Spinner animation="border" size="sm" /> Đang tải...
                </div>
              ) : topOverstock.length === 0 ? (
                <div className="wm-empty">Không có sản phẩm dư tồn.</div>
              ) : (
                <Table size="sm" responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sản phẩm</th>
                      <th>Tồn cuối kỳ</th>
                      <th>Định mức</th>
                      <th>Dư so với định mức</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topOverstock.map((r, idx) => (
                      <tr key={r.productId}>
                        <td>{idx + 1}</td>
                        <td>
                          <div className="fw-semibold" title={r.productCode || "-"}>
                            {truncate(r.productCode || "-", 20, "-")}
                          </div>
                          <div className="text-muted small" title={r.productName}>
                            {truncate(r.productName, 40, "")}
                          </div>
                        </td>
                        <td>
                          {r.closingQty ?? r.onHand} {r.uomName}
                        </td>
                        <td>{r.minStock}</td>
                        <td>+{r.gap}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            <div className="wm-surface">
              <h6 className="mb-3">Top sản phẩm thiếu hàng nặng</h6>
              {loading ? (
                <div className="wm-empty">
                  <Spinner animation="border" size="sm" /> Đang tải...
                </div>
              ) : topCritical.length === 0 ? (
                <div className="wm-empty">Không có sản phẩm thiếu hàng.</div>
              ) : (
                <Table size="sm" responsive className="mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Sản phẩm</th>
                      <th>Tồn cuối kỳ</th>
                      <th>Định mức</th>
                      <th>Thiếu so với định mức</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCritical.map((r, idx) => (
                      <tr key={r.productId} className="table-warning">
                        <td>{idx + 1}</td>
                        <td>
                          <div className="fw-semibold" title={r.productCode || "-"}>
                            {truncate(r.productCode || "-", 20, "-")}
                          </div>
                          <div className="text-muted small" title={r.productName}>
                            {truncate(r.productName, 40, "")}
                          </div>
                        </td>
                        <td>
                          {r.closingQty ?? r.onHand} {r.uomName}
                        </td>
                        <td>{r.minStock}</td>
                        <td>{r.gap}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="wm-surface wm-table wm-scroll">
            <Table responsive hover className="mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Mã sản phẩm</th>
                  <th>Tên sản phẩm</th>
                  <th>Tồn đầu kỳ</th>
                  <th>Nhập trong kỳ</th>
                  <th>Xuất trong kỳ</th>
                  <th>Tồn cuối kỳ</th>
                  <th>Chênh lệch</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="wm-empty">
                      <Spinner animation="border" size="sm" /> Đang tải...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="wm-empty">
                      Không có dữ liệu phù hợp.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const st = r.effectiveStatus;
                    const isCritical = st === "critical";

                    return (
                      <tr
                        key={r.productId ?? `${r.productCode}-${idx}`}
                        className={isCritical ? "table-warning" : ""}
                      >
                        <td>{(page - 1) * pageSize + idx + 1}</td>
                        <td className="fw-semibold" title={r.productCode || "-"}>
                          {truncate(r.productCode || "-", 20, "-")}
                        </td>
                        <td title={r.productName}>
                          {truncate(r.productName, 50, "")}
                        </td>
                        <td>{r.openingQty}</td>
                        <td>{r.inboundQty}</td>
                        <td>{r.outboundQty}</td>
                        <td>
                          {r.closingQty} {r.uomName}
                        </td>
                        <td className={r.gap < 0 ? "text-danger fw-semibold" : ""}>
                          {r.gap > 0 ? `+${r.gap}` : r.gap}
                        </td>
                        <td>{statusLabel(st)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
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
        </>
      )}
    </WarehouseLayout>
  );
}
