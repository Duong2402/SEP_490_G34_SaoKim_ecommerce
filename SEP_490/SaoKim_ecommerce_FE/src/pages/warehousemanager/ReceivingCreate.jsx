import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Table,
  Button,
  Badge,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowLeft,
  faPlus,
  faSave,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import Select from "react-select";
import { Toast, ToastContainer } from "react-bootstrap";
import { apiFetch } from "../../api/lib/apiClient";


const emptyItem = () => ({
  productId: "",
  productName: "",
  uom: "",
  quantity: 1,
  unitPrice: 0,
});

export default function ReceivingCreate() {
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState("");
  const [receiptDate, setReceiptDate] = useState(() => {
    const d = new Date();
    const iso = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
    return iso;
  });
  const [note, setNote] = useState("");

  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrs, setFieldErrs] = useState({});
  const [itemErrs, setItemErrs] = useState({});
  const [products, setProducts] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [notify, setNotify] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await apiFetch(`/api/products`);

        if (!res.ok) {
          const text = await res.text();
          console.error("GET /api/products failed:", res.status, text);
          return;
        }

        const json = await res.json();
        const payload = json.data ?? json;
        const raw = Array.isArray(payload)
          ? payload
          : payload.items || [];

        console.log("Products raw:", raw);

        const normalized = raw
          .map((p) => ({
            id: p.id ?? p.Id ?? p.productID ?? p.ProductID,
            name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
            uom:
              p.uom ?? p.Uom ?? p.unit ?? p.Unit ??
              p.unitOfMeasure ?? p.UnitOfMeasure ??
              p.unitOfMeasureName ?? p.UnitOfMeasureName ?? "",
          }))
          .filter((p) => p.id != null && p.name);

        console.log("Products normalized:", normalized);
        setProducts(normalized);
      } catch (e) {
        console.error("Không thể tải products:", e);
        setNotify("Không thể tải danh sách sản phẩm.");
      }
    };

    const loadUoms = async () => {
      try {
        const res = await apiFetch(`/api/warehousemanager/unit-of-measures`);
        if (!res.ok) {
          console.error("GET /unit-of-measures status:", res.status);
          return;
        }
        const data = await res.json();
        setUoms(data.map((u) => u.name));
      } catch (e) {
        console.error("Không thể tải đơn vị tính:", e);
        setNotify("Không thể tải danh sách đơn vị tính.");
      }
    };

    loadProducts();
    loadUoms();
  }, []);

  useEffect(() => {
    if (!notify) return;
    const t = setTimeout(() => setNotify(null), 3500);
    return () => clearTimeout(t);
  }, [notify]);

  const totals = useMemo(() => {
    const totalQty = items.reduce(
      (acc, it) => acc + Number(it.quantity || 0),
      0
    );
    const totalValue = items.reduce(
      (acc, it) =>
        acc + Number(it.quantity || 0) * Number(it.unitPrice || 0),
      0
    );
    return { totalQty, totalValue };
  }, [items]);

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (idx) =>
    setItems((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );

  const patchItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const findProductById = (val) => {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  };

  const validate = () => {
    const errs = {};
    if (!supplier.trim()) errs.supplier = "Nhà cung cấp bắt buộc.";
    if (!receiptDate) errs.receiptDate = "Ngày nhận bắt buộc.";
    setFieldErrs(errs);

    const iErrs = {};
    items.forEach((it, idx) => {
      const e = {};
      if (!it.productName?.trim() && !it.productId)
        e.productName = "Tên sản phẩm hoặc Mã sản phẩm bắt buộc.";
      if (!it.uom?.trim()) e.uom = "Đơn vị tính bắt buộc.";
      if (!(Number(it.quantity) > 0)) e.quantity = "Số lượng > 0.";
      if (Number(it.unitPrice) < 0) e.unitPrice = "Đơn giá >= 0.";
      if (Object.keys(e).length) iErrs[idx] = e;
    });
    setItemErrs(iErrs);

    if (items.length === 0) {
      const msg = "Cần ít nhất 1 dòng hàng.";
      setError(msg);
      setNotify(msg);
    } else {
      setError("");
    }

    return (
      Object.keys(errs).length === 0 &&
      Object.keys(iErrs).length === 0 &&
      items.length > 0
    );
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError("");

    const payload = {
      supplier: supplier.trim(),
      receiptDate: new Date(receiptDate).toISOString(),
      note: note?.trim() || null,
      items: items.map((it) => ({
        productId: it.productId ? Number(it.productId) : null,
        productName: it.productName?.trim() || "",
        uom: it.uom?.trim() || "",
        quantity: Number(it.quantity || 0),
        unitPrice: Number(it.unitPrice || 0),
      })),
    };

    try {
      const res = await apiFetch(`/api/warehousemanager/receiving-slips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 409) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || "ReferenceNo đã tồn tại.");
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.message || `Lỗi tạo phiếu (HTTP ${res.status})`);
      }

      const ok = await res.json();
      const newId =
        ok?.id ??
        ok?.slip?.id ??
        ok?.Slip?.Id ??
        ok?.slip?.Id;

      if (newId) {
        navigate(`/warehouse-dashboard/receiving-slips/${newId}/items`);
      } else {
        navigate(`/warehouse-dashboard/receiving-slips`);
      }
    } catch (e) {
      const msg = e.message || "Không thể tạo phiếu.";
      setError(msg);
      setNotify(msg);
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
              <Breadcrumb.Item href="/warehouse-dashboard/receiving-slips">
                Phiếu nhập kho
              </Breadcrumb.Item>
              <Breadcrumb.Item active>Tạo phiếu mới</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Tạo phiếu nhập kho</h1>
          <p className="wm-page-subtitle">
            Nhập thông tin chung & thêm sản phẩm vào phiếu, sau đó lưu để tạo.
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
          <button
            type="button"
            className="wm-btn wm-btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            <FontAwesomeIcon icon={faSave} />
            {saving ? " Đang lưu..." : " Lưu phiếu"}
          </button>
        </div>
      </div>

      <div className="wm-summary">
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng số lượng</span>
          <span className="wm-summary__value">{totals.totalQty}</span>
          <span className="wm-subtle-text">Không theo đơn vị cụ thể</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Tổng giá trị</span>
          <span className="wm-summary__value">
            {totals.totalValue.toLocaleString("vi-VN")} đ
          </span>
          <span className="wm-subtle-text">Chưa gồm thuế</span>
        </div>
        <div className="wm-summary__card">
          <span className="wm-summary__label">Trạng thái</span>
          <span className="wm-summary__value">
            <Badge bg="warning" text="dark">
              Nháp
            </Badge>
          </span>
          <span className="wm-subtle-text">Sẽ là Draft khi tạo</span>
        </div>
      </div>

      <div className="wm-surface mb-3">
        <div className="row">
          <div className="col-md-6 mb-3">
            <Form.Label>
              Nhà cung cấp <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              isInvalid={!!fieldErrs.supplier}
              placeholder="VD: Điện Quang"
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrs.supplier}
            </Form.Control.Feedback>
          </div>

          <div className="col-md-6 mb-3">
            <Form.Label>
              Ngày nhận <span className="text-danger">*</span>
            </Form.Label>
            <Form.Control
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              isInvalid={!!fieldErrs.receiptDate}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrs.receiptDate}
            </Form.Control.Feedback>
          </div>
        </div>

        <Form.Group className="mb-0">
          <Form.Label>Ghi chú</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú thêm (không bắt buộc)"
          />
        </Form.Group>
      </div>

      <div className="wm-surface wm-table wm-scroll">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="wm-section-title mb-0">Dòng hàng</h2>
          <Button variant="outline-primary" size="sm" onClick={addRow}>
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Thêm dòng
          </Button>
        </div>

        <Table responsive hover className="mb-0">
          <thead>
            <tr>
              <th>#</th>
              <th style={{ minWidth: 140 }}>Mã SP</th>
              <th style={{ minWidth: 240 }}>Tên sản phẩm</th>
              <th style={{ minWidth: 120 }}>ĐVT</th>
              <th style={{ minWidth: 120 }}>Số lượng</th>
              <th style={{ minWidth: 140 }}>Đơn giá</th>
              <th style={{ minWidth: 160 }}>Thành tiền</th>
              <th className="text-end" style={{ width: 100 }}>
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="wm-empty">
                  Chưa có dòng hàng.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const lineTotal =
                  Number(it.quantity || 0) * Number(it.unitPrice || 0);
                const errs = itemErrs[idx] || {};
                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <Select
                        options={products.map((p) => ({
                          value: p.id,
                          label: `${p.id} - ${p.name}`,
                        }))}
                        value={
                          products.find((p) => p.id === it.productId)
                            ? {
                                value: it.productId,
                                label: `${it.productId} - ${
                                  findProductById(it.productId)?.name
                                }`,
                              }
                            : null
                        }
                        onChange={(option) => {
                          if (!option) {
                            patchItem(idx, {
                              productId: "",
                              productName: "",
                              uom: "",
                              unitPrice: 0,
                            });
                            return;
                          }
                          const p = findProductById(option.value);
                          patchItem(idx, {
                            productId: option.value,
                            productName: p?.name || "",
                            uom: p?.uom || "",
                          });
                        }}
                        placeholder="Chọn"
                        styles={{
                          control: (base) => ({ ...base, minHeight: 45 }),
                          menu: (base) => ({ ...base, fontSize: 14 }),
                          option: (base) => ({ ...base, padding: 10 }),
                        }}
                        menuPortalTarget={document.body}
                        menuPlacement="auto"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errs.productName}
                      </Form.Control.Feedback>
                    </td>
                    <td>
                      <Form.Control
                        value={it.productName}
                        onChange={(e) =>
                          patchItem(idx, { productName: e.target.value })
                        }
                        isInvalid={!!errs.productName}
                        placeholder={
                          it.productId
                            ? "Tên tự điền từ sản phẩm"
                            : "Nhập tên sản phẩm"
                        }
                        disabled={!!it.productId}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errs.productName}
                      </Form.Control.Feedback>
                    </td>
                    <td>
                      <Select
                        options={uoms.map((u) => ({ value: u, label: u }))}
                        value={
                          it.uom ? { value: it.uom, label: it.uom } : null
                        }
                        onChange={(option) =>
                          patchItem(idx, { uom: option?.value || "" })
                        }
                        placeholder="Chọn ĐVT"
                        isDisabled={!!it.uom}
                        styles={{
                          control: (base) => ({ ...base, minHeight: 40 }),
                          menu: (base) => ({ ...base, fontSize: 14 }),
                          option: (base) => ({ ...base, padding: 8 }),
                        }}
                        menuPortalTarget={document.body}
                        menuPlacement="auto"
                      />
                      {errs.uom && (
                        <div className="invalid-feedback d-block">
                          {errs.uom}
                        </div>
                      )}
                    </td>
                    <td>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) =>
                            patchItem(idx, { quantity: e.target.value })
                          }
                          isInvalid={!!errs.quantity}
                        />
                        <Form.Control.Feedback type="invalid">
                          {errs.quantity}
                        </Form.Control.Feedback>
                      </InputGroup>
                    </td>
                    <td>
                      <Form.Control
                        type="number"
                        min={0}
                        value={it.unitPrice}
                        onChange={(e) =>
                          patchItem(idx, { unitPrice: e.target.value })
                        }
                        isInvalid={!!errs.unitPrice}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errs.unitPrice}
                      </Form.Control.Feedback>
                    </td>
                    <td className="fw-semibold">
                      {lineTotal.toLocaleString("vi-VN")} VNĐ
                    </td>
                    <td className="text-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeRow(idx)}
                        disabled={items.length === 1}
                        title={
                          items.length === 1
                            ? "Cần ít nhất 1 dòng"
                            : "Xóa dòng"
                        }
                      >
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
            bg="danger"
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
