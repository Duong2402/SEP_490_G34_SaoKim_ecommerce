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

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState("create");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: "",
    productName: "",
    uom: "cái",
    quantity: 1,
    unitPrice: 0
  });
  const [editId, setEditId] = useState(null);
  const [formErr, setFormErr] = useState("");

  // Load items
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
      setProducts(data.items || []);
    } catch (e) {
      console.error("Error loading products:", e);
    }
  }

  // Delete
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
    setFormErr("");
    setForm({
      productId: "",
      productName: "",
      uom: "cái",
      quantity: 1,
      unitPrice: 0
    });
    setShowModal(true);
  };


  const handleEdit = (itemId) => {
    const it = items.find(x => x.id === itemId);
    if (!it) return;
    setMode("edit");
    setEditId(itemId);
    setFormErr("");
    setForm({
      productId: it.productId ?? "",
      productName: it.productName ?? "",
      uom: it.uom ?? "cái",
      quantity: it.quantity ?? 1,
      unitPrice: it.unitPrice ?? 0
    });
    setShowModal(true);
  };

  const handleProductIdChange = (e) => {
    const newIdStr = e.target.value;
    const newIdNum = Number(newIdStr);

    const selectedProduct = products.find(p => p.id === newIdNum);

    if (selectedProduct) {
      setForm({
        ...form,
        productId: newIdStr,
        productName: selectedProduct.name ?? `Product ${newIdNum}`
      });
    } else {
      setForm({
        ...form,
        productId: newIdStr
      });
    }
  };

  // Validate form
  function validate() {
    if (form.productId === "" && !form.productName?.trim()) {
      return "Vui lòng chọn một sản phẩm hoặc nhập tên sản phẩm mới.";
    }
    if (!form.uom?.trim()) return "UoM is required";
    const q = Number(form.quantity);
    if (!Number.isFinite(q) || q <= 0) return "Quantity must be > 0";
    const up = Number(form.unitPrice);
    if (!Number.isFinite(up) || up < 0) return "Unit price cannot be negative";
    return "";
  }

  // Save (create or edit)
  const handleSave = async () => {
    const v = validate();
    if (v) { setFormErr(v); return; }

    setSaving(true);
    setFormErr("");
    try {
      const payload = {
        productId: form.productId === "" ? null : Number(form.productId),
        productName: form.productId !== ""
          ? products.find(p => p.id === Number(form.productId))?.name || form.productName
          : form.productName.trim(),
        uom: form.uom.trim(),
        quantity: Number(form.quantity),
        unitPrice: Number(form.unitPrice)
      };

      let res;
      if (mode === "create") {
        // POST /receiving-slips/{id}/items
        res = await fetch(`${API_BASE}/api/warehousemanager/receiving-slips/${id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // PUT /receiving-items/{itemId}
        res = await fetch(`${API_BASE}/api/warehousemanager/receiving-items/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const text = await res.text();
      if (!res.ok) {
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Refresh list
      await load();
      setShowModal(false);
    } catch (err) {
      setFormErr(err.message || "Save failed");
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
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Manage Inbound</Breadcrumb.Item>
            <Breadcrumb.Item href="/receiving-slips">
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

          <Link to="/receiving-slips" className="btn btn-outline-primary btn-sm">
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
                  <th className="text-end">Total</th>
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

      {/* Modal Create/Edit */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {mode === "create" ? "Add Item" : `Edit Item #${editId}`}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {formErr && (
            <div className="alert alert-danger py-2">{formErr}</div>
          )}
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Product</Form.Label>
                <Form.Select
                  value={form.productId || "other"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "other") {
                      setForm({ ...form, productId: "", productName: "" });
                    } else {
                      const selectedProduct = products.find(p => p.id === Number(val));
                      setForm({
                        ...form,
                        productId: val,
                        productName: selectedProduct?.name || ""
                      });
                    }
                  }}
                >
                  <option value="other">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} - {p.name}
                    </option>
                  ))}
                  <option value="other">Other (enter manually)</option>
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>UoM</Form.Label>
                <Form.Control
                  value={form.uom}
                  onChange={(e) => setForm({ ...form, uom: e.target.value })}
                  placeholder="pc / box / carton"
                />
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Product Name</Form.Label>
              <Form.Control
                type="text"
                value={form.productName}
                placeholder="Enter product name if not in list"
                onChange={(e) => setForm({ ...form, productName: e.target.value })}
                disabled={form.productId !== ""}
              />
            </Form.Group>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Label>Quantity</Form.Label>
                <Form.Control
                  type="number"
                  min={1}
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
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


