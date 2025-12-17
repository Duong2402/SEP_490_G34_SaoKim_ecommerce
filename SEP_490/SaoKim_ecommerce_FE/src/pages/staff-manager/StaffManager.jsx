
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
  Pagination,
  Row,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Modal } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import StaffLayout from "../../layouts/StaffLayout";
import AddProductForm from "./products/AddProductForm";
import ConfirmDeleteModal from "./products/ConfirmDeleteModal";
import EditProductForm from "./products/EditProductForm";
import useProductsApi from "./api/useProducts";

export default function ManageProduct() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("id");
  const [sortDir, setSortDir] = useState("asc");

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingTable, setLoadingTable] = useState(false);

  const { fetchProducts, deleteProduct, fetchProduct } = useProductsApi();
  const debouncedSearch = useDebounce(search, 400);
  const navigate = useNavigate();

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

      if (res?.page && res.page !== page) setPage(res.page);
      if (res?.pageSize && res.pageSize !== pageSize) setPageSize(res.pageSize);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, pageSize, sortBy, sortDir]);

  const onChangeSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleReload = async () => {
    await load();
    if (page > 1 && rows.length === 1 && total > 0) {
      const newPage = Math.max(1, page - 1);
      if (newPage !== page) {
        setPage(newPage);
      }
    }
  };

  const normalizeStatus = (status) =>
    String(status || "")
      .trim()
      .toLowerCase();

  const renderStatus = (status) => {
    const s = normalizeStatus(status);

    if (s === "active") {
      return (
        <Badge bg="success" text="white">
          Đang hiển thị
        </Badge>
      );
    }

    if (s === "inactive") {
      return (
        <Badge bg="secondary" text="white">
          Ngừng bán
        </Badge>
      );
    }

    return (
      <Badge bg="light" text="dark">
        {status || "Không xác định"}
      </Badge>
    );
  };

  const handleStartEdit = async (row) => {
    try {
      const res = await fetchProduct(row.id);
      const detail = res?.product || {};
      setEditing({
        ...row,
        ...detail,
      });
    } catch (e) {
      console.error(e);
      setEditing(row);
    }
  };

  return (
    <StaffLayout>
      <div className="staff-page-header">
        <div>
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item
              linkAs={Link}
              linkProps={{ to: "/staff/manager-dashboard" }}
            >
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item>Sản phẩm</Breadcrumb.Item>
            <Breadcrumb.Item active>Quản lý sản phẩm</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="staff-page-title">Quản lý sản phẩm</h4>
          <p className="staff-page-lead">
            Tạo, chỉnh sửa và duy trì danh mục hàng hóa
          </p>
        </div>

        <div className="staff-panel__actions">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowCreate(true)}
          >
            <FontAwesomeIcon icon={faPlus} className="me-2" />
            Thêm sản phẩm
          </Button>
        </div>
      </div>

      <div className="staff-panel">
        <Row className="justify-content-between g-3 align-items-end">
          <Col xs={12} md={6} lg={5} xl={4}>
            <Form.Label>Tìm kiếm</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Tên, SKU hoặc danh mục"
                value={search}
                onChange={onChangeSearch}
              />
            </InputGroup>
          </Col>

          <Col xs="auto" className="text-end">
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
                <Dropdown.Header>Hiển thị</Dropdown.Header>
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
                    {n} dòng
                    {pageSize === n && (
                      <span className="icon icon-small ms-auto">
                        <FontAwesomeIcon icon={faCheck} />
                      </span>
                    )}
                  </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Header>Sắp xếp</Dropdown.Header>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("id");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  ID tăng dần
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("id");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  ID giảm dần
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("created");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Ngày tạo mới nhất
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("name");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Tên A → Z
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("price");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Giá cao xuống thấp
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </Col>
        </Row>
      </div>

      <Card className="staff-panel table-responsive">
        <Card.Body className="pt-0">
          <div className="staff-table__summary">
            <div>Tổng số: {total}</div>
            {loadingTable && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Đang tải...</span>
              </div>
            )}
          </div>

          <Table hover className="align-items-center mb-0">
            <thead>
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>ID</th>
                <th>Ảnh</th>
                <th>SKU</th>
                <th>Tên sản phẩm</th>
                <th>Danh mục</th>
                <th className="text-end">Giá</th>
                <th>Trạng thái</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((p) => {
                const inProject = !!p.inProject;
                const canDelete = !inProject;

                return (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>
                      {p.image ? (
                        <img
                          src={p.image}
                          alt={p.name}
                          style={{
                            width: 48,
                            height: 48,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid #e0e0e0",
                            backgroundColor: "#f8f9fa",
                          }}
                        />
                      ) : (
                        <span className="text-muted small">Chưa có ảnh</span>
                      )}
                    </td>
                    <td>{p.sku}</td>
                    <td>{p.name}</td>
                    <td>{p.category}</td>
                    <td className="text-end">
                      {(p.price ?? 0).toLocaleString("vi-VN")} ₫
                    </td>
                    <td>{renderStatus(p.status)}</td>
                    <td className="text-end">
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        title="Xem chi tiết"
                        onClick={() =>
                          navigate(`/staff/manager-products/${p.id}`)
                        }
                      >
                        <FontAwesomeIcon icon={faEye} className="text-primary" />
                      </Button>

                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        title="Chỉnh sửa"
                        onClick={() => handleStartEdit(p)}
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </Button>

                      <Button
                        variant={
                          canDelete ? "outline-danger" : "outline-secondary"
                        }
                        size="sm"
                        title={
                          canDelete
                            ? "Xóa sản phẩm"
                            : "Sản phẩm đang được sử dụng trong dự án, không thể xóa"
                        }
                        disabled={!canDelete}
                        onClick={() => {
                          if (canDelete) setDeleting(p);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {!loadingTable && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-4">
                    Chưa có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Trang {page} / {totalPages}
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

          <Modal
            show={showCreate}
            onHide={() => setShowCreate(false)}
            centered
            dialogClassName="staff-modal"
          >
            <Modal.Header closeButton>
              <Modal.Title className="staff-modal__title">
                Thêm sản phẩm
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <AddProductForm
                onCancel={() => setShowCreate(false)}
                onSuccess={() => {
                  setShowCreate(false);
                  load({ page: 1 });
                }}
              />
            </Modal.Body>
          </Modal>

          <Modal
            show={!!editing}
            onHide={() => setEditing(null)}
            centered
            size="lg"
            dialogClassName="staff-modal"
          >
            <Modal.Header closeButton>
              <Modal.Title className="staff-modal__title">
                Chỉnh sửa sản phẩm
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {editing && (
                <EditProductForm
                  id={editing.id}
                  initial={{
                    sku: editing.sku,
                    name: editing.name,
                    categoryId: editing.categoryId,
                    unit: editing.unit,
                    price: editing.price,
                    stock: editing.stock ?? editing.quantity ?? 0,
                    active:
                      editing.status === "Active" || editing.active === true,
                    description: editing.description,
                    supplier: editing.supplier,
                    note: editing.note,
                    updateAt: editing.updateAt,
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

          <ConfirmDeleteModal
            show={!!deleting}
            title="Xóa sản phẩm"
            message={
              deleting
                ? `Bạn có chắc muốn xóa “${deleting.name}”? Thao tác này không thể hoàn tác.`
                : ""
            }
            confirmText="Xóa"
            cancelText="Hủy"
            loading={false}
            onClose={() => setDeleting(null)}
            onConfirm={async () => {
              if (!deleting) return;
              try {
                await deleteProduct(deleting.id);
                setDeleting(null);
                await handleReload();
              } catch (err) {
                alert("Xóa sản phẩm thất bại: " + err.message);
              }
            }}
          />
        </Card.Body>
      </Card>
    </StaffLayout>
  );
}

function useDebounce(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function renderPageItems(current, total, onClick) {
  const items = [];
  const windowSize = 2;
  const start = Math.max(1, current - windowSize);
  const end = Math.min(total, current + windowSize);

  if (start > 1) {
    items.push(
      <Pagination.Item key={1} onClick={() => onClick(1)}>
        1
      </Pagination.Item>
    );
    if (start > 2)
      items.push(<Pagination.Ellipsis key="start-ellipsis" disabled />);
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
    if (end < total - 1)
      items.push(<Pagination.Ellipsis key="end-ellipsis" disabled />);
    items.push(
      <Pagination.Item key={total} onClick={() => onClick(total)}>
        {total}
      </Pagination.Item>
    );
  }

  return items;
}
