import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Form,
  InputGroup,
  Pagination,
  Row,
  Table,
} from "react-bootstrap";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import "../../styles/my-orders.css";

export default function CustomerOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const apiBase =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
    "https://localhost:7278";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchOrders = async () => {
      setLoading(true);
      setError("");

      try {
        const url = `${apiBase}/api/orders/my?page=${page}&pageSize=${pageSize}`;

        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          navigate("/login");
          return;
        }

        if (!res.ok) {
          let msg = `Lỗi API: ${res.status}`;
          try {
            const errJson = await res.json();
            if (errJson?.message || errJson?.detail) {
              msg += ` - ${errJson.message || errJson.detail}`;
            }
          } catch {
            // ignore non-JSON
          }
          throw new Error(msg);
        }

        const data = await res.json();

        setOrders(data.items || data.orders || data.data || []);
        setTotal(data.total || data.totalCount || 0);
      } catch (e) {
        setError(e.message || "Lỗi tải đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [page, pageSize, apiBase, navigate]);

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  const getProductNames = (order) => {
    const items = order.items || order.Items || order.products || order.Products || [];
    if (!Array.isArray(items) || items.length === 0) return "-";
    const names = items
      .map((it) => it.productName || it.ProductName || it.name || it.Name)
      .filter(Boolean);
    return names.length > 0 ? names.join(", ") : "-";
  };

  const getOrderCode = (order) =>
    order.orderCode || order.code || order.OrderCode || order.orderId || order.OrderId || "";

  const formatDate = (value) => (value ? new Date(value).toLocaleString("vi-VN") : "-");

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
      Number(value) || 0
    );

  const statusLabel = (value) => {
    const v = (value || "").toLowerCase();
    if (["processing", "đang xử lý", "dang xu ly"].includes(v)) return "Đang xử lý";
    if (["confirmed", "đã xác nhận", "da xac nhan"].includes(v)) return "Đã xác nhận";
    if (["shipping", "đang giao", "dang giao"].includes(v)) return "Đang giao";
    if (["completed", "hoàn thành", "hoan thanh", "paid"].includes(v)) return "Hoàn thành";
    if (["cancelled", "đã hủy", "da huy", "đã huỷ", "da huỷ"].includes(v)) return "Đã huỷ";
    if (["pending"].includes(v)) return "Đang xử lý";
    return value || "-";
  };

  const statusBadgeVariant = (value) => {
    const v = (value || "").toLowerCase();
    if (["completed", "hoàn thành", "hoan thanh", "paid"].includes(v)) return "status-success";
    if (
      ["shipping", "đang giao", "dang giao", "confirmed", "đã xác nhận", "da xac nhan"].includes(v)
    )
      return "status-info";
    if (["processing", "pending", "đang xử lý", "dang xu ly"].includes(v)) return "status-warning";
    if (["cancelled", "đã hủy", "da huy", "đã huỷ", "da huỷ"].includes(v)) return "status-danger";
    return "status-secondary";
  };

  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      const matchesStatus =
        statusFilter === "all" ||
        statusLabel(o.status || o.Status || "").toLowerCase() ===
          statusLabel(statusFilter).toLowerCase();
      const code = getOrderCode(o).toString();
      const products = getProductNames(o).toLowerCase();
      const term = searchTerm.trim().toLowerCase();
      const matchesSearch = !term || code.toLowerCase().includes(term) || products.includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="my-orders-page">
      <HomepageHeader />
      <section className="my-orders-section py-5">
        <Container>
          <Breadcrumb className="my-orders-breadcrumb mb-3">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
              Trang chủ
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Tài khoản</Breadcrumb.Item>
            <Breadcrumb.Item active>Đơn hàng của tôi</Breadcrumb.Item>
          </Breadcrumb>

          <div className="d-flex flex-column gap-2 mb-4">
            <h1 className="my-orders-title display-6 fw-bold mb-0">Đơn hàng của tôi</h1>
            <p className="text-muted mb-0">
              Danh sách các đơn hàng bạn đã đặt tại Sao Kim Lighting.
            </p>
          </div>

          <Card className="my-orders-card mb-4">
            <Card.Body className="p-4 p-md-5">
              <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
                <div>
                  <h5 className="mb-1 text-primary">Danh sách đơn hàng</h5>
                  <small className="text-muted">Theo dõi trạng thái và chi tiết đơn hàng.</small>
                </div>
                <Button
                  variant="outline-primary"
                  className="rounded-pill"
                  onClick={() => navigate("/")}
                >
                  ← Trở lại
                </Button>
              </div>

              <Row className="g-3 align-items-center mb-3 filter-row">
                <Col md={4}>
                  <Form.Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="rounded-3"
                  >
                    <option value="all">Trạng thái: Tất cả</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="shipping">Đang giao</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">Đã huỷ</option>
                  </Form.Select>
                </Col>
                <Col md={5}>
                  <InputGroup>
                    <Form.Control
                      placeholder="Tìm theo mã đơn hoặc sản phẩm"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-start-3"
                    />
                  </InputGroup>
                </Col>
                <Col md={3} className="d-grid">
                  <Button className="btn-saokim rounded-3 w-100">Áp dụng</Button>
                </Col>
              </Row>

              {error && <div className="text-danger mb-3">{error}</div>}

              {loading ? (
                <div className="py-4 text-center text-muted">Đang tải đơn hàng...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="empty-orders text-center p-4">
                  <h5 className="fw-bold text-primary mb-2">Bạn chưa có đơn hàng nào.</h5>
                  <p className="text-muted mb-3">
                    Hãy khám phá các sản phẩm chiếu sáng tại Sao Kim Lighting và đặt đơn đầu tiên của
                    bạn.
                  </p>
                  <Button as={Link} to="/products" className="btn-saokim rounded-pill px-4">
                    Xem sản phẩm
                  </Button>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table hover className="align-middle mb-0 my-orders-table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Sản phẩm</th>
                          <th>Ngày đặt</th>
                          <th className="text-end">Tổng tiền</th>
                          <th className="text-center">Trạng thái</th>
                          <th className="text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.map((o) => {
                          const items = o.items || o.Items || o.products || o.Products || [];
                          const names = getProductNames(o);
                          const firstName = names?.split(",")[0] || "Sản phẩm";
                          const extraCount = Math.max(0, items.length - 1);

                          return (
                            <tr key={getOrderCode(o)}>
                              <td className="fw-semibold text-primary">#{getOrderCode(o)}</td>
                              <td>
                                <div className="d-flex align-items-center product-cell">
                                  <div className="text-truncate flex-grow-1" style={{ maxWidth: 260 }}>
                                    <div className="fw-semibold text-primary text-truncate">
                                      {firstName}
                                    </div>
                                    {extraCount > 0 && (
                                      <div className="small text-muted text-truncate">
                                        +{extraCount} sản phẩm
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="text-muted">
                                {formatDate(o.createdAt || o.CreatedAt || o.orderDate || o.OrderDate)}
                              </td>
                              <td className="text-end text-accent fw-bold">
                                {formatCurrency(o.total ?? o.Total)}
                              </td>
                              <td className="text-center">
                                <Badge
                                  className={`status-badge ${statusBadgeVariant(
                                    o.status || o.Status
                                  )}`}
                                >
                                  {statusLabel(o.status || o.Status)}
                                </Badge>
                              </td>
                              <td className="text-center">
                                <Button
                                  size="sm"
                                  variant="outline-primary"
                                  className="rounded-pill"
                                  onClick={() => {
                                    // TODO: Hook into order detail route when available
                                  }}
                                >
                                  Xem chi tiết
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </Table>
                  </div>

                  {total > pageSize && (
                    <div className="d-flex justify-content-end mt-3">
                      <Pagination className="mb-0">
                        <Pagination.Prev onClick={prevPage} disabled={page === 1}>
                          Trước
                        </Pagination.Prev>
                        <Pagination.Item active>{page}</Pagination.Item>
                        <Pagination.Next onClick={nextPage} disabled={page * pageSize >= total}>
                          Sau
                        </Pagination.Next>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Container>
      </section>
      <EcommerceFooter />
    </div>
  );
}
