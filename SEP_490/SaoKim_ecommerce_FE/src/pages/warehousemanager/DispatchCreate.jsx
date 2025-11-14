import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import WarehouseLayout from "../../layouts/WarehouseLayout";
import {
  Breadcrumb,
  Form,
  InputGroup,
  Table,
  Button,
  Alert,
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
import { apiFetch } from "../../api/lib/apiClient";
import Select from "react-select";

export const API_BASE = "https://localhost:7278";
const emptyItem = () => ({
  productId: "",
  uom: "",
  quantity: 1,
  unitPrice: 0,
});

export default function DispatchCreate() {
  const navigate = useNavigate();

  const [type, setType] = useState("Sales");
  const [dispatchDate, setDispatchDate] = useState(() => {
    const d = new Date();
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
      .toISOString()
      .slice(0, 10);
  });
  const [note, setNote] = useState("");

  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);

  const [items, setItems] = useState([emptyItem()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrs, setFieldErrs] = useState({});
  const [itemErrs, setItemErrs] = useState({});
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await apiFetch(`/api/products`);
        if (!res.ok) throw new Error(`Products HTTP ${res.status}`);
        const data = await res.json();
        const raw = Array.isArray(data) ? data : data.items || [];
        const normalized = raw
          .map((p) => ({
            id: p.id ?? p.Id ?? p.productID ?? p.ProductID,
            name: p.name ?? p.Name ?? p.productName ?? p.ProductName,
            unit: p.unit ?? p.Unit ?? p.uom ?? p.Uom ?? "",
            price: p.price ?? p.Price ?? p.unitPrice ?? p.UnitPrice ?? 0,
          }))
          .filter((p) => p.id != null && p.name);
        setProducts(normalized);
      } catch (err) {
        console.error("[Load products] failed:", err);
      }
    };
    loadProducts();
  }, []);

  useEffect(() => {
    const loadForType = async () => {
      try {
        if (type === "Sales") {
          const res = await apiFetch(`/api/warehousemanager/customers`);
          if (!res.ok) throw new Error(`Customers HTTP ${res.status}`);
          const data = await res.json();
          setCustomers((data || []).map(c => ({ value: Number(c.id), label: `${c.id} - ${c.name}` })));
        } else {
          const res = await apiFetch(`/api/warehousemanager/projects`);
          if (!res.ok) throw new Error(`Projects HTTP ${res.status}`);
          const data = await res.json();
          setProjects((data || []).map(p => ({ value: Number(p.id), label: `${p.id} - ${p.name}` })));
        }
      } catch (err) {
        console.error("[Load list for type] failed:", err);
        setCustomers([]); setProjects([]);
      }
    };
    loadForType();
    setSelectedCustomer(null);
    setSelectedProject(null);
  }, [type]);

  const totals = useMemo(() => {
    const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
    const totalValue = items.reduce(
      (acc, it) => acc + Number(it.quantity || 0) * Number(it.unitPrice || 0),
      0
    );
    return { totalQty, totalValue };
  }, [items]);

  const addRow = () => setItems((prev) => [...prev, emptyItem()]);
  const removeRow = (idx) =>
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)));
  const patchItem = (idx, patch) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const findProductById = (val) => {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  };

  const validate = () => {
    const errs = {};
    if (!dispatchDate) errs.dispatchDate = "Ngày xuất bắt buộc.";
    if (type === "Sales") {
      if (!selectedCustomer?.value) errs.customerName = "Chọn khách hàng.";
    } else {
      if (!selectedProject?.value) errs.projectName = "Chọn dự án.";
    }
    setFieldErrs(errs);

    const iErrs = {};
    items.forEach((it, idx) => {
      const e = {};
      if (!it.productId) e.productId = "Chọn sản phẩm.";
      if (!(Number(it.quantity) > 0)) e.quantity = "Số lượng > 0.";
      if (Number(it.unitPrice) < 0) e.unitPrice = "Đơn giá >= 0.";
      if (Object.keys(e).length) iErrs[idx] = e;
    });
    setItemErrs(iErrs);

    if (items.length === 0) {
      setError("Cần ít nhất 1 dòng hàng.");
    } else {
      setError("");
    }

    return Object.keys(errs).length === 0 && Object.keys(iErrs).length === 0 && items.length > 0;
  };

  const buildCreatePayloadAndUrl = ({ type, dispatchDate, note, selectedCustomer, selectedProject }) => {
    const urlBase = `/api/warehousemanager/dispatch-slips`;
    if (type === "Sales") {
      return {
        url: `${urlBase}/sales`,
        body: {
          dispatchDate: new Date(dispatchDate).toISOString(),
          customerId: Number(selectedCustomer?.value),
          note: note?.trim() || null,
        },
      };
    }
    return {
      url: `${urlBase}/projects`,
      body: {
        dispatchDate: new Date(dispatchDate).toISOString(),
        projectId: Number(selectedProject?.value),
        note: note?.trim() || null,
      },
    };
  };

  const handleSave = async () => {
    const ok = validate();
    console.log("[Validate result]", ok, { type, selectedCustomer, selectedProject });
    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      const { url, body } = buildCreatePayloadAndUrl({
        type,
        dispatchDate,
        note,
        selectedCustomer,
        selectedProject,
      });

      console.log("[Create Dispatch] URL:", url);
      console.log("[Create Dispatch] BODY:", body, {
        typeofCustomerId: typeof body.customerId,
        typeofProjectId: typeof body.projectId
      });

      console.log("[Create Dispatch] URL:", url);
      console.log("[Create Dispatch] BODY:", body, {
        typeofCustomerId: typeof body.customerId,
        typeofProjectId: typeof body.projectId
      });

      const resSlip = await apiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resSlip.ok) {
        const j = await resSlip.json().catch(() => ({}));
        throw new Error(j?.message || `Lỗi tạo phiếu xuất (${resSlip.status})`);
      }

      const created = await resSlip.json();
      const newId = created?.id ?? created?.Id ?? created?.slip?.id ?? created?.Slip?.Id;

      if (!newId) throw new Error("Không lấy được ID phiếu xuất.");

      for (const it of items) {
        const p = findProductById(it.productId);
        const itemPayload = {
          productId: Number(it.productId),
          productName: p?.name ?? "",
          uom: p?.unit ?? "pcs",
          quantity: Number(it.quantity || 0),
          unitPrice: Number(it.unitPrice || 0),
        };

        const resItem = await apiFetch(
          `/api/warehousemanager/dispatch-slips/${newId}/items`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemPayload),
          }
        );

        if (!resItem.ok) {
          const j = await resItem.json().catch(() => ({}));
          throw new Error(j?.message || `Lỗi thêm dòng hàng (SP ${itemPayload.productId})`);
        }
      }

      navigate(`/warehouse-dashboard/dispatch-slips/${newId}/items`);
    } catch (e) {
      setError(e.message || "Không thể tạo phiếu xuất.");
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
              <Breadcrumb.Item active>Tạo phiếu xuất</Breadcrumb.Item>
            </Breadcrumb>
          </div>
          <h1 className="wm-page-title">Tạo phiếu xuất kho</h1>
          <p className="wm-page-subtitle">
            Chọn loại Sales/Project, nhập thông tin chung & thêm dòng hàng (chỉ từ danh mục sản phẩm).
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

      {error && (
        <Alert variant="danger" className="wm-surface">
          {error}
        </Alert>
      )}

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
            <Badge bg="warning" text="dark">Nháp</Badge>
          </span>
          <span className="wm-subtle-text">Sẽ là Draft khi tạo</span>
        </div>
      </div>

      <div className="wm-surface mb-3">
        <div className="row">
          <div className="col-md-3 mb-3">
            <Form.Label>Loại phiếu <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="Sales">Sales</option>
              <option value="Project">Project</option>
            </Form.Select>
          </div>

          <div className="col-md-3 mb-3">
            <Form.Label>Ngày xuất <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              isInvalid={!!fieldErrs.dispatchDate}
            />
            <Form.Control.Feedback type="invalid">
              {fieldErrs.dispatchDate}
            </Form.Control.Feedback>
          </div>

          {type === "Sales" ? (
            <div className="col-md-6 mb-3">
              <Form.Label>Khách hàng <span className="text-danger">*</span></Form.Label>
              <Select
                options={customers}
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                placeholder="Chọn khách hàng (User role = Customer)"
                styles={{
                  control: (base) => ({ ...base, minHeight: 45 }),
                  menu: (base) => ({ ...base, fontSize: 14 }),
                  option: (base) => ({ ...base, padding: 10 }),
                }}
                menuPortalTarget={document.body}
                menuPlacement="auto"
              />
              {fieldErrs.customerName && (
                <div className="invalid-feedback d-block">{fieldErrs.customerName}</div>
              )}
            </div>
          ) : (
            <div className="col-md-6 mb-3">
              <Form.Label>Dự án <span className="text-danger">*</span></Form.Label>
              <Select
                options={projects}
                value={selectedProject}
                onChange={setSelectedProject}
                placeholder="Chọn dự án"
                styles={{
                  control: (base) => ({ ...base, minHeight: 45 }),
                  menu: (base) => ({ ...base, fontSize: 14 }),
                  option: (base) => ({ ...base, padding: 10 }),
                }}
                menuPortalTarget={document.body}
                menuPlacement="auto"
              />
              {fieldErrs.projectName && (
                <div className="invalid-feedback d-block">{fieldErrs.projectName}</div>
              )}
            </div>
          )}
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
              <th style={{ minWidth: 180 }}>Sản phẩm (ID - Tên)</th>
              <th style={{ minWidth: 100 }}>ĐVT</th>
              <th style={{ minWidth: 120 }}>Số lượng</th>
              <th style={{ minWidth: 140 }}>Đơn giá</th>
              <th style={{ minWidth: 160 }}>Thành tiền</th>
              <th className="text-end" style={{ width: 100 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="wm-empty">Chưa có dòng hàng.</td>
              </tr>
            ) : (
              items.map((it, idx) => {
                const errs = itemErrs[idx] || {};
                const lineTotal = Number(it.quantity || 0) * Number(it.unitPrice || 0);

                return (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <Select
                        options={products.map((p) => ({ value: p.id, label: `${p.id} - ${p.name}` }))}
                        value={
                          products.find((p) => p.id === it.productId)
                            ? {
                              value: it.productId,
                              label: `${it.productId} - ${findProductById(it.productId)?.name}`,
                            }
                            : null
                        }
                        onChange={(option) =>
                          patchItem(idx, {
                            productId: option?.value || "",
                            uom: findProductById(option?.value)?.unit || "",
                            unitPrice: findProductById(option?.value)?.price || 0,
                          })
                        }
                        maxMenuHeight={200}
                        styles={{
                          control: (base) => ({ ...base, minHeight: 45 }),
                          menu: (base) => ({ ...base, fontSize: 14 }),
                          option: (base) => ({ ...base, padding: 10 }),
                        }}
                        menuPortalTarget={document.body}
                        menuPlacement="auto"
                      />
                      <Form.Control.Feedback type="invalid">
                        {errs.productId}
                      </Form.Control.Feedback>
                    </td>

                    <td>
                      <Form.Control value={it.uom} disabled readOnly />
                    </td>

                    <td>
                      <InputGroup>
                        <Form.Control
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => patchItem(idx, { quantity: e.target.value })}
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
                        onChange={(e) => patchItem(idx, { unitPrice: e.target.value })}
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
                        title={items.length === 1 ? "Cần ít nhất 1 dòng" : "Xóa dòng"}
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
    </WarehouseLayout>
  );
}
