import {
  faCheck,
  faCog,
  faEdit,
  // faEye,
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
  Pagination, // <— thêm
  Spinner,    // <— thêm (nếu muốn hiển thị loading)
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import AddProductForm from "./products/AddProductForm";
import ConfirmDeleteModal from "./products/ConfirmDeleteModal";
import EditProductForm from "./products/EditProductForm";
import useProductsApi from "./api/useProducts";

export default function ManageProduct() {
  // bộ lọc/sort/phân trang
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc"); // hoặc "desc"

  // dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // data cục bộ cho bảng
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingTable, setLoadingTable] = useState(false);

  // dùng action từ hook
  const { fetchProducts, deleteProduct } = useProductsApi();

  // debounce search
  const debouncedSearch = useDebounce(search, 400);

  // tải dữ liệu server-side
  const load = async (opts) => {
    setLoadingTable(true);
    try {
      const res = await fetchProducts({
        q: opts?.q ?? debouncedSearch,
        page: opts?.page ?? page,
        pageSize: opts?.pageSize ?? pageSize,
        sortBy: opts?.sortBy ?? sortBy,
        sortDir: opts?.sortDir ?? sortDir,
      });
      setRows(res?.items ?? []);
      setTotal(res?.total ?? 0);
      setTotalPages(res?.totalPages ?? 1);

      // đồng bộ lại page/pageSize nếu BE trả về khác (phòng trường hợp BE chuẩn hóa)
      if (res?.page && res.page !== page) setPage(res.page);
      if (res?.pageSize && res.pageSize !== pageSize) setPageSize(res.pageSize);
    } catch (e) {
      // có thể hiển thị toast/alert
      console.error(e);
    } finally {
      setLoadingTable(false);
    }
  };

  // lần đầu hoặc khi các tham số thay đổi
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize, sortBy, sortDir]);

  // khi gõ search thì luôn reset page về 1
  const onChangeSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  // reload sau khi tạo/sửa/xóa
  const handleReload = async () => {
    // nếu vừa xóa khiến trang hiện tại > totalPages mới -> lùi 1 trang
    await load();
    if (page > 1 && rows.length === 1 && total > 0) {
      // sau khi load xong, nếu trang rỗng do vừa xóa bản ghi cuối, lùi trang và load lại
      const newPage = Math.max(1, page - 1);
      if (newPage !== page) {
        setPage(newPage);
        // load sẽ tự chạy lại do useEffect phụ thuộc page
      }
    }
  };

  // hiển thị nhãn trạng thái
  const renderStatus = (s) =>
    s === "Active" ? (
      <Badge bg="success" text="white">
        Active
      </Badge>
    ) : (
      <Badge bg="secondary" text="white">
        Inactive
      </Badge>
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
          <p className="mb-0">Create, edit, manage product lists</p>
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
                onChange={onChangeSearch}
              />
            </InputGroup>
          </Col>

            {/* Page size + sort */}
          <Col xs="auto" className="ps-md-0 text-end">
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
                <Dropdown.Header>Show</Dropdown.Header>
                {[10, 20, 30, 50].map((n) => (
                  <Dropdown.Item
                    key={n}
                    className="d-flex fw-bold"
                    active={pageSize === n}
                    onClick={() => {
                      setPageSize(n);
                      setPage(1);
                    }}
                  >
                    {n}
                    {pageSize === n && (
                      <span className="icon icon-small ms-auto">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                  </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Header>Sort by</Dropdown.Header>
                <Dropdown.Item onClick={() => { setSortBy("id"); setSortDir("asc"); setPage(1); }}>
                  ID ↑
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("id"); setSortDir("desc"); setPage(1); }}>
                  ID ↓
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("created"); setSortDir("desc"); setPage(1); }}>
                  Created ↓
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("name"); setSortDir("asc"); setPage(1); }}>
                  Name ↑
                </Dropdown.Item>
                <Dropdown.Item onClick={() => { setSortBy("price"); setSortDir("desc"); setPage(1); }}>
                  Price ↓
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      {/* Table */}
      <Card border="light" className="table-wrapper table-responsive shadow-sm">
        <Card.Body className="pt-0">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>Total: {total}</div>
            {loadingTable && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Loading…</span>
              </div>
            )}
          </div>

          <Table hover className="user-table align-items-center mb-0">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>ID</th>
                <th>SKU</th>
                <th>Name</th>
                <th>Category</th>
                <th className="text-end">Price</th>
                <th className="text-end">Stock</th>
                <th>Status</th>
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
                    {(p.price ?? 0).toLocaleString("vi-VN")}đ
                  </td>
                  <td className="text-end">{p.stock}</td>
                  <td>{renderStatus(p.status)}</td>
                  <td className="text-end">
                    {/* icon mat */}
                    {/* <Button
                      variant="outline-info"
                      size="sm"
                      className="me-2"
                      title="View"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Button> */}
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

              {!loadingTable && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Page {page} / {totalPages}
            </div>
            <Pagination className="mb-0">
              <Pagination.First
                disabled={page <= 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />

              {/* hiển thị dải trang ngắn gọn */}
              {renderPageItems(page, totalPages, (p) => setPage(p))}

              <Pagination.Next
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
              <Pagination.Last
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              />
            </Pagination>
          </div>

          {/* Create */}
          <Modal show={showCreate} onHide={() => setShowCreate(false)} centered>
            <Modal.Header closeButton>
              <Modal.Title>Create Product</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <AddProductForm
                onCancel={() => setShowCreate(false)}
                onSuccess={() => {
                  setShowCreate(false);
                  // sau khi tạo mới quay về page 1 để thấy item mới nhất nếu sort id desc
                  // hoặc chỉ cần reload trang hiện tại
                  load({ page: 1 });
                }}
              />
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
                  onSuccess={() => {
                    setEditing(null);
                    load();
                  }}
                />
              )}
            </Modal.Body>
          </Modal>

          {/* Delete */}
          <ConfirmDeleteModal
            show={!!deleting}
            title="Delete Product"
            message={
              deleting
                ? `Are you sure you want to delete "${deleting.name}"? This action cannot be undone.`
                : ""
            }
            confirmText="Delete"
            cancelText="Cancel"
            loading={false}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              if (!deleting) return;
              try {
                await deleteProduct(deleting.id);
                setDeleting(null);
                await handleReload();
              } catch (err) {
                alert("Delete failed: " + err.message);
              }
            }}
          />
        </Card.Body>
      </Card>
    </StaffLayout>
  );
}

/** Hook debounce ngắn gọn */
function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/** Render các nút trang: hiện quanh trang hiện tại */
function renderPageItems(current, total, onClick) {
  const items = [];
  const window = 2; // số trang hai bên
  const start = Math.max(1, current - window);
  const end = Math.min(total, current + window);

  if (start > 1) {
    items.push(
      <Pagination.Item key={1} onClick={() => onClick(1)}>
        1
      </Pagination.Item>
    );
    if (start > 2) items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
  }

  for (let p = start; p <= end; p++) {
    items.push(
      <Pagination.Item
        key={p}
        active={p === current}
        onClick={() => onClick(p)}
      >
        {p}
      </Pagination.Item>
    );
  }

  if (end < total) {
    if (end < total - 1) items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    items.push(
      <Pagination.Item key={total} onClick={() => onClick(total)}>
        {total}
      </Pagination.Item>
    );
  }

  return items;
}
