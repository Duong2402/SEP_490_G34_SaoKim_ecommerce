import {
  faCheck,
  faCog,
  faEdit,
  faEye,
  faHome,
  faPlus,
  faSearch,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Breadcrumb,
  Button,
  ButtonGroup,
  Card,
  Col,
  Dropdown,
  Form,
  InputGroup,
  Row,
  Table,
} from "@themesberg/react-bootstrap";
import { useState } from "react";
import { Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import AddProductForm from "./products/AddProductForm";
import ConfirmDeleteModal from "./products/ConfirmDeleteModal";
import EditProductForm from "./products/EditProductForm";

const mockProducts = [
  {
    id: 1,
    sku: "LED10W-WH",
    name: "Bóng đèn LED 10W",
    category: "Đèn",
    price: 50000,
    stock: 120,
    status: "Active",
    createdAt: "2025-10-20",
  },
  {
    id: 2,
    sku: "LED20W-WH",
    name: "Bóng đèn LED 20W",
    category: "Đèn",
    price: 89000,
    stock: 45,
    status: "Active",
    createdAt: "2025-10-22",
  },
  {
    id: 3,
    sku: "SW-2WAY",
    name: "Công tắc 2 chiều",
    category: "Công tắc",
    price: 75000,
    stock: 0,
    status: "Inactive",
    createdAt: "2025-10-18",
  },
];

export default function ManageProduct() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  // UI-only: lọc tạm thời trên mảng mock để hiển thị
  const rows = mockProducts.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <StaffLayout>
      {/* Header */}
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
        <div className="d-block mb-4 mb-md-0">
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item as={Link} to="/dashboard">
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Products</Breadcrumb.Item>
            <Breadcrumb.Item active>Manage Product</Breadcrumb.Item>
          </Breadcrumb>
          <h4>Manage Product</h4>
          <p className="mb-0">Tạo, chỉnh sửa, quản lý danh sách sản phẩm.</p>
        </div>

        <div className="btn-toolbar mb-2 mb-md-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Create Product
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="table-settings mb-4">
        <Row className="justify-content-between align-items-center">
          <Col xs={12} md={6} lg={5} xl={4}>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by name, SKU or category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </InputGroup>
          </Col>

          <Col xs={4} md={2} xl={1} className="ps-md-0 text-end">
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle
                split
                as={Button}
                variant="link"
                className="text-dark m-0 p-0"
              >
                <span className="icon icon-sm icon-gray">
                  <FontAwesomeIcon icon={faCog} />
                </span>
              </Dropdown.Toggle>
              <Dropdown.Menu className="dropdown-menu-xs dropdown-menu-right">
                <Dropdown.Item className="fw-bold text-dark">
                  Show
                </Dropdown.Item>
                <Dropdown.Item className="d-flex fw-bold">
                  10{" "}
                  <span className="icon icon-small ms-auto">
                    <FontAwesomeIcon icon={faCheck} />
                  </span>
                </Dropdown.Item>
                <Dropdown.Item className="fw-bold">20</Dropdown.Item>
                <Dropdown.Item className="fw-bold">30</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          <Table hover className="user-table align-items-center mb-0">
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th className="text-end">Price</th>
                <th className="text-end">Stock</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.sku}</td>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td className="text-end">
                    {p.price.toLocaleString("vi-VN")}đ
                  </td>
                  <td className="text-end">{p.stock}</td>
                  <td>
                    {p.status === "Active" ? (
                      <Badge bg="success" text="white">
                        Active
                      </Badge>
                    ) : (
                      <Badge bg="secondary" text="white">
                        Inactive
                      </Badge>
                    )}
                  </td>
                  <td>{new Date(p.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="text-end">
                    <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2"
                      title="View"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Button>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-2"
                      title="Edit"
                      onClick={() => setEditing(p)}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      title="Delete"
                      onClick={() => setDeleting(p)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          {/* Create */}
          <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Create Product</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <AddProductForm onCancel={() => setShowCreate(false)} />
            </Modal.Body>
          </Modal>

          {/* Edit */}
          <Modal show={!!editing} onHide={() => setEditing(null)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Edit Product</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {editing && (
                <EditProductForm
                  id={editing.id}
                  initial={{
                    sku: editing.sku,
                    name: editing.name,
                    category: editing.category,
                    price: editing.price,
                    stock: editing.stock,
                    active: editing.status === "Active" || editing.active,
                  }}
                  onCancel={() => setEditing(null)}
                />
              )}
            </Modal.Body>
          </Modal>

          {/* Delete */}
          <ConfirmDeleteModal
            show={!!deleting}
            onClose={() => setDeleting(null)}
            onConfirm={() => {
              console.log("Deleting", deleting?.id);
              setDeleting(null);
            }}
            title="Delete Product"
            message={
              deleting
                ? `Delete "${deleting.name}"? This cannot be undone.`
                : ""
            }
          />

          
        </Card.Body>
      </Card>
    </StaffLayout>
  );
}
