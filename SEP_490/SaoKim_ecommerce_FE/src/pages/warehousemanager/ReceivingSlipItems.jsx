import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Breadcrumb,
  Card,
  Table,
  Button,
  ButtonGroup,
  Form,
  Row,
  Col,
} from "@themesberg/react-bootstrap";
import { Modal } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faArrowLeft,
  faEdit,
  faTrash,
  faPlus,
  faSave,
} from "@fortawesome/free-solid-svg-icons";
import WarehouseLayout from "../../layouts/WarehouseLayout";

const API_BASE = "https://localhost:7278";

function fmt(n) {
  return new Intl.NumberFormat().format(n ?? 0);
}

export default function ReceivingSlipItems() {
  const { id } = useParams();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [productInputMode, setProductInputMode] = useState("select");

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    productName: "",
    uom: "",
    quantity: 1,
    unitPrice: 0,
  });
  const [editId, setEditId] = useState(null);
  const [formErrs, setFormErrs] = useState({});

  useEffect(() => {
    load();
    loadProducts();
  }, [id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/items`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message || "Error loading items");
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
      console.error("Error loading products:", e);
    }
  }

  function findProductById(val) {
    const n = Number(val);
    if (Number.isNaN(n)) return null;
    return products.find((p) => Number(p.id) === n) || null;
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/warehousemanager/receiving-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      alert("Error deleting item: " + err.message);
    }
  };

  const openCreate = () => {
    setMode("create");
    setEditId(null);
    setFormErrs("");
    setForm({
      productId: "",
      productName: "",
      uom: "",
      quantity: 1,
      unitPrice: 0,
    });
    setShowModal(true);
  };

  const handleEdit = (itemId) => {
    const it = items.find((x) => x.id === itemId);
    if (!it) return;
    setMode("edit");
    setEditId(itemId);
    setFormErrs("");
    setForm({
      productId: it.productId ?? "",
      productName: it.productName ?? "",
      uom: it.uom ?? "",
      quantity: it.quantity ?? 1,
      unitPrice: it.unitPrice ?? 0,
    });
    setShowModal(true);
  };


  const handleSave = async () => {
    setSaving(true);
    setFormErrs({});
    try {
      const payload = {
        productId: form.productId === "" ? null : Number(form.productId),
        productName:
          form.productId !== ""
            ? products.find((p) => Number(p.id) === Number(form.productId))?.name ||
            form.productName
            : form.productName.trim(),
        uom: form.uom.trim(),
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice),
      };

      let res;
      if (mode === "create") {
        res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_BASE}/api/warehousemanager/receiving-items/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        if (data.errors) {
          setFormErrs(data.errors);
        } else {
          setFormErrs({ general: data.message || `HTTP ${res.status}` });
        }
        return;
      }

      await load();
      setShowModal(false);
    } catch (err) {
      setFormErrs({ general: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WarehouseLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div>
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item>
              <FontAwesomeIcon icon={faHome} href="/warehouse-dashboard" />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Manage Inbound</Breadcrumb.Item>
            <Breadcrumb.Item href="/warehouse-dashboard/receiving-slips">
              Receiving Slips
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Items</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Receiving Slip {id} - Items</h4>
          <p className="mb-0 text-muted">
            View and manage all products in this receiving slip.
          </p>
        </div>

        <div>
          <Button onClick={openCreate} className="btn btn-success btn-sm me-3">
            <FontAwesomeIcon icon={faPlus} className="me-1" />
            Add New Item
          </Button>

          <Link to="/warehouse-dashboard/receiving-slips" className="btn btn-outline-primary btn-sm">
            <FontAwesomeIcon icon={faArrowLeft} className="me-1" />
            Back to List
          </Link>
        </div>
      </div>

      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          {loading && <div className="text-center py-4">Loading items...</div>}
          {error && <div className="text-center text-danger py-4">Error: {error}</div>}

          {!loading && !error && (
            <Table hover className="align-items-center mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Product</th>
                  <th className="text-end">UoM</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Amount</th>
                  <th className="text-end">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No items found
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => (
                    <tr key={it.id}>
                      <td>{idx + 1}</td>
                      <td>{it.productName}</td>
                      <td className="text-end">{it.uom}</td>
                      <td className="text-end">{it.quantity}</td>
                      <td className="text-end">{fmt(it.unitPrice)}</td>
                      <td className="text-end">{fmt(it.total)}</td>
                      <td className="text-end">
                        <ButtonGroup size="sm">
                          <Button
                            variant="outline-primary"
                            onClick={() => handleEdit(it.id)}
                            title="Edit"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            onClick={() => handleDelete(it.id)}
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </Button>
                        </ButtonGroup>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {mode === "create" ? "Add Item" : `Edit Item #${editId}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formErrs.general && (
            <div className="alert alert-danger py-2">{formErrs.general}</div>
          )}
          <Form>
            <Row className="mb-3">
              <Col md={12} className="mb-2">
                <Form.Label className="mb-1">Select Product Input Method</Form.Label>
                <div>
                  <Form.Check
                    inline
                    type="radio"
                    id="mode-select"
                    label="Select from list"
                    name="productMode"
                    checked={productInputMode === "select"}
                    onChange={() => {
                      setProductInputMode("select");
                      const found = findProductById(form.productId);
                      if (found) setForm({ ...form, productName: found.name });
                    }}
                  />
                  <Form.Check
                    inline
                    type="radio"
                    id="mode-input"
                    label="Manual Input"
                    name="productMode"
                    checked={productInputMode === "input"}
                    onChange={() => setProductInputMode("input")}
                  />
                </div>
              </Col>

              <Col md={6}>
                <Form.Label>Product ID</Form.Label>
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
                    <option value="">-- Select product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.id} - {p.name}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  <Form.Control
                    type="number"
                    placeholder="Enter product ID manually"
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
              </Col>

              <Col md={6}>
                <Form.Label>UoM</Form.Label>
                <Form.Control
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                  placeholder="pcs / box / carton"
                />
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                value={form.productName}
                placeholder={
                  productInputMode === "input"
                    ? "Enter name if ID not in list"
                    : "Name auto-filled based on ID"
                }
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                disabled={productInputMode === "select" && !!findProductById(form.productId)}
                isInvalid={!!formErrs.productName}
              />
              <Form.Control.Feedback type="invalid">
                {formErrs.productName}
              </Form.Control.Feedback>
            </Form.Group>

            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  isInvalid={!!formErrs.quantity}
                />
                <Form.Control.Feedback type="invalid">
                  {formErrs.quantity}
                </Form.Control.Feedback>
              </Col>
              <Col md={6}>
                <Form.Label>Unit Price</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            <FontAwesomeIcon icon={faSave} className="me-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Modal>
    </WarehouseLayout>
  );
}
