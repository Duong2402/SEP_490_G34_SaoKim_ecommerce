import { faHome, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Form,
  Row,
  Table,
  Pagination,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";
import useCustomersApi from "../api/useCustomers";
import { useNavigate } from "react-router-dom";

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();

  const {
    getCustomerById,
    fetchCustomerOrders, // dùng hàm này cho Recent Orders
    addCustomerNote,
    updateCustomerStatus,
  } = useCustomersApi();

  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  // Recent Orders state
  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize] = useState(5);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Notes
  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Status
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Load customer detail
  const loadCustomer = async () => {
    if (!customerId) return;
    setLoadingCustomer(true);
    try {
      const res = await getCustomerById(customerId);
      setCustomer(res);
    } catch (e) {
      console.error(e);
      alert("Không tải được thông tin khách hàng");
    } finally {
      setLoadingCustomer(false);
    }
  };

  // Load recent orders (lịch sử đơn hàng)
  const loadOrders = async () => {
    if (!customerId) return;
    setLoadingOrders(true);
    try {
      const res = await fetchCustomerOrders(customerId, {
        page: ordersPage,
        pageSize: ordersPageSize,
      });

      setOrders(res.items ?? []);
      const total = res.total ?? 0;
      const pageSize = res.pageSize ?? ordersPageSize;

      setOrdersTotal(total);
      setOrdersTotalPages(Math.max(1, Math.ceil(total / pageSize)));
    } catch (e) {
      console.error(e);
      alert("Không tải được đơn hàng");
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId, ordersPage, ordersPageSize]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim() || !customerId) return;

    setAddingNote(true);
    try {
      await addCustomerNote(customerId, noteContent.trim());
      setNoteContent("");
      await loadCustomer();
    } catch (error) {
      console.error(error);
      alert("Không thêm được ghi chú");
    } finally {
      setAddingNote(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!customer || !customerId) return;
    setUpdatingStatus(true);
    try {
      await updateCustomerStatus(customerId, !customer.isBanned);
      await loadCustomer();
    } catch (error) {
      console.error(error);
      alert("Không cập nhật được trạng thái khách hàng");
    } finally {
      setUpdatingStatus(false);
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
            <Breadcrumb.Item as={Link} to="/dashboard">
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item as={Link} to="/staff/manager-customers">
              Customers
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Customer Detail</Breadcrumb.Item>
          </Breadcrumb>
          <h4>
            <FontAwesomeIcon icon={faUser} className="me-2" />
            Customer Detail
          </h4>
          <Button
            variant="outline-secondary"
            className="mt-2"
            onClick={() => navigate("/staff/manager-customers")}
          >
            Back
          </Button>
        </div>
      </div>

      {loadingCustomer && (
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" />
        </div>
      )}

      {!loadingCustomer && customer && (
        <>
          {/* Profile + Metrics + Recent Orders */}
          <Row className="mb-4">
            <Col md={4}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-3">Profile</h5>

                  <p className="mb-1">
                    <strong>Name: </strong> {customer.name}
                  </p>
                  <p className="mb-1">
                    <strong>Email: </strong> {customer.email}
                  </p>
                  <p className="mb-1">
                    <strong>Phone: </strong> {customer.phoneNumber ?? "-"}
                  </p>
                  <p className="mb-1">
                    <strong>Address: </strong> {customer.address ?? "-"}
                  </p>
                  <p className="mb-1">
                    <strong>Created: </strong> {formatDate(customer.createAt)}
                  </p>
                  <p className="mb-1 d-flex align-items-center gap-2">
                    <strong>Status: </strong>{" "}
                    {customer.isBanned ? (
                      <Badge bg="secondary">Banned</Badge>
                    ) : (
                      <Badge bg="success">Active</Badge>
                    )}
                  </p>

                  <Button
                    size="sm"
                    className="mt-2"
                    variant={customer.isBanned ? "success" : "outline-danger"}
                    onClick={handleToggleStatus}
                    disabled={updatingStatus}
                  >
                    {updatingStatus
                      ? "Saving..."
                      : customer.isBanned
                      ? "Unban customer"
                      : "Ban customer"}
                  </Button>
                </Card.Body>
              </Card>
            </Col>

            <Col md={8}>
              {/* Metrics */}
              <Card className="shadow-sm mb-4">
                <Card.Body>
                  <h5 className="mb-3">Metrics</h5>
                  <Row>
                    <Col md={4}>
                      <div className="small text-muted">Total orders</div>
                      <div className="fs-4">{customer.ordersCount}</div>
                    </Col>
                    <Col md={4}>
                      <div className="small text-muted">Total spend</div>
                      <div className="fs-4">
                        {customer.totalSpend.toLocaleString("vi-VN")}đ
                      </div>
                    </Col>
                    <Col md={4}>
                      <div className="small text-muted">Last order</div>
                      <div className="fs-6">
                        {customer.lastOrderAt
                          ? formatDate(customer.lastOrderAt)
                          : "-"}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Recent Orders */}
              <Card className="mb-4 shadow-sm">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Recent Orders</span>
                    <small className="text-muted">Total: {ordersTotal}</small>
                  </div>
                </Card.Header>
                <Card.Body className="pt-0">
                  {loadingOrders && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Loading orders…</span>
                    </div>
                  )}

                  <Table hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, idx) => (
                        <tr key={o.orderId}>
                          {/* STT = offset theo page + index trong trang */}
                          <td>{(ordersPage - 1) * ordersPageSize + idx + 1}</td>
                          <td>{(o.total ?? 0).toLocaleString("vi-VN")}đ</td>
                          <td>{o.status}</td>
                          <td>{formatDate(o.createdAt)}</td>
                          <td className="text-end">
                            {/*Nếu có màn invoice detail:
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={() =>
                                navigate(`/staff/invoices/${o.orderId}`)
                              }
                            >
                              View
                            </Button>*/}
                          </td>
                        </tr>
                      ))}

                      {!loadingOrders && orders.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center text-muted py-3"
                          >
                            No orders
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>

                  {ordersTotalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        Page {ordersPage} / {ordersTotalPages}
                      </div>
                      <Pagination className="mb-0">
                        <Pagination.First
                          disabled={ordersPage <= 1}
                          onClick={() => setOrdersPage(1)}
                        />
                        <Pagination.Prev
                          disabled={ordersPage <= 1}
                          onClick={() =>
                            setOrdersPage((p) => Math.max(1, p - 1))
                          }
                        />
                        <Pagination.Next
                          disabled={ordersPage >= ordersTotalPages}
                          onClick={() =>
                            setOrdersPage((p) =>
                              Math.min(ordersTotalPages, p + 1)
                            )
                          }
                        />
                        <Pagination.Last
                          disabled={ordersPage >= ordersTotalPages}
                          onClick={() => setOrdersPage(ordersTotalPages)}
                        />
                      </Pagination>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Notes */}
          <Row>
            <Col md={12}>
              <Card className="shadow-sm">
                <Card.Body>
                  <h5 className="mb-3">Internal Notes</h5>

                  <Form onSubmit={handleAddNote} className="mb-3">
                    <Row className="g-2">
                      <Col md={10}>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Only staff can see these notes"
                        />
                      </Col>
                      <Col md={2}>
                        <Button
                          type="submit"
                          className="w-100"
                          disabled={addingNote || !noteContent.trim()}
                        >
                          {addingNote ? "Saving..." : "Add Note"}
                        </Button>
                      </Col>
                    </Row>
                  </Form>

                  {customer.notes && customer.notes.length > 0 ? (
                    <Table hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>Staff</th>
                          <th>Content</th>
                          <th>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.notes.map((n) => (
                          <tr key={n.id}>
                            <td>{n.staffName}</td>
                            <td>{n.content}</td>
                            <td>{formatDateTime(n.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-muted">No notes yet</div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </StaffLayout>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleDateString("vi-VN");
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return "-";
  try {
    return new Date(dateStr).toLocaleString("vi-VN");
  } catch {
    return dateStr;
  }
}
