import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Breadcrumb,
  Badge,
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
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const API_BASE = "https://localhost:7278";

const initialForm = {
  productId: "",
  productName: "",
  uom: "",
  quantity: 1,
  unitPrice: 0,
};

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

const ReceivingSlipItems = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [supplier, setSupplier] = useState("");
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierErr, setSupplierErr] = useState("");

  const [productInputMode, setProductInputMode] = useState("select");
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [formErrs, setFormErrs] = useState({});
  const [status, setStatus] = useState(0);

  useEffect(() => {
    load();
    loadProducts();
  }, [id]);

  const totals = useMemo(() => {
    const totalQty = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
    const totalValue = items.reduce(
      (acc, item) => acc + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0
    );
    return {
      totalQty,
      totalValue,
      totalItems: items.length,
    };
  }, [items]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/items`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setItems(Array.isArray(data) ? data : data.items || []);

      const sup =
        (Array.isArray(data) ? "" : data?.supplier ?? data?.Supplier ?? "") || "";
      setSupplier(String(sup));

      const rawStatus = (Array.isArray(data) ? undefined : data?.status ?? data?.Status) ?? 0;
      setStatus(toStatusCode(rawStatus));

    } catch (e) {
      setError(e.message || "Không thể tải danh sách hàng hóa.");
    } finally {
      setLoading(false);
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Array.isArray(data) ? data : data.items || [];
      const normalized = raw
        .map((p) => ({
          id: p.id ?? p.Id ?? p.productID ?? p.ProductID,
          name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
        }))
        .filter((p) => p.id != null && p.name);
      setProducts(normalized);
    } catch (e) {
      console.error("Tải danh sách sản phẩm lỗi:", e);
    }
  }

  function findProductById(val) {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm("Xóa sản phẩm này khỏi phiếu nhập?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Xóa thất bại (${res.status})`);
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
    setFormErrs(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = {
      productId: form.productId || null,
      productName: form.productName,
      uom: form.uom,
      quantity: Number(form.quantity),
      unitPrice: Number(form.unitPrice),
    };
    try {
      const endpoint =
        mode === "create"
          ? `${API_BASE}/api/warehousemanager/receiving-slips/${id}/items`
          : `${API_BASE}/api/warehousemanager/receiving-items/${editId}`;
      const res = await fetch(endpoint, {
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

  const saveSupplier = async () => {
    const sup = supplier.trim();
    if (!sup) {
      setSupplierErr("Nhà cung cấp không được để trống.");
      return;
    }
    setSupplierErr("");
    setSavingSupplier(true);
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplier: sup }),
      });
      if (!res.ok) throw new Error(`Lưu nhà cung cấp thất bại (${res.status})`);
      setIsEditingSupplier(false);
    } catch (e) {
      alert("Không thể lưu nhà cung cấp: " + e.message);
    } finally {
      setSavingSupplier(false);
    }
  };

  // giống ReceivingList
  const isConfirmed = status === 1;

  return (
    <WarehouseLayout>
      <div className="wm-page-header">
        <div>
          <div className="wm-breadcrumb">
            <Breadcrumb listProps={{ className: "breadcrumb-transparent" }}>
              <Breadcrumb.Item href="/warehouse-dashboard">
                <FontAwesomeIcon icon={faHome} /> Bảng điều phối
              </Breadcrumb.Item>
              <Breadcrumb.Item href="/warehouse-dashboard/receiving-slips">
                Phiếu nhập kho
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Chi tiết phiếu</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Chi tiết phiếu nhập RC{id}</h1>
          <p className="wm-page-subtitle">
            Theo dõi danh sách hàng hóa trong phiếu và cập nhật số liệu tiếp nhận thực tế.
          </p>
        </div>

        <div className="wm-page-actions">
          <button
            type="button"
            className="wm-btn wm-btn--light"
            onClick={() => navigate("/warehouse-dashboard/receiving-slips")}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            Quay lại danh sách
          </button>

          {!isConfirmed && (
            <button type="button" className="wm-btn wm-btn--primary" onClick={openCreate}>
              <FontAwesomeIcon icon={faPlus} />
              Tạo mới
            </button>
          )}
        </div>
      </div>

      <div className="wm-surface mb-3">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <Form.Label className="mb-0">Nhà cung cấp</Form.Label>
          {!isConfirmed && (
            !isEditingSupplier ? (
              <FontAwesomeIcon
                icon={faEdit}
                role="button"
                className="text-primary fs-5 ms-2"
                title="Chỉnh sửa"
                onClick={() => setIsEditingSupplier(true)}
                style={{ cursor: "pointer" }}
              />
            ) : (
              <div className="d-flex gap-2">
                <Button
                  variant="success"
                  size="sm"
                  onClick={saveSupplier}
                  disabled={savingSupplier}
                >
                  <FontAwesomeIcon icon={faSave} />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => {
                    setIsEditingSupplier(false);
                    setSupplierErr("");
                    load();
                  }}
                  disabled={savingSupplier}
                >
                  Hủy
                </Button>
              </div>
            )
          )}
        </div>
        <Form.Control
          type="text"
          value={supplier}
          onChange={(e) => setSupplier(e.target.value)}
          disabled={!isEditingSupplier}
          isInvalid={!!supplierErr}
          placeholder="Nhập nhà cung cấp"
        />
        {supplierErr && <div className="text-danger small mt-1">{supplierErr}</div>}
      </div>

      {error && (
        <Alert variant="danger" className="wm-surface">
          Không thể tải dữ liệu: {error}
        </Alert>
      )}

      <div className="wm-summary">
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số mặt hàng</span>
          <span className="wm-summary__value">{totals.totalItems}</span>
          <span className="wm-subtle-text">Sản phẩm trong phiếu nhập</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số lượng</span>
          <span className="wm-summary__value">{totals.totalQty}</span>
          <span className="wm-subtle-text">Không theo đơn vị cụ thể</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng giá trị đơn hàng</span>
          <span className="wm-summary__value">
            {totals.totalValue.toLocaleString("vi-VN")} đ
          </span>
          <span className="wm-subtle-text">Chưa bao gồm thuế</span>
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
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              {!isConfirmed && <th className="text-end">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={isConfirmed ? 7 : 8} className="wm-empty">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={isConfirmed ? 7 : 8} className="wm-empty">
                  Chưa có sản phẩm nào nào trong phiếu nhập này.
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
                  <td>{Number(item.unitPrice || 0).toLocaleString("vi-VN")} đ</td>
                  <td>
                    {(Number(item.unitPrice || 0) * Number(item.quantity || 0)).toLocaleString(
                      "vi-VN"
                    )}{" "}
                    đ
                  </td>

                  {!isConfirmed && (
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => openEdit(item)}
                        className="me-2"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDelete(item.id)}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{mode === "create" ? "Tạo" : "Chỉnh sửa"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <span className="wm-subtle-text">
              {mode === "create"
                ? "Điền thông tin sản phẩm sẽ nhập kho."
                : "Chỉnh sửa thông tin đã chọn."}
            </span>
            <div className="d-flex gap-2">
              <Badge
                bg={productInputMode === "select" ? "primary" : "light"}
                text={productInputMode === "select" ? undefined : "dark"}
                role="button"
                onClick={() => setProductInputMode("select")}
              >
                Chọn từ danh sách
              </Badge>
              <Badge
                bg={productInputMode === "input" ? "primary" : "light"}
                text={productInputMode === "input" ? undefined : "dark"}
                role="button"
                onClick={() => setProductInputMode("input")}
              >
                Nhập thủ công
              </Badge>
            </div>
          </div>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Mã sản phẩm</Form.Label>
              {productInputMode === "select" ? (
                <Form.Select
                  value={form.productId === "" ? "" : String(form.productId)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "") {
                      setForm({ ...form, productId: "", productName: "" });
                      return;
                    }
                    const selected = findProductById(val);
                    setForm({
                      ...form,
                      productId: val,
                      productName: selected?.name || "",
                    });
                  }}
                  isInvalid={!!formErrs.productId}
                >
                  <option value="">-- Chọn sản phẩm --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.name}
                    </option>
                  ))}
                </Form.Select>
              ) : (
                <Form.Control
                  type="number"
                  placeholder="Nhập mã sản phẩm"
                  value={form.productId}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = findProductById(val);
                    if (found) {
                      setForm({ ...form, productId: val, productName: found.name });
                    } else {
                      setForm({ ...form, productId: val });
                    }
                  }}
                  isInvalid={!!formErrs.productId}
                />
              )}
              <Form.Control.Feedback type="invalid">
                {formErrs.productId}
              </Form.Control.Feedback>
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
                <Form.Control
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                  placeholder="pcs / box / carton"
                  isInvalid={!!formErrs.uom}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrs.uom}
                </Form.Control.Feedback>
              </div>
              <div className="col-md-6 mb-3">
                <Form.Label>Số lượng</Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min={1}
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    isInvalid={!!formErrs.quantity}
                  />
                  <InputGroup.Text>{form.uom || "unit"}</InputGroup.Text>
                  <Form.Control.Feedback type="invalid">
                    {formErrs.quantity}
                  </Form.Control.Feedback>
                </InputGroup>
              </div>
            </div>

            <Form.Group className="mb-1">
              <Form.Label>Đơn giá</Form.Label>
              <Form.Control
                type="number"
                min={0}
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
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

export default ReceivingSlipItems;