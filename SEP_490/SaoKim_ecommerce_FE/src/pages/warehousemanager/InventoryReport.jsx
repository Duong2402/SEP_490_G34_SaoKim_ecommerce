import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import {
  Breadcrumb,
  Badge,
  Form,
  InputGroup,
  Table,
  Spinner,
  ProgressBar,
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
import * as signalR from "@microsoft/signalr";
import { getInventoryHubConnection } from "../../signalr/inventoryHub";

const MAX_PAGE_SIZE = 1000;

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

const getStatus = (item) => {
  const q = Number(item.closingQty ?? item.onHand ?? 0);
  const m = Number(item.minStock || 0);
  if (m <= 0) return "stock";
  if (q <= 0) return "critical";
  if (q < m) return "alert";
  return "stock";
};

export default function InventoryReport() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState("detail");
  const STATUS_OPTIONS = [
    { value: "all", label: "Tất cả trạng thái" },
    { value: "stock", label: "Đủ hàng" },
    { value: "alert", label: "Cần theo dõi" },
    { value: "critical", label: "Thiếu hàng" },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: "1",
        pageSize: String(MAX_PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });

      const res = await apiFetch(
        `/api/warehousemanager/inventory-report?${params.toString()}`
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      const items = (data.items || []).map((x) => {
        const item = {
          productId: x.productId ?? x.id ?? x.ProductId ?? x.ProductID,
          productCode: x.productCode ?? x.ProductCode ?? "-",
          productName: x.productName ?? x.ProductName ?? "",
          categoryName: x.categoryName ?? x.CategoryName ?? "",
          onHand: x.onHand ?? x.quantity ?? x.QtyOnHand ?? x.Quantity ?? 0,
          uomName: x.uomName ?? x.Uom ?? x.Unit ?? "",
          minStock: x.minStock ?? x.MinStock ?? 0,
          status: x.status ?? x.Status ?? null,
          note: x.note ?? x.Note ?? "",
          openingQty: x.openingQty ?? 0,
          inboundQty: x.inboundQty ?? 0,
          outboundQty: x.outboundQty ?? 0,
          closingQty: x.closingQty ?? x.onHand ?? 0,
        };
        item.effectiveStatus = item.status ?? getStatus(item);
        item.gap =
          Number(item.closingQty ?? item.onHand ?? 0) -
          Number(item.minStock || 0);
        return item;
      });

      setRows(items);
      setTotal(data.total ?? items.length);
    } catch (err) {
      console.error("Load inventory report error:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const connection = getInventoryHubConnection();

    connection.off("InventoryUpdated");

    connection.on("InventoryUpdated", (payload) => {
      console.log("InventoryUpdated (InventoryReport):", payload);
      loadData();
    });

    if (connection.state === signalR.HubConnectionState.Disconnected) {
      connection
        .start()
        .then(() => {
          console.log("SignalR connected in InventoryReport");
        })
        .catch((err) => {
          console.error("Inventory SignalR connection error:", err);
        });
    }

    return () => {
      connection.off("InventoryUpdated");
    };
  }, [loadData]);

  const summary = useMemo(() => {
    const totalSku = total;
    let safe = 0;
    let alert = 0;
    let critical = 0;

    rows.forEach((r) => {
      const st = r.effectiveStatus ?? getStatus(r);
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
      const st = r.effectiveStatus ?? getStatus(r);
      if (!groups[st]) return;
      groups[st].skuCount += 1;
      groups[st].totalStock += Number(r.closingQty ?? r.onHand ?? 0);
    });

    return Object.values(groups);
  }, [rows]);

  const topOverstock = useMemo(() => {
    return [...rows]
      .filter((r) => r.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 5);
  }, [rows]);

  const topCritical = useMemo(() => {
    return [...rows]
      .filter((r) => (r.effectiveStatus ?? getStatus(r)) === "critical")
      .sort((a, b) => a.gap - b.gap)
      .slice(0, 5);
  }, [rows]);

  const statusFilterLabel =
    {
      all: "Tất cả trạng thái",
      stock: "Đủ hàng",
      alert: "Cần theo dõi",
      critical: "Thiếu hàng",
    }[statusFilter] || "Tất cả trạng thái";

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
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "detail" ? "active" : ""
                }`}
              onClick={() => setViewMode("detail")}
            >
              Chi tiết theo sản phẩm
            </button>
            <button
              type="button"
              className={`wm-btn wm-btn--light ${viewMode === "overview" ? "active" : ""
                }`}
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
          <span className="wm-stat-card__value">
            {summary.totalSku || 0}
          </span>
          <span className="wm-stat-card__meta">
            Theo bộ lọc đang áp dụng (server)
          </span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faLayerGroup} />
          </div>
          <span className="wm-stat-card__label">Tổng tồn hiện tại</span>
          <span className="wm-stat-card__value">
            {summary.totalStock}
          </span>
          <span className="wm-stat-card__meta">Đơn vị lưu kho</span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faBell} />
          </div>
          <span className="wm-stat-card__label">
            SKU trong vùng cảnh báo
          </span>
          <span className="wm-stat-card__value">
            {summary.alert + summary.critical}
          </span>
          <span className="wm-stat-card__meta">
            Bao gồm Cần theo dõi và Thiếu hàng
          </span>
        </div>

        <div className="wm-stat-card">
          <div className="wm-stat-card__icon">
            <FontAwesomeIcon icon={faChartBar} />
          </div>
          <span className="wm-stat-card__label">SKU thiếu hàng</span>
          <span className="wm-stat-card__value">
            {summary.critical}
          </span>
          <span className="wm-stat-card__meta">
            Cần ưu tiên nhập bổ sung
          </span>
        </div>
      </div>

      <div className="wm-surface mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="fw-semibold">Phân bố trạng thái tồn kho</span>
          <div className="d-flex gap-3 small text-muted">
            <span>
              <Badge bg="success" className="me-1" /> Đủ hàng:{" "}
              {summary.safePercent.toFixed(1)}%
            </span>
            <span>
              <Badge bg="warning" text="dark" className="me-1" /> Cần theo dõi:{" "}
              {summary.alertPercent.toFixed(1)}%
            </span>
            <span>
              <Badge bg="danger" className="me-1" /> Thiếu hàng:{" "}
              {summary.criticalPercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <ProgressBar>
          <ProgressBar
            now={summary.safePercent}
            variant="success"
            key="safe"
          />
          <ProgressBar
            now={summary.alertPercent}
            variant="warning"
            key="alert"
          />
          <ProgressBar
            now={summary.criticalPercent}
            variant="danger"
            key="critical"
          />
        </ProgressBar>
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
              }}
            />
          </InputGroup>
        </div>

        <div className="wm-toolbar__actions">
          <Dropdown>
            <Dropdown.Toggle
              variant="link"
              className="wm-btn wm-btn--light"
            >
              {statusFilterLabel}
            </Dropdown.Toggle>
            <Dropdown.Menu align="end">
              {["all", "stock", "alert", "critical"].map((st) => (
                <Dropdown.Item
                  key={st}
                  active={statusFilter === st}
                  onClick={() => {
                    setStatusFilter(st);
                  }}
                >
                  {
                    {
                      all: "Tất cả trạng thái",
                      stock: "Đủ hàng",
                      alert: "Cần theo dõi",
                      critical: "Thiếu hàng",
                    }[st]
                  }
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown>
        </div>
      </div>

      {viewMode === "overview" ? (
        <div
          className="d-grid gap-3"
          style={{ gridTemplateColumns: "2fr 3fr" }}
        >
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
                {groupedByStatus.map((g) => (
                  <tr key={g.status}>
                    <td>{statusLabel(g.status)}</td>
                    <td>{g.skuCount}</td>
                    <td>{g.totalStock}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>

          <div className="d-flex flex-column gap-3">
            <div className="wm-surface">
              <h6 className="mb-3">Top sản phẩm dư tồn</h6>
              {topOverstock.length === 0 ? (
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
                          <div className="fw-semibold">
                            {r.productCode || "-"}
                          </div>
                          <div className="text-muted small">
                            {r.productName}
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
              {topCritical.length === 0 ? (
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
                          <div className="fw-semibold">
                            {r.productCode || "-"}
                          </div>
                          <div className="text-muted small">
                            {r.productName}
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
                <th>Định mức tối thiểu</th>
                <th>Chênh lệch</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="wm-empty">
                    <Spinner animation="border" size="sm" /> Đang tải...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="wm-empty">
                    Không có dữ liệu phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((r, idx) => {
                  const st = r.effectiveStatus ?? getStatus(r);
                  const isCritical = st === "critical";
                  return (
                    <tr
                      key={r.productId}
                      className={isCritical ? "table-warning" : ""}
                    >
                      <td>{idx + 1}</td>
                      <td className="fw-semibold">
                        {r.productCode || "-"}
                      </td>
                      <td>{r.productName}</td>

                      <td>{r.openingQty}</td>

                      <td>{r.inboundQty}</td>

                      <td>{r.outboundQty}</td>

                      <td>
                        {r.closingQty} {r.uomName}
                      </td>

                      <td>{r.minStock}</td>

                      <td
                        className={
                          r.gap < 0 ? "text-danger fw-semibold" : ""
                        }
                      >
                        {r.gap > 0 ? `+${r.gap}` : r.gap}
                      </td>

                      <td>{statusLabel(st)}</td>
                      <td>{r.note || ""}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </div>
      )}
    </WarehouseLayout>
  );
}
