import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Breadcrumb,
  Table,
  Button,
  Form,
  InputGroup,
  Alert,
} from "@themesberg/react-bootstrap";
import { Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowLeft,
  faPlus,
  faSave,
  faTrash,
  faEdit,
  faTruckPlane,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import Select from "react-select";
import { apiFetch } from "../../api/lib/apiClient";

const API_BASE = "https://localhost:7278";

const initialForm = {
  productId: "",
  productName: "",
  uom: "",
  quantity: 1,
  deliveredQuantity: 0,
  note: "",
  unitPrice: 0,
};

const DispatchSlipItems = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productInputMode, setProductInputMode] = useState("select");
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [formErrs, setFormErrs] = useState({});

  useEffect(() => {
    load();
    loadProducts();
  }, [id]);

  const totals = useMemo(() => {
    const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    const deliveredQty = items.reduce(
      (acc, item) => acc + Number(item.deliveredQuantity || 0),
      0
    );
    return {
      totalQty,
      deliveredQty,
      totalItems: items.length,
    };
  }, [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-slips/${id}/items`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (e) {
      setError(e.message || "Không thể tải danh sách hàng hóa.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await apiFetch(`/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.items || [];
      const normalized = raw
        .map((p) => ({
          id: p.id ?? p.Id ?? p.productID ?? p.ProductID,
          name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
          productCode: p.productCode ?? p.ProductCode ?? p.code ?? p.Code,
          uom: p.uom ?? p.UOM ?? p.unit ?? p.Unit,
          price:
            p.price ?? p.Price ??
            p.unitPrice ?? p.UnitPrice ??
            p.defaultPrice ?? p.DefaultPrice ?? 0,
        }))
        .filter((p) => p.id != null && p.name);
      setProducts(normalized);
    } catch (e) {
      console.error("Error loading products:", e);
    }
  }

  function findProductById(val) {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm("Xóa dòng hàng này khỏi phiếu xuất?")) return;
    try {
      const res = await apiFetch(`/api/warehousemanager/dispatch-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      alert("Không thể xóa: " + err.message);
    }
  };

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
      deliveredQuantity: item.deliveredQuantity ?? 0,
      note: item.note ?? "",
      unitPrice: item.unitPrice ?? 0,
    });
    setShowModal(true);
  };

  const validate = () => {
    const errs = {};
    if (!form.productId && !form.productName) {
      errs.productId = "Vui lòng chọn hoặc nhập sản phẩm.";
    }
    if (!form.productName) {
      errs.productName = "Tên sản phẩm không được để trống.";
    }
    if (!form.uom) {
      errs.uom = "Đơn vị tính không được để trống.";
    }
    if (!form.quantity || Number(form.quantity) <= 0) {
      errs.quantity = "Số lượng phải lớn hơn 0.";
    }
    if (form.unitPrice == null || Number(form.unitPrice) < 0) {
      errs.unitPrice = "Đơn giá không được âm.";
    }
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
      deliveredQuantity: Number(form.deliveredQuantity),
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
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      await load();
      setShowModal(false);
    } catch (err) {
      alert("Không thể lưu: " + err.message);
    } finally {
      setSaving(false);
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
              <Breadcrumb.Item href="/warehouse-dashboard/dispatch-slips">
                Phiếu xuất kho
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Chi tiết phiếu</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Chi tiết phiếu xuất #{id}</h1>
          <p className="wm-page-subtitle">
            Theo dõi phân bổ hàng hóa, kiểm soát số lượng đã giao và ghi chú đặc biệt.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={() => navigate("/warehouse-dashboard/dispatch-slips")}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Quay lại danh sách
          </button>
          <button type="button" className="wm-btn wm-btn--primary" onClick={openCreate}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm dòng hàng
          </button>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="wm-surface">
          Không thể tải dữ liệu: {error}
        </Alert>
      )}

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
                <td colSpan={9} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="wm-empty">
                  Chưa có dòng hàng nào trong phiếu này.
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <span className="fw-semibold">{item.productCode || "N/A"}</span>
                  </td>
                  <td>{item.productName}</td>
                  <td>{item.uom}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.unitPrice || 0).toLocaleString("vi-VN")} VNĐ</td>
                  <td>{(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString("vi-VN")} VNĐ</td>
                  <td>{item.note || "-"}</td>
                  <td className="text-end">
                    <Button variant="outline-primary" size="sm" className="me-2" onClick={() => openEdit(item)}>
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={() => handleDelete(item.id)}>
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
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
                value={form.productId ? { value: form.productId, label: `${form.productId} - ${form.productName}` } : null}
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
                    unitPrice: Number(p.price || 0),
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
                placeholder={
                  productInputMode === "input"
                    ? "Nhập tên sản phẩm"
                    : "Tên sẽ tự điền theo mã sản phẩm"
                }
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                disabled={productInputMode === "select" && !!findProductById(form.productId)}
                isInvalid={!!formErrs.productName}
              />
              <Form.Control.Feedback type="invalid">
                {formErrs.productName}
              </Form.Control.Feedback>
            </Form.Group>

            <div className="row">
              <div className="col-md-6 mb-3">
                <Form.Label>Đơn vị tính</Form.Label>
                <Form.Control value={form.uom} disabled />
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Số lượng xuất</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    isInvalid={!!formErrs.quantity}
                  />
                  <InputGroup.Text>{form.uom || "unit"}</InputGroup.Text>
                  <Form.Control.Feedback type="invalid">{formErrs.quantity}</Form.Control.Feedback>
                </InputGroup>
              </div>
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Đơn giá</Form.Label>
              <InputGroup>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  isInvalid={!!formErrs.unitPrice}
                />
                <InputGroup.Text>VNĐ</InputGroup.Text>
                <Form.Control.Feedback type="invalid">
                  {formErrs.unitPrice}
                </Form.Control.Feedback>
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
    </WarehouseLayout>
  );
};

export default DispatchSlipItems;

