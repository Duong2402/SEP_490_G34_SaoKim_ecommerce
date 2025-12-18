import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Breadcrumb, Table, Button, Form, InputGroup } from "@themesberg/react-bootstrap";
import { Modal, Toast, ToastContainer } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowLeft,
  faPlus,
  faSave,
  faTrash,
  faEdit,
  faPrint,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import Select from "react-select";
import { apiFetch } from "../../api/lib/apiClient";
import { ensureRealtimeStarted, getRealtimeConnection } from "../../signalr/realtimeHub";

const MAX_QTY = 100_000_000;
const MAX_UNIT_PRICE = 1_000_000_000;
const MAX_LINE_TOTAL = 100_000_000_000;

const initialForm = {
  productId: "",
  productName: "",
  uom: "",
  quantity: 1,
  note: "",
  unitPrice: 0,
  productCode: "",
};

const na = (v, fallback = "N/A") => {
  if (v === null || v === undefined) return fallback;
  const s = String(v).trim();
  return s ? s : fallback;
};

const DispatchSlipItems = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const realtimeRef = useRef(null);

  const backToListUrl = `/warehouse-dashboard/dispatch-slips${location.search || ""}`;

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [formErrs, setFormErrs] = useState({});

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [notification, setNotification] = useState(null);
  const [exporting, setExporting] = useState(false);

  const [total, setTotal] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));
      params.append("pageSize", String(pageSize));

      const res = await apiFetch(
        `/api/warehousemanager/dispatch-slips/${id}/items?${params.toString()}`
      );
      if (!res.ok) throw new Error(`Lỗi HTTP ${res.status}`);

      const data = await res.json();

      setItems(data.items || []);
      setTotal(data.totalItems || data.total || 0);
      setTotalQty(data.totalQty || 0);
      setTotalAmount(data.totalAmount || 0);
    } catch (e) {
      const msg = e?.message || "Không thể tải danh sách hàng hóa.";
      setNotification({ type: "danger", message: msg });
    } finally {
      setLoading(false);
    }
  }, [id, page, pageSize]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await apiFetch(`/api/products?page=1&pageSize=1000`);
      const json = await res.json();

      const payload = json.data ?? json;
      const raw = Array.isArray(payload) ? payload : payload.items || [];

      const normalized = raw
        .map((p) => ({
          id: p.id ?? p.Id ?? p.productID ?? p.ProductID,
          name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
          productCode: p.productCode ?? p.ProductCode ?? p.code ?? p.Code,
          uom: p.uom ?? p.Uom ?? p.unit ?? p.Unit,
          price:
            p.price ??
            p.Price ??
            p.unitPrice ??
            p.UnitPrice ??
            p.defaultPrice ??
            p.DefaultPrice ??
            0,
        }))
        .filter((p) => p.id != null && p.name);

      setProducts(normalized);
    } catch (e) {
      console.error("Lỗi khi tải danh mục sản phẩm:", e);
      setNotification({ type: "danger", message: "Không thể tải danh mục sản phẩm." });
    }
  }, []);

  // chạy 1 lần: load products
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // chạy theo id/page/pageSize
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  useEffect(() => {
    let disposed = false;

    const token = localStorage.getItem("token") || "";
    const getAccessToken = async () => token;

    const onEvt = (payload) => {
      const type = payload?.type;
      if (!type) return;

      if (
        type === "dispatch.item.created" ||
        type === "dispatch.item.updated" ||
        type === "dispatch.item.deleted"
      ) {
        const dispatchId = payload?.data?.dispatchId ?? payload?.data?.DispatchId;
        if (dispatchId != null && Number(dispatchId) !== Number(id)) return;

        load();
      }
    };

    ensureRealtimeStarted(getAccessToken)
      .then(() => {
        if (disposed) return;

        const conn = getRealtimeConnection(getAccessToken);
        realtimeRef.current = conn;

        conn.off("evt");
        conn.on("evt", onEvt);
      })
      .catch((err) => {
        console.error("Lỗi kết nối realtime (DispatchSlipItems):", err);
      });

    return () => {
      disposed = true;
      const conn = realtimeRef.current;
      if (conn) conn.off("evt", onEvt);
    };
  }, [id, load]);

  const totals = useMemo(
    () => ({
      totalQty,
      totalItems: total,
      totalAmount,
    }),
    [totalQty, total, totalAmount]
  );

  function findProductById(val) {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  }

  const openCreate = () => {
    setMode("create");
    setEditId(null);
    setFormErrs({});
    setForm(initialForm);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setMode("edit");
    setEditId(item.id);
    setFormErrs({});
    setForm({
      productId: item.productId ?? "",
      productName: item.productName ?? "",
      uom: item.uom ?? "",
      quantity: item.quantity ?? 1,
      note: item.note ?? "",
      unitPrice: item.unitPrice ?? 0,
      productCode: item.productCode ?? "",
    });
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    const qty = Number(form.quantity);
    const price = Number(form.unitPrice);
    const lineTotal = qty * price;

    if (!form.productId && !form.productName) errs.productId = "Vui lòng chọn sản phẩm.";
    if (!form.productName) errs.productName = "Tên sản phẩm không được để trống.";
    if (!form.uom) errs.uom = "Đơn vị tính không được để trống.";

    if (!qty || qty <= 0) errs.quantity = "Số lượng phải lớn hơn 0.";
    else if (qty > MAX_QTY) errs.quantity = `Số lượng tối đa ${MAX_QTY.toLocaleString("vi-VN")}.`;

    if (price == null || price < 0) errs.unitPrice = "Đơn giá không được âm.";
    else if (price > MAX_UNIT_PRICE)
      errs.unitPrice = `Đơn giá tối đa ${MAX_UNIT_PRICE.toLocaleString("vi-VN")}.`;

    if (!errs.unitPrice && lineTotal > MAX_LINE_TOTAL)
      errs.unitPrice = `Thành tiền tối đa ${MAX_LINE_TOTAL.toLocaleString("vi-VN")}.`;

    setFormErrs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      productId: form.productId || null,
      productName: form.productName,
      productCode: form.productCode || null,
      uom: form.uom,
      quantity: Number(form.quantity),
      note: form.note,
      unitPrice: Number(form.unitPrice || 0),
    };

    try {
      const endpoint =
        mode === "create"
          ? `/api/warehousemanager/dispatch-slips/${id}/items`
          : `/api/warehousemanager/dispatch-items/${editId}`;

      const res = await apiFetch(endpoint, {
        method: mode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.message || `Lỗi lưu dữ liệu (${res.status})`);
      }

      await load();
      setShowModal(false);
      setNotification({
        type: "success",
        message: mode === "create" ? "Đã thêm dòng hàng." : "Đã cập nhật dòng hàng.",
      });
    } catch (err) {
      setNotification({ type: "danger", message: "Không thể lưu: " + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Xóa dòng hàng này khỏi phiếu xuất?")) return;
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Xóa thất bại (${res.status})`);

      await load();
      setNotification({ type: "success", message: "Đã xóa dòng hàng." });
    } catch (err) {
      setNotification({ type: "danger", message: "Không thể xóa: " + err.message });
    }
  };

  const handleExportPdf = async () => {
    try {
      setExporting(true);
      const res = await apiFetch(`/api/warehousemanager/dispatch-slips/${id}/print`);
      if (!res.ok) throw new Error(`Xuất PDF thất bại (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `PhieuXuat_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setNotification({ type: "success", message: "Đã xuất file PDF phiếu xuất." });
    } catch (err) {
      setNotification({
        type: "danger",
        message: "Không thể xuất PDF: " + (err.message || ""),
      });
    } finally {
      setExporting(false);
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
              <Breadcrumb.Item href={backToListUrl}>Phiếu xuất kho</Breadcrumb.Item>
              <Breadcrumb.Item active>Chi tiết phiếu</Breadcrumb.Item>
            </Breadcrumb>
          </div>

          <h1 className="wm-page-title">Chi tiết phiếu xuất #{id}</h1>
          <p className="wm-page-subtitle">
            Theo dõi phân bổ hàng hóa, kiểm soát số lượng đã giao và ghi chú đặc biệt.
          </p>
        </div>

        <div className="wm-page-actions">
          <button type="button" className="wm-btn wm-btn--light" onClick={() => navigate(backToListUrl)}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Quay lại danh sách
          </button>

          <button
            type="button"
            className="wm-btn wm-btn--outline"
            onClick={handleExportPdf}
            disabled={exporting}
          >
            <FontAwesomeIcon icon={faPrint} />
            {exporting ? "Đang xuất PDF..." : "Xuất phiếu PDF"}
          </button>

          <button type="button" className="wm-btn wm-btn--primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm dòng hàng
          </button>
        </div>
      </div>

      <div className="wm-summary">
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số hàng</span>
          <span className="wm-summary__value">{totals.totalItems}</span>
          <span className="wm-subtle-text">Theo phiếu xuất hiện tại</span>
        </div>

        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số lượng xuất</span>
          <span className="wm-summary__value">{totals.totalQty}</span>
          <span className="wm-subtle-text">Theo kế hoạch xuất kho</span>
        </div>

        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng tiền</span>
          <span className="wm-summary__value">
            {Number(totals.totalAmount || 0).toLocaleString("vi-VN")} VNĐ
          </span>
          <span className="wm-subtle-text">Tổng giá trị của cả phiếu</span>
        </div>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th>Mã sản phẩm</th>
              <th>Tên sản phẩm</th>
              <th>Đơn vị</th>
              <th>Số lượng xuất</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Ghi chú</th>
              <th className="text-end">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="wm-empty">Đang tải dữ liệu...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="wm-empty">Chưa có dòng hàng nào trong phiếu này.</td>
              </tr>
            ) : (
              items.map((item, index) => {
                const qty = Number(item.quantity || 0);
                const price = Number(item.unitPrice || 0);
                const lineTotal = qty * price;

                return (
                  <tr key={item.id ?? `${id}-${index}`}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td><span className="fw-semibold">{na(item.productCode, "N/A")}</span></td>
                    <td>{na(item.productName)}</td>
                    <td>{na(item.uom)}</td>
                    <td>{qty || 0}</td>
                    <td>{price.toLocaleString("vi-VN")} VNĐ</td>
                    <td>{lineTotal.toLocaleString("vi-VN")} VNĐ</td>
                    <td>{na(item.note)}</td>
                    <td className="text-end">
                      <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEdit(item)}>
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}>
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <div>
          Tổng: {total} dòng hàng • Trang {page}/{totalPages}
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

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{mode === "create" ? "Thêm dòng hàng" : "Cập nhật dòng hàng"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sản phẩm</Form.Label>
              <Select
                options={products.map((p) => ({ value: p.id, label: `${p.id} - ${p.name}` }))}
                value={
                  form.productId
                    ? { value: form.productId, label: `${form.productId} - ${form.productName}` }
                    : null
                }
                onChange={(option) => {
                  if (!option) {
                    setForm(initialForm);
                    return;
                  }
                  const p = findProductById(option.value);
                  setForm({
                    ...form,
                    productId: p.id,
                    productName: p.name,
                    uom: p.uom,
                    productCode: p.productCode,
                    unitPrice: Number(p.price > MAX_UNIT_PRICE ? MAX_UNIT_PRICE : p.price || 0),
                  });
                }}
                placeholder="Chọn sản phẩm"
                isClearable
                styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                menuPortalTarget={document.body}
              />
              {formErrs.productId && <div className="text-danger mt-1">{formErrs.productId}</div>}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Tên sản phẩm</Form.Label>
              <Form.Control
                type="text"
                value={form.productName}
                placeholder="Tên sẽ tự điền theo sản phẩm"
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                disabled={!!findProductById(form.productId)}
                isInvalid={!!formErrs.productName}
              />
              <Form.Control.Feedback type="invalid">{formErrs.productName}</Form.Control.Feedback>
            </Form.Group>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Đơn vị tính</Form.Label>
                <Form.Control value={form.uom} disabled />
                {formErrs.uom && <div className="text-danger mt-1">{formErrs.uom}</div>}
              </div>

              <div className="col-md-6 mb-3">
                <Form.Label>Số lượng xuất</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    min={1}
                    max={MAX_QTY}
                    value={form.quantity}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      if (Number.isNaN(raw)) {
                        setForm({ ...form, quantity: "" });
                        return;
                      }
                      const clamped = Math.min(Math.max(raw, 1), MAX_QTY);
                      setForm({ ...form, quantity: clamped });
                    }}
                    isInvalid={!!formErrs.quantity}
                  />
                  <InputGroup.Text>{form.uom || "đơn vị"}</InputGroup.Text>
                  <Form.Control.Feedback type="invalid">{formErrs.quantity}</Form.Control.Feedback>
                </InputGroup>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Đơn giá</Form.Label>
              <InputGroup>
                <Form.Control
                  type="text"
                  min={0}
                  max={MAX_UNIT_PRICE}
                  value={form.unitPrice}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    if (Number.isNaN(raw)) {
                      setForm({ ...form, unitPrice: "" });
                      return;
                    }
                    const clamped = Math.min(Math.max(raw, 0), MAX_UNIT_PRICE);
                    setForm({ ...form, unitPrice: clamped });
                  }}
                  isInvalid={!!formErrs.unitPrice}
                />
                <InputGroup.Text>VNĐ</InputGroup.Text>
                <Form.Control.Feedback type="invalid">{formErrs.unitPrice}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>

            <Form.Group className="mb-1">
              <Form.Label>Ghi chú</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="Thông tin giao hàng, lưu ý đặc biệt..."
              />
            </Form.Group>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={saving}>
            Hủy
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <FontAwesomeIcon icon={faSave} className="me-2" />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </Modal.Footer>
      </Modal>

      <ToastContainer
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
        }}
      >
        {notification && (
          <Toast
            bg={
              notification.type === "danger"
                ? "danger"
                : notification.type === "warning"
                ? "warning"
                : notification.type === "success"
                ? "success"
                : "light"
            }
            onClose={() => setNotification(null)}
            show={!!notification}
            delay={3500}
            autohide
          >
            <Toast.Header closeButton>
              <strong className="me-auto">Thông báo</strong>
            </Toast.Header>
            <Toast.Body
              className={
                notification.type === "danger" || notification.type === "warning"
                  ? "text-white"
                  : "text-dark"
              }
            >
              {notification.message}
            </Toast.Body>
          </Toast>
        )}
      </ToastContainer>
    </WarehouseLayout>
  );
};

export default DispatchSlipItems;
