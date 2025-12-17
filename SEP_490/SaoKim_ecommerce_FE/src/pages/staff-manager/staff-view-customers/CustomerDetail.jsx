
import { faHome } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Badge,
  Breadcrumb,
  Button,
  Form,
  Pagination,
  Spinner,
} from "@themesberg/react-bootstrap";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StaffLayout from "../../../layouts/StaffLayout";
import "../../../styles/manager.css";
import "../../../styles/staff-customer-detail.css";
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
      <div className="manager-section staff-customer-detail">
        <section className="manager-panel staff-customer-detail__header">
          <div className="manager-panel__header">
            <div className="staff-customer-detail__header-left">
              <Breadcrumb
                className="staff-customer-detail__breadcrumb d-none d-md-inline-block"
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
              <h2 className="manager-panel__title">Hồ sơ khách hàng</h2>
            </div>
            <div className="manager-panel__actions">
              <button
                type="button"
                className="manager-btn manager-btn--outline"
                onClick={() => navigate("/staff/manager-customers")}
              >
                Quay lại
              </button>
            </div>
          </div>
        </section>

        {loadingCustomer && (
          <div className="manager-panel manager-empty">
            <Spinner animation="border" />
          </div>
        )}

        {!loadingCustomer && customer && (
          <>
            <div className="staff-customer-detail__grid">
            <section className="manager-panel">
              <div className="manager-panel__header">
                <div>
                  <h3 className="manager-panel__title">Thông tin</h3>
                </div>
              </div>
              <div className="manager-detail-grid">
                <div className="manager-detail-row">
                  <div className="manager-detail-label">Tên</div>
                  <div className="manager-detail-value">{customer.name}</div>
                </div>
                <div className="manager-detail-row">
                  <div className="manager-detail-label">Email</div>
                  <div className="manager-detail-value">{customer.email}</div>
                </div>
                <div className="manager-detail-row">
                  <div className="manager-detail-label">SĐT</div>
                  <div className="manager-detail-value">{customer.phoneNumber ?? "-"}</div>
                </div>
                <div className="manager-detail-row">
                  <div className="manager-detail-label">Địa chỉ</div>
                  <div className="manager-detail-value">
                    {customer.address?.trim() ? customer.address : "-"}
                  </div>
                </div>
                <div className="manager-detail-row">
                  <div className="manager-detail-label">Ngày tạo</div>
                  <div className="manager-detail-value">{formatDate(customer.createAt)}</div>
                </div>
              </div>
            </section>

            <div className="staff-customer-detail__stack">
              <section className="manager-panel staff-customer-detail__metrics">
                <div className="manager-panel__header">
                  <div>
                    <h3 className="manager-panel__title">Chỉ số</h3>
                  </div>
                </div>
                <div className="manager-summary-grid staff-customer-detail__metrics-grid">
                  <div className="manager-card">
                    <div className="manager-card__label">Tổng đơn</div>
                    <div className="manager-card__value">{customer.ordersCount}</div>
                  </div>
                  <div className="manager-card">
                    <div className="manager-card__label">Tổng chi tiêu</div>
                    <div className="manager-card__value">
                      {customer.totalSpend.toLocaleString("vi-VN")} ₫
                    </div>
                  </div>
                  <div className="manager-card">
                    <div className="manager-card__label">Đơn gần nhất</div>
                    <div className="manager-card__value">
                      {customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "-"}
                    </div>
                  </div>
                </div>
              </section>

              <section className="manager-panel">
                <div className="manager-panel__header">
                  <div>
                    <h3 className="manager-panel__title">Đơn hàng gần đây</h3>
                    <p className="manager-panel__subtitle">Tổng: {ordersTotal}</p>
                  </div>
                </div>

                {loadingOrders && (
                  <div className="staff-customer-detail__loading">
                    <Spinner animation="border" size="sm" />
                    <span>Đang tải đơn hàng...</span>
                  </div>
                )}

                <div className="manager-table__wrapper">
                  <table className="manager-table">
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
                          <td colSpan={4} className="manager-table__empty">
                            Chưa có đơn hàng
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {ordersTotalPages > 1 && (
                  <div className="staff-customer-detail__pagination">
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
              </section>
            </div>
          </div>

          <section className="manager-panel">
            <div className="manager-panel__header">
              <div>
                <h3 className="manager-panel__title">Ghi chú nội bộ</h3>
              </div>
            </div>

            <Form onSubmit={handleAddNote} className="staff-customer-detail__note-form">
              <Form.Control
                as="textarea"
                rows={2}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Chỉ nhân viên mới thấy ghi chú này"
              />
              <Button
                type="submit"
                className="staff-customer-detail__note-button"
                disabled={addingNote || !noteContent.trim()}
              >
                {addingNote ? "Đang lưu..." : "Thêm ghi chú"}
              </Button>
            </Form>

            {customer.notes && customer.notes.length > 0 ? (
              <div className="manager-table__wrapper">
                <table className="manager-table">
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
                </table>
              </div>
            ) : (
              <div className="manager-table__empty">Chưa có ghi chú</div>
            )}
          </section>
        </>
      )}
      </div>
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
