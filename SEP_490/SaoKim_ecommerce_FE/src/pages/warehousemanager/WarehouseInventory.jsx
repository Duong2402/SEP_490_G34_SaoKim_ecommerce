import React, { useEffect, useMemo, useState } from "react";
import { Breadcrumb, Badge, Form, InputGroup, Button, Table, Spinner } from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faSearch,
  faSliders,
  faLayerGroup,
  faBell,
  faBoxesStacked,
  faArrowLeft,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import Dropdown from "react-bootstrap/Dropdown";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import { useNavigate } from "react-router-dom";
import { Modal } from "react-bootstrap";
import { apiFetch } from "../../api/lib/apiClient";
import { getInventoryHubConnection } from "../../signalr/inventoryHub";
import * as signalR from "@microsoft/signalr";
import "../../assets/css/Warehouse.css";
const PAGE_SIZE = 10;

const statusLabel = (s) => {
  switch (s) {
    case "stock": return <Badge bg="success">Đủ hàng</Badge>;
    case "alert": return <Badge bg="warning" text="dark">Cần theo dõi</Badge>;
    case "critical": return <Badge bg="danger">Thiếu hàng</Badge>;
    default: return <Badge bg="secondary">Không xác định</Badge>;
  }
};

export default function WarehouseInventory() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showMinModal, setShowMinModal] = useState(false);
  const [bulkMin, setBulkMin] = useState("");
  const [applyingBulk, setApplyingBulk] = useState(false);

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const statusFilterLabel =
    {
      all: "Tất cả trạng thái",
      stock: "Đủ hàng",
      alert: "Cần theo dõi",
      critical: "Thiếu hàng",
    }[statusFilter] || "Tất cả trạng thái";

  const locations = useMemo(() => {
    const set = new Set(rows.map(r => r.locationName).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [rows]);

  const getStatus = (item) => {
    const q = Number(item.onHand || 0);
    const m = Number(item.minStock || 0);
    if (m <= 0) return "stock";
    if (q <= 0) return "critical";
    if (q < m) return "alert";
    return "stock";
  };

  const summary = useMemo(() => {
    const totalSku = total;
    const totalStock = rows.reduce((acc, x) => acc + Number(x.onHand || 0), 0);
    const lowStock = rows.filter(x => Number(x.onHand || 0) < Number(x.minStock || 0)).length;
    const critical = rows.filter(x => (x.status ?? getStatus(x)) === "critical").length;
    return { totalSku, totalStock, lowStock, critical };
  }, [rows, total]);

  const applyBulkMinStock = async () => {
    const val = Number(bulkMin);
    if (isNaN(val) || val < 0) return;

    setApplyingBulk(true);
    try {
      await Promise.all(
        rows.map(r =>
          apiFetch(`/api/warehousemanager/inventory/${r.productId}/min-stock`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ minStock: val }),
          })
        )
      );
      setRows(prev => prev.map(r => ({ ...r, minStock: val })));
      setShowMinModal(false);
      setBulkMin("");
    } catch (e) {
      alert("Áp dụng định mức thất bại");
    } finally {
      setApplyingBulk(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(PAGE_SIZE),
        ...(search ? { search } : {}),
        ...(locationFilter !== "all" ? { location: locationFilter } : {}),
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });

      const res = await apiFetch(`/api/warehousemanager/inventory?` + params.toString());
      if (!res.ok) throw new Error(`Lỗi tải tồn kho (HTTP ${res.status})`);

      const data = await res.json();
      const items = (data.items || []).map(x => ({
        productId: x.productId ?? x.id ?? x.ProductId ?? x.ProductID,
        productCode: x.productCode ?? x.ProductCode ?? "-",
        productName: x.productName ?? x.ProductName ?? "",
        categoryName: x.categoryName ?? x.CategoryName ?? "",
        onHand: x.onHand ?? x.quantity ?? x.QtyOnHand ?? 0,
        uomName: x.uomName ?? x.Uom ?? x.Unit ?? "",
        locationName: x.locationName ?? x.LocationName ?? "",
        minStock: x.minStock ?? x.MinStock ?? 0,
        status: x.status ?? x.Status ?? null,
        note: x.note ?? x.Note ?? "",
      }));
      setRows(items);
      setTotal(data.total ?? items.length);
    } catch (e) {
      console.error("Lỗi khi tải dữ liệu tồn kho:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const connection = getInventoryHubConnection();

    connection.off("InventoryUpdated");

    connection.on("InventoryUpdated", (payload) => {
      const { productId, minStock } = payload || {};
      if (!productId) return;

      setRows(prev =>
        prev.map(r =>
          r.productId === productId ? { ...r, minStock } : r
        )
      );
    });

    if (connection.state === signalR.HubConnectionState.Disconnected) {
      connection
        .start()
        .then(() => console.log("Đã kết nối SignalR cho màn hình tồn kho"))
        .catch(err => console.error("Lỗi kết nối SignalR tồn kho:", err));
    }

    return () => {
      connection.off("InventoryUpdated");
    };
  }, []);

  useEffect(() => { load(); }, [page, search, locationFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const [editingMin, setEditingMin] = useState({});
  const [savingMin, setSavingMin] = useState({});

  const startEditMin = (pid, value) => {
    setEditingMin(prev => ({ ...prev, [pid]: value }));
  };

  const saveMinStock = async (pid) => {
    const raw = editingMin[pid];
    const value = Number(raw);
    if (Number.isNaN(value) || value < 0) return;

    setSavingMin(prev => ({ ...prev, [pid]: true }));
    try {
      const res = await apiFetch(`/api/warehousemanager/inventory/${pid}/min-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minStock: value }),
      });

      if (!res.ok) {
        let msg = `Lỗi lưu định mức (HTTP ${res.status})`;
        try {
          const t = await res.text();
          if (t) msg += ` - ${t}`;
        } catch { }
        throw new Error(msg);
      }

      setRows(prev => prev.map(r => r.productId === pid ? { ...r, minStock: value } : r));

      setEditingMin(prev => {
        const { [pid]: _, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      console.error(e);
      alert("Lưu định mức thất bại");
    } finally {
      setSavingMin(prev => ({ ...prev, [pid]: false }));
    }
  };

  return (
    <WarehouseLayout>
      <Modal show={showMinModal} onHide={() => setShowMinModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Thiết lập định mức tối thiểu</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Label>Áp dụng cho tất cả sản phẩm trong trang hiện tại</Form.Label>
          <InputGroup>
            <Form.Control
              type="number"
              min={0}
              value={bulkMin}
              onChange={(e) => setBulkMin(e.target.value)}
              placeholder="Nhập số lượng tối thiểu…"
            />
          </InputGroup>
          <div className="text-muted small mt-2">
            Gợi ý: lọc danh sách trước khi áp dụng để giới hạn phạm vi.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowMinModal(false)} disabled={applyingBulk}>
            Hủy
          </Button>
          <Button
            variant="primary"
            onClick={applyBulkMinStock}
            disabled={applyingBulk || bulkMin === "" || Number(bulkMin) < 0}
          >
            {applyingBulk ? <Spinner animation="border" size="sm" /> : <FontAwesomeIcon icon={faSave} />} Áp dụng
          </Button>
        </Modal.Footer>
      </Modal>

      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Quản lý tồn kho</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Quản lý tồn kho</h1>
          <p className="wm-page-subtitle">
            Theo dõi lượng tồn, cảnh báo định mức và lập kế hoạch bổ sung.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--primary"
            onClick={() => setShowMinModal(true)}
            disabled={rows.length === 0}
          >
            <FontAwesomeIcon icon={faSliders} /> Thiết lập định mức
          </button>
        </div>
      </div>

      <div className="wm-stat-grid">
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon"><FontAwesomeIcon icon={faBoxesStacked} /></div>
          <span className="wm-stat-card__label">Số sản phẩm đang theo dõi</span>
          <span className="wm-stat-card__value">{summary.totalSku}</span>
          <span className="wm-stat-card__meta">Theo trang lọc hiện tại</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon"><FontAwesomeIcon icon={faLayerGroup} /></div>
          <span className="wm-stat-card__label">Tồn kho trang hiện tại</span>
          <span className="wm-stat-card__value">{summary.totalStock}</span>
          <span className="wm-stat-card__meta">Đơn vị lưu kho</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon"><FontAwesomeIcon icon={faBell} /></div>
          <span className="wm-stat-card__label">Dưới định mức</span>
          <span className="wm-stat-card__value">{summary.lowStock}</span>
          <span className="wm-stat-card__meta">Cần nhập bổ sung</span>
        </div>
        <div className="wm-stat-card">
          <div className="wm-stat-card__icon"><FontAwesomeIcon icon={faSearch} /></div>
          <span className="wm-stat-card__label">Cảnh báo nghiêm trọng</span>
          <span className="wm-stat-card__value">{summary.critical}</span>
          <span className="wm-stat-card__meta">Thiếu hàng nghiêm trọng</span>
        </div>
      </div>

      <div className="wm-surface wm-toolbar">
        <div className="wm-toolbar__search">
          <InputGroup>
            <InputGroup.Text><FontAwesomeIcon icon={faSearch} /></InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Tìm theo mã, tên sản phẩm hoặc danh mục..."
              value={search}
              onChange={(e) => { setPage(1); setSearch(e.target.value); }}
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
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Tồn kho</th>
              <th>Định mức tối thiểu</th>
              <th>Trạng thái</th>
              <th>Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="wm-empty">
                  <Spinner animation="border" size="sm" /> Đang tải...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="wm-empty">
                  Không có dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => {
                const st = r.status ?? getStatus(r);
                const pid = r.productId;
                const editing = Object.prototype.hasOwnProperty.call(editingMin, pid);
                return (
                  <tr key={pid}>
                    <td>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                    <td className="fw-semibold">{r.productCode || "-"}</td>
                    <td>{r.productName}</td>
                    <td>{r.onHand} {r.uomName}</td>
                    <td style={{ minWidth: 140 }}>
                      {editing ? (
                        <div className="d-flex gap-2">
                          <Form.Control
                            size="sm"
                            type="number"
                            min={0}
                            value={editingMin[pid]}
                            onChange={(e) => startEditMin(pid, e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") saveMinStock(pid); }}
                          />
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={!!savingMin[pid]}
                            onClick={() => saveMinStock(pid)}
                          >
                            <FontAwesomeIcon icon={faSave} />
                          </Button>
                        </div>
                      ) : (
                        <span
                          role="button"
                          className="text-primary"
                          onClick={() => startEditMin(pid, r.minStock)}
                          title="Nhấp để chỉnh sửa"
                        >
                          {r.minStock}
                        </span>
                      )}
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

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>Tổng: {total} sản phẩm • Trang {page}/{totalPages}</div>
        <div className="btn-group">
          <button
            className="btn btn-outline-secondary"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Trước
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
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
                >
                  {p}
                </button>
              )
            )}

          <button
            className="btn btn-outline-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Sau
          </button>
        </div>
      </div>
    </WarehouseLayout>
  );
}
