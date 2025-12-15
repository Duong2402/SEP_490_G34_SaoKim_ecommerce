
import { faHome, faUser } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Form,
  Pagination,
  Row,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";
import useCustomersApi from "../api/useCustomers";

export default function CustomerDetail() {
  const { id } = useParams();
  const customerId = Number(id);
  const navigate = useNavigate();

  const {
    getCustomerById,
    fetchCustomerOrders,
    addCustomerNote,
    updateCustomerNote,
    deleteCustomerNote,
  } = useCustomersApi();

  const [customer, setCustomer] = useState(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  const [orders, setOrders] = useState([]);
  const [ordersTotal, setOrdersTotal] = useState(0);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize] = useState(5);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [noteContent, setNoteContent] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingContent, setEditingContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

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

  const handleStartEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditingContent(note.content);
  };

  const handleCancelEditNote = () => {
    setEditingNoteId(null);
    setEditingContent("");
    setSavingEdit(false);
  };

  const handleSaveEditNote = async (noteId) => {
    if (!editingContent.trim()) {
      alert("Nội dung ghi chú không được để trống");
      return;
    }
    if (!customerId) return;

    setSavingEdit(true);
    try {
      await updateCustomerNote(customerId, noteId, editingContent.trim());
      await loadCustomer();
      handleCancelEditNote();
    } catch (error) {
      console.error(error);
      alert("Không cập nhật được ghi chú");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Bạn chắc chắn muốn xóa ghi chú này?")) return;
    if (!customerId) return;

    setDeletingNoteId(noteId);
    try {
      await deleteCustomerNote(customerId, noteId);
      await loadCustomer();
    } catch (error) {
      console.error(error);
      alert("Không xóa được ghi chú");
    } finally {
      setDeletingNoteId(null);
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
            <Breadcrumb.Item as={Link} to="/staff/manager-dashboard">
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>
            <Breadcrumb.Item as={Link} to="/staff/manager-customers">
              Khách hàng
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Hồ sơ khách hàng</Breadcrumb.Item>
          </Breadcrumb>
          <h4 className="staff-page-title">
            <FontAwesomeIcon icon={faUser} className="me-2" />
            Hồ sơ khách hàng
          </h4>
          <Button variant="outline-secondary" className="mt-2" onClick={() => navigate("/staff/manager-customers")}>
            Quay lại
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
          <Row className="mb-4 g-3">
            <Col xs={12} md={4}>
              <Card className="staff-panel">
                <Card.Body>
                  <h5 className="mb-3">Thông tin</h5>

                  <p className="mb-1">
                    <strong>Tên: </strong> {customer.name}
                  </p>
                  <p className="mb-1">
                    <strong>Email: </strong> {customer.email}
                  </p>
                  <p className="mb-1">
                    <strong>SĐT: </strong> {customer.phoneNumber ?? "-"}
                  </p>
                  <p className="mb-1">
                    <strong>Địa chỉ: </strong> {customer.address ?? "-"}
                  </p>
                  <p className="mb-1">
                    <strong>Ngày tạo: </strong> {formatDate(customer.createAt)}
                  </p>
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} md={8}>
              <Card className="staff-panel mb-4">
                <Card.Body>
                  <h5 className="mb-3">Chỉ số</h5>
                  <Row className="g-3">
                    <Col xs={12} md={4}>
                      <div className="small text-muted">Tổng đơn</div>
                      <div className="fs-4">{customer.ordersCount}</div>
                    </Col>
                    <Col xs={12} md={4}>
                      <div className="small text-muted">Tổng chi tiêu</div>
                      <div className="fs-4">{customer.totalSpend.toLocaleString("vi-VN")} ₫</div>
                    </Col>
                    <Col xs={12} md={4}>
                      <div className="small text-muted">Đơn gần nhất</div>
                      <div className="fs-6">
                        {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "-"}
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              <Card className="staff-panel mb-4">
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <span>Đơn hàng gần đây</span>
                    <small className="text-muted">Tổng: {ordersTotal}</small>
                  </div>
                </Card.Header>
                <Card.Body className="pt-0">
                  {loadingOrders && (
                    <div className="d-flex align-items-center gap-2 my-3">
                      <Spinner animation="border" size="sm" />
                      <span>Đang tải đơn hàng...</span>
                    </div>
                  )}

                  <Table hover responsive className="mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tổng tiền</th>
                        <th>Trạng thái</th>
                        <th>Ngày tạo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((o, idx) => (
                        <tr key={o.orderId}>
                          <td>{(ordersPage - 1) * ordersPageSize + idx + 1}</td>
                          <td>{(o.total ?? 0).toLocaleString("vi-VN")} ₫</td>
                          <td>
                            <StatusBadge status={o.status} />
                          </td>
                          <td>{formatDate(o.createdAt)}</td>
                        </tr>
                      ))}

                      {!loadingOrders && orders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="text-center text-muted py-3">
                            Chưa có đơn hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>

                  {ordersTotalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div>
                        Trang {ordersPage} / {ordersTotalPages}
                      </div>
                      <Pagination className="mb-0">
                        <Pagination.First disabled={ordersPage <= 1} onClick={() => setOrdersPage(1)} />
                        <Pagination.Prev
                          disabled={ordersPage <= 1}
                          onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                        />
                        <Pagination.Next
                          disabled={ordersPage >= ordersTotalPages}
                          onClick={() => setOrdersPage((p) => Math.min(ordersTotalPages, p + 1))}
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

          <Row>
            <Col md={12}>
              <Card className="staff-panel">
                <Card.Body>
                  <h5 className="mb-3">Ghi chú nội bộ</h5>

                  <Form onSubmit={handleAddNote} className="mb-3">
                    <Row className="g-2">
                      <Col xs={12} md={10}>
                        <Form.Control
                          as="textarea"
                          rows={2}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Chỉ nhân viên mới thấy ghi chú này"
                        />
                      </Col>
                      <Col xs={12} md={2}>
                        <Button type="submit" className="w-100" disabled={addingNote || !noteContent.trim()}>
                          {addingNote ? "Đang lưu..." : "Thêm ghi chú"}
                        </Button>
                      </Col>
                    </Row>
                  </Form>

                  {customer.notes && customer.notes.length > 0 ? (
                    <Table hover responsive size="sm">
                      <thead>
                        <tr>
                          <th>Nhân viên</th>
                          <th>Nội dung</th>
                          <th>Thời gian</th>
                          <th className="text-end">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.notes.map((n) => (
                          <tr key={n.id}>
                            <td>{n.staffName}</td>
                            <td style={{ maxWidth: 500 }}>
                              {editingNoteId === n.id ? (
                                <Form.Control
                                  as="textarea"
                                  rows={2}
                                  value={editingContent}
                                  onChange={(e) => setEditingContent(e.target.value)}
                                />
                              ) : (
                                n.content
                              )}
                            </td>
                            <td>{formatDateTime(n.createdAt)}</td>
                            <td className="text-end">
                              {editingNoteId === n.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="success"
                                    className="me-2"
                                    disabled={savingEdit}
                                    onClick={() => handleSaveEditNote(n.id)}
                                  >
                                    {savingEdit ? "Đang lưu..." : "Lưu"}
                                  </Button>
                                  <Button size="sm" variant="outline-secondary" onClick={handleCancelEditNote}>
                                    Hủy
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline-primary"
                                    className="me-2"
                                    onClick={() => handleStartEditNote(n)}
                                  >
                                    Sửa
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline-danger"
                                    disabled={deletingNoteId === n.id}
                                    onClick={() => handleDeleteNote(n.id)}
                                  >
                                    {deletingNoteId === n.id ? "Đang xóa..." : "Xóa"}
                                  </Button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  ) : (
                    <div className="text-muted">Chưa có ghi chú</div>
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

function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  if (s === "pending")
    return (
      <Badge bg="warning" text="dark">
        Chờ xử lý
      </Badge>
    );
  if (s === "shipping") return <Badge bg="info">Đang giao</Badge>;
  if (s === "paid") return <Badge bg="primary">Đã thanh toán</Badge>;
  if (s === "completed") return <Badge bg="success">Hoàn tất</Badge>;
  if (s === "cancelled") return <Badge bg="secondary">Đã hủy</Badge>;
  return <Badge bg="secondary">{status || "Không xác định"}</Badge>;
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
