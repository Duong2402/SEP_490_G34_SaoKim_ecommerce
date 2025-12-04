// src/pages/staff-manager/orders/ManageOrders.jsx
import {
  faCheck,
  faCog,
  faHome,
  faSearch,
  faEye,
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
import { Modal } from "react-bootstrap";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DatePicker from "react-datepicker";
import StaffLayout from "../../../layouts/StaffLayout";
import useOrdersApi from "../api/useOrders";

export default function ManageOrders() {
  const { fetchOrders, updateOrderStatus, fetchOrderItems, deleteOrder } =
    useOrdersApi();

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

  const [showOrderItemsModal, setShowOrderItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState([]);
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);

  const [cancellingOrderId, setCancellingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

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
          Chờ xử lý
        </Badge>
      );
    if (v === "paid") return <Badge bg="primary">Đang xử lý kho</Badge>;
    if (v === "shipping") return <Badge bg="info">Đang giao</Badge>;
    if (v === "completed") return <Badge bg="success">Hoàn tất</Badge>;
    if (v === "cancelled") return <Badge bg="secondary">Đã hủy</Badge>;
    return <Badge bg="secondary">{s || "Không xác định"}</Badge>;
  };

  // MỚI: dùng cả status + dispatchConfirmed để hiển thị đúng “Đang xử lý kho”
  const renderStatusForRow = (order) => {
    const v = String(order.status || "").toLowerCase();

    // Nếu đang ở bước chờ kho xác nhận phiếu xuất
    if (v === "pending" && !order.dispatchConfirmed) {
      return <Badge bg="primary">Đang xử lý kho</Badge>;
    }

    return renderStatus(order.status);
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      await load();
    } catch (e) {
      console.error(e);
      alert(e?.message || "Không cập nhật được trạng thái đơn hàng");
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
      const items = await fetchOrderItems(order.id);
      setSelectedOrderItems(items);
    } catch (e) {
      console.error(e);
      alert("Không tải được danh sách sản phẩm của đơn hàng");
    } finally {
      setLoadingOrderItems(false);
    }
  };

  const canCancel = (order) => {
    if (!order) return false;
    const s = String(order.status || "").toLowerCase();
    return s === "pending" || s === "shipping" || s === "paid";
  };

  const handleCancelOrder = async (order) => {
    if (!order || !canCancel(order)) return;

    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    setCancellingOrderId(order.id);
    try {
      await updateOrderStatus(order.id, "Cancelled");
      await load();

      setSelectedOrder((prev) =>
        prev && prev.id === order.id ? { ...prev, status: "Cancelled" } : prev
      );
    } catch (e) {
      console.error(e);
      alert("Không hủy được đơn hàng");
    } finally {
      setCancellingOrderId(null);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!order) return;

    const status = String(order.status || "").toLowerCase();
    if (status !== "cancelled") {
      alert("Chỉ được xóa đơn hàng đã ở trạng thái Đã hủy");
      return;
    }

    if (
      !window.confirm(
        "Xóa vĩnh viễn đơn hàng này? Hành động không thể hoàn tác."
      )
    )
      return;

    setDeletingOrderId(order.id);
    try {
      await deleteOrder(order.id);
      setShowOrderItemsModal(false);
      await load();
    } catch (e) {
      console.error(e);
      alert("Không xóa được đơn hàng");
    } finally {
      setDeletingOrderId(null);
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
            <Breadcrumb.Item>Đơn hàng</Breadcrumb.Item>
            <Breadcrumb.Item active>Quản lý đơn hàng</Breadcrumb.Item>
          </Breadcrumb>

          <h4 className="staff-page-title">Quản lý đơn hàng</h4>
          <p className="staff-page-lead">
            Lọc, cập nhật trạng thái và theo dõi chi tiết đơn
          </p>
        </div>
      </div>

      <div className="staff-panel">
        <Row className="g-3 align-items-end">
          <Col md={4}>
            <Form.Label>Tìm kiếm</Form.Label>
            <InputGroup>
              <InputGroup.Text>
                <FontAwesomeIcon icon={faSearch} />
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Mã đơn, khách, email, số điện thoại"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </InputGroup>
          </Col>

          <Col md={2}>
            <Form.Label>Trạng thái</Form.Label>
            <Form.Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="Pending">Chờ xử lý</option>
              <option value="Shipping">Đang giao</option>
              <option value="Paid">Đã thanh toán</option>
              <option value="Completed">Hoàn tất</option>
              <option value="Cancelled">Đã hủy</option>
            </Form.Select>
          </Col>

          <Col md={2}>
            <Form.Label>Từ ngày</Form.Label>
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
            <Form.Label>Đến ngày</Form.Label>
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
                <Dropdown.Header>Hiển thị</Dropdown.Header>
                {[10, 20, 30, 50].map((n) => (
                  <Dropdown.Item
                    key={n}
                    active={pageSize === n}
                    onClick={() => {
                      setPageSize(n);
                      setPage(1);
                    }}
                  >
                    {n} dòng
                    {pageSize === n && (
                      <FontAwesomeIcon icon={faCheck} className="ms-2" />
                    )}
                  </Dropdown.Item>
                ))}

                <Dropdown.Divider />
                <Dropdown.Header>Sắp xếp</Dropdown.Header>

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
                    setSortBy("total");
                    setSortDir("desc");
                    setPage(1);
                  }}
                >
                  Tổng tiền cao xuống thấp
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("status");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Trạng thái A → Z
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => {
                    setSortBy("customer");
                    setSortDir("asc");
                    setPage(1);
                  }}
                >
                  Khách hàng A → Z
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
            {loading && (
              <div className="d-flex align-items-center gap-2">
                <Spinner animation="border" size="sm" />
                <span>Đang tải...</span>
              </div>
            )}
          </div>

          <Table hover className="mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Ngày tạo</th>
                <th className="text-end">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o, idx) => {
                const canShip = Boolean(o.dispatchConfirmed);
                const disableShip = updatingOrderId === o.id || !canShip;

                return (
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
                    <td>{(o.total ?? 0).toLocaleString("vi-VN")} ₫</td>

                    {/* ĐỔI CHỖ NÀY: dùng renderStatusForRow */}
                    <td>{renderStatusForRow(o)}</td>

                    <td>{formatDate(o.createdAt)}</td>
                    <td className="text-end">
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => handleViewOrderItems(o)}
                        title="Xem chi tiết đơn hàng"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </Button>

                      {o.status === "Pending" && (
                        <div className="d-inline-flex flex-column align-items-end gap-1">
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            disabled={disableShip}
                            title={
                              !canShip
                                ? "Chờ kho xác nhận phiếu xuất"
                                : undefined
                            }
                            onClick={() =>
                              handleUpdateOrderStatus(o.id, "Shipping")
                            }
                          >
                            {updatingOrderId === o.id
                              ? "Đang lưu..."
                              : "Chuyển giao hàng"}
                          </Button>
                          {!canShip && (
                            <span className="text-muted small">
                              Chờ kho xác nhận phiếu xuất
                            </span>
                          )}
                        </div>
                      )}

                      {o.status === "Paid" && (
                        <span className="text-muted small">
                          Đang chờ kho xác nhận phiếu xuất
                        </span>
                      )}

                      {o.status === "Shipping" && (
                        <Button
                          size="sm"
                          variant="outline-success"
                          disabled={updatingOrderId === o.id}
                          onClick={() =>
                            handleUpdateOrderStatus(o.id, "Completed")
                          }
                        >
                          {updatingOrderId === o.id
                            ? "Đang lưu..."
                            : "Hoàn tất đơn"}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4">
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

      <Modal
        show={showOrderItemsModal}
        onHide={() => setShowOrderItemsModal(false)}
        size="lg"
        dialogClassName="staff-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title className="staff-modal__title">
            Chi tiết đơn hàng #{selectedOrder?.id}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrderItems ? (
            <div className="d-flex align-items-center gap-2 my-3">
              <Spinner animation="border" size="sm" />
              <span>Đang tải sản phẩm...</span>
            </div>
          ) : selectedOrderItems.length > 0 ? (
            <Table hover responsive size="sm" className="mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Sản phẩm</th>
                  <th>Số lượng</th>
                  <th>Đơn giá</th>
                  <th>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrderItems.map((item, index) => (
                  <tr key={item.orderItemId ?? index}>
                    <td>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{(item.unitPrice ?? 0).toLocaleString("vi-VN")} ₫</td>
                    <td>{(item.lineTotal ?? 0).toLocaleString("vi-VN")} ₫</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="text-muted">Đơn hàng chưa có sản phẩm</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <div className="w-100 d-flex justify-content-between align-items-center">
            <div>
              {selectedOrder && (
                <>
                  <div className="mb-1">
                    Trạng thái hiện tại: {renderStatusForRow(selectedOrder)}
                  </div>
                  <div className="small text-muted">
                    Tổng tiền:{" "}
                    {(selectedOrder.total ?? 0).toLocaleString("vi-VN")} ₫
                  </div>
                </>
              )}
            </div>

            <div className="d-flex gap-2">
              {selectedOrder && canCancel(selectedOrder) && (
                <Button
                  size="sm"
                  variant="outline-danger"
                  disabled={cancellingOrderId === selectedOrder.id}
                  onClick={() => handleCancelOrder(selectedOrder)}
                >
                  {cancellingOrderId === selectedOrder.id
                    ? "Đang hủy..."
                    : "Hủy đơn hàng"}
                </Button>
              )}

              {selectedOrder &&
                String(selectedOrder.status || "").toLowerCase() ===
                  "cancelled" && (
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={deletingOrderId === selectedOrder.id}
                    onClick={() => handleDeleteOrder(selectedOrder)}
                  >
                    {deletingOrderId === selectedOrder.id
                      ? "Đang xóa..."
                      : "Xóa đơn đã hủy"}
                  </Button>
                )}

              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowOrderItemsModal(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </Modal.Footer>
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
