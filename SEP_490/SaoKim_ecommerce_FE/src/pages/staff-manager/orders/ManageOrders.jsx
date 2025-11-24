// src/pages/staff-manager/orders/ManageOrders.jsx
import {
  faCheck,
  faCog,
  faHome,
  faSearch,
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
  Pagination,
  Spinner,
} from "@themesberg/react-bootstrap";
import { Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import StaffLayout from "../../../layouts/StaffLayout";
import useOrdersApi from "../api/useOrders";

export default function ManageOrders() {
  const { fetchOrders, updateOrderStatus, fetchOrderItems } = useOrdersApi();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [createdFrom, setCreatedFrom] = useState(null);
  const [createdTo, setCreatedTo] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // modal xem sản phẩm
  const [showOrderItemsModal, setShowOrderItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchOrders({
        q: debouncedSearch,
        status,
        createdFrom: createdFrom ? createdFrom.toISOString() : undefined,
        createdTo: createdTo ? createdTo.toISOString() : undefined,
        sortBy,
        sortDir,
        page,
        pageSize,
      });

      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
      setTotalPages(Math.max(1, Math.ceil(res.total / res.pageSize)));
    } catch (e) {
      console.error(e);
      alert("Không tải được danh sách đơn hàng");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedSearch,
    status,
    createdFrom,
    createdTo,
    page,
    pageSize,
    sortBy,
    sortDir,
  ]);

  const renderStatus = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Pending
        </Badge>
      );
    if (v === "shipping") return <Badge bg="info">Shipping</Badge>;
    if (v === "paid") return <Badge bg="primary">Paid</Badge>;
    if (v === "completed") return <Badge bg="success">Completed</Badge>;
    if (v === "cancelled") return <Badge bg="secondary">Cancelled</Badge>;
    return <Badge bg="secondary">{s || "Unknown"}</Badge>;
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await load();
    } catch (e) {
      console.error(e);
      alert("Không cập nhật được trạng thái đơn hàng");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleViewOrderItems = async (order) => {
    setSelectedOrder(order);
    setShowOrderItemsModal(true);
    setLoadingOrderItems(true);
    setSelectedOrderItems([]);

    try {
      const items = await fetchOrderItems(order.id); // dùng id
      setSelectedOrderItems(items);
    } catch (e) {
      console.error(e);
      alert("Không tải được danh sách sản phẩm của đơn hàng");
    } finally {
      setLoadingOrderItems(false);
    }
  };

  return (
    <StaffLayout>
      <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center py-4">
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
            <Breadcrumb.Item>Orders</Breadcrumb.Item>
            <Breadcrumb.Item active>Manage Orders</Breadcrumb.Item>
          </Breadcrumb>

          <h4>Manage Orders</h4>
        </div>
      </div>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Form.Label>Search</Form.Label>
              <InputGroup>
                <InputGroup.Text>
                  <FontAwesomeIcon icon={faSearch} />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Order ID, customer, email, phone"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </InputGroup>
            </Col>

            <Col md={2}>
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All</option>
                <option value="Pending">Pending</option>
                <option value="Shipping">Shipping</option>
                <option value="Paid">Paid</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </Form.Select>
            </Col>

            <Col md={2}>
              <Form.Label>Created from</Form.Label>
              <DatePicker
                selected={createdFrom}
                onChange={(date) => {
                  setCreatedFrom(date);
                  setPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/MM/yyyy"
                className="form-control"
                isClearable
              />
            </Col>

            <Col md={2}>
              <Form.Label>Created to</Form.Label>
              <DatePicker
                selected={createdTo}
                onChange={(date) => {
                  setCreatedTo(date);
                  setPage(1);
                }}
                dateFormat="dd/MM/yyyy"
                placeholderText="dd/MM/yyyy"
                className="form-control"
                isClearable
              />
            </Col>

            <Col md="auto" className="ms-auto">
              <Dropdown as={ButtonGroup}>
                <Dropdown.Toggle
                  split
                  as={Button}
                  variant="link"
                  className="text-dark m-0 p-0"
                >
                  <FontAwesomeIcon icon={faCog} />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Header>Show</Dropdown.Header>
                  {[10, 20, 30, 50].map((n) => (
                    <Dropdown.Item
                      key={n}
                      active={pageSize === n}
                      onClick={() => {
                        setPageSize(n);
                        setPage(1);
                      }}
                    >
                      {n}
                      {pageSize === n && (
                        <FontAwesomeIcon icon={faCheck} className="ms-2" />
                      )}
                    </Dropdown.Item>
                  ))}

                  <Dropdown.Divider />
                  <Dropdown.Header>Sort by</Dropdown.Header>

                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("created");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Created ↓
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("total");
                      setSortDir("desc");
                      setPage(1);
                    }}
                  >
                    Total ↓
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("status");
                      setSortDir("asc");
                      setPage(1);
                    }}
                  >
                    Status ↑
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setSortBy("customer");
                      setSortDir("asc");
                      setPage(1);
                    }}
                  >
                    Customer ↑
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body className="pt-0">
          <div className="d-flex justify-content-between mb-2">
            <div>Total: {total}</div>
            {loading && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Loading…</span>
              </div>
            )}
          </div>

          <Table hover className="mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, idx) => (
                <tr key={o.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>{o.id}</td>
                  <td>
                    <div>{o.customerName}</div>
                    <div className="small text-muted">
                      {o.customerEmail}{" "}
                      {o.customerPhone && ` / ${o.customerPhone}`}
                    </div>
                  </td>
                  <td>{(o.total ?? 0).toLocaleString("vi-VN")}đ</td>
                  <td>{renderStatus(o.status)}</td>
                  <td>{formatDate(o.createdAt)}</td>
                  <td className="text-end">
                    <Button
                      size="sm"
                      variant="outline-primary"
                      className="me-2"
                      onClick={() => handleViewOrderItems(o)}
                    >
                      View products
                    </Button>

                    {o.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        disabled={updatingOrderId === o.id}
                        onClick={() =>
                          handleUpdateOrderStatus(o.id, "Shipping")
                        }
                      >
                        {updatingOrderId === o.id
                          ? "Saving..."
                          : "Mark Shipping"}
                      </Button>
                    )}

                    {o.status === "Shipping" && (
                      <Button
                        size="sm"
                        variant="outline-success"
                        disabled={updatingOrderId === o.id}
                        onClick={() =>
                          handleUpdateOrderStatus(o.id, "Paid")
                        }
                      >
                        {updatingOrderId === o.id ? "Saving..." : "Mark Paid"}
                      </Button>
                    )}

                    {o.status === "Paid" && (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        disabled={updatingOrderId === o.id}
                        onClick={() =>
                          handleUpdateOrderStatus(o.id, "Completed")
                        }
                      >
                        {updatingOrderId === o.id
                          ? "Saving..."
                          : "Mark Completed"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
                    No data
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between align-items-center mt-3">
            <div>
              Page {page} / {totalPages}
            </div>
            <Pagination>
              <Pagination.First
                disabled={page <= 1}
                onClick={() => setPage(1)}
              />
              <Pagination.Prev
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              />
              {renderPageItems(page, totalPages, setPage)}
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
        </Card.Body>
      </Card>

      {/* Modal xem sản phẩm trong đơn hàng */}
      <Modal
        show={showOrderItemsModal}
        onHide={() => setShowOrderItemsModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Products in order #{selectedOrder?.id}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrderItems ? (
            <div className="d-flex align-items-center gap-2 my-3">
              <Spinner animation="border" size="sm" />
              <span>Loading products…</span>
            </div>
          ) : selectedOrderItems.length > 0 ? (
            <Table hover responsive size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderItems.map((item, index) => (
                  <tr key={item.orderItemId ?? index}>
                    <td>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{(item.unitPrice ?? 0).toLocaleString("vi-VN")}đ</td>
                    <td>{(item.lineTotal ?? 0).toLocaleString("vi-VN")}đ</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-muted">No products in this order</div>
          )}
        </Modal.Body>
      </Modal>
    </StaffLayout>
  );
}

function formatDate(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleString("vi-VN");
  } catch {
    return s;
  }
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
  const win = 2;

  const start = Math.max(1, current - win);
  const end = Math.min(total, current + win);

  if (start > 1) {
    items.push(
      <Pagination.Item key={1} onClick={() => onClick(1)}>
        1
      </Pagination.Item>
    );
    if (start > 2)
      items.push(<Pagination.Ellipsis disabled key="s-ellipsis" />);
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
      items.push(<Pagination.Ellipsis disabled key="e-ellipsis" />);
    items.push(
      <Pagination.Item key={total} onClick={() => onClick(total)}>
        {total}
      </Pagination.Item>
    );
  }

  return items;
}
