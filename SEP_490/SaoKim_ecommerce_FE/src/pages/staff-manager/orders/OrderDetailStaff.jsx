
import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Row,
  Col,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHome, faArrowLeft } from "@fortawesome/free-solid-svg-icons";

import StaffLayout from "../../../layouts/StaffLayout";
import useOrdersApi from "../api/useOrders";
import useProductsApi from "../api/useProducts";

export default function OrderDetailStaff() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchOrderDetail, updateOrderStatus, deleteOrder } = useOrdersApi();
  const { fetchProduct } = useProductsApi();

  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [unitMap, setUnitMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Không tìm thấy mã đơn hàng");
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const detail = await fetchOrderDetail(id);
        setOrder(detail);
        setItems(detail.items || detail.Items || []);
      } catch (e) {
        console.error(e);
        setError(e.message || "Tải chi tiết đơn hàng thất bại");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const renderStatus = (s) => {
    const v = String(s || "").toLowerCase();
    if (v === "pending")
      return (
        <Badge bg="warning" text="dark">
          Chờ xử lý
        </Badge>
      );
    if (v === "paid") return <Badge bg="primary">Đã thanh toán</Badge>;
    if (v === "shipping") return <Badge bg="info">Đang giao</Badge>;
    if (v === "completed") return <Badge bg="success">Hoàn tất</Badge>;
    if (v === "cancelled") return <Badge bg="secondary">Đã hủy</Badge>;
    return <Badge bg="secondary">{s || "Không xác định"}</Badge>;
  };

  const canCancel = (o) => {
    if (!o) return false;
    const s = String(o.status || "").toLowerCase();
    return s === "pending" || s === "shipping" || s === "paid";
  };

  const handleCancelOrder = async () => {
    if (!order || !canCancel(order)) return;
    if (!window.confirm("Bạn có chắc chắn muốn hủy đơn hàng này?")) return;

    setCancelling(true);
    try {
      await updateOrderStatus(order.id, "Cancelled");
      setOrder((prev) => (prev ? { ...prev, status: "Cancelled" } : prev));
    } catch (e) {
      console.error(e);
      alert(e.message || "Không hủy được đơn hàng");
    } finally {
      setCancelling(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    const s = String(order.status || "").toLowerCase();
    if (s !== "cancelled") {
      alert("Chỉ được xóa đơn hàng đã ở trạng thái Đã hủy.");
      return;
    }

    if (
      !window.confirm(
        "Xóa vĩnh viễn đơn hàng này? Hành động không thể hoàn tác."
      )
    )
      return;

    setDeleting(true);
    try {
      await deleteOrder(order.id);
      navigate("/staff/manager-orders");
    } catch (e) {
      console.error(e);
      alert(e.message || "Không xóa được đơn hàng");
    } finally {
      setDeleting(false);
    }
  };

  const paymentMethodLabel = (o) => {
    const raw =
      o?.paymentMethod ||
      o?.PaymentMethod ||
      o?.payment?.method ||
      o?.Payment?.Method ||
      "";

    const v = raw.toString().toLowerCase();

    if (!v || v === "cod" || v === "cash_on_delivery") {
      return "Thanh toán khi nhận hàng (COD)";
    }
    if (v === "qr" || v === "bank_transfer_qr") {
      return "Chuyển khoản qua QR";
    }
    return raw || "Chưa cập nhật";
  };

  const formatDateTime = (s) => {
    if (!s) return "";
    try {
      return new Date(s).toLocaleString("vi-VN");
    } catch {
      return s;
    }
  };

  const formatCurrency = (v) =>
    `${(Number(v) || 0).toLocaleString("vi-VN")} ₫`;

  const getItemProductId = (item) =>
    item?.productId ??
    item?.ProductId ??
    item?.productID ??
    item?.ProductID ??
    item?.product?.id ??
    item?.product?.Id ??
    item?.product?.productId ??
    item?.product?.ProductId ??
    item?.product?.productID ??
    item?.product?.ProductID;

  const getItemUnitFromItem = (item) => {
    const direct =
      item?.unit ??
      item?.Unit ??
      item?.uom ??
      item?.Uom ??
      item?.unitName ??
      item?.UnitName ??
      item?.unitOfMeasure ??
      item?.UnitOfMeasure ??
      item?.unitOfMeasureName ??
      item?.UnitOfMeasureName ??
      item?.productUnit ??
      item?.product?.unit ??
      item?.product?.Unit ??
      item?.product?.uom ??
      item?.product?.Uom ??
      item?.product?.unitName ??
      item?.product?.UnitName ??
      item?.product?.unitOfMeasure ??
      item?.product?.UnitOfMeasure ??
      item?.product?.unitOfMeasureName ??
      item?.product?.UnitOfMeasureName;

    if (!direct) return "";
    if (typeof direct === "object") {
      const name =
        direct?.name ?? direct?.Name ?? direct?.label ?? direct?.value;
      return name ? String(name) : "";
    }
    return String(direct);
  };

  const getItemUnit = (item) => {
    const direct = getItemUnitFromItem(item);
    if (direct) return direct;
    const productId = getItemProductId(item);
    if (productId != null && unitMap[productId]) {
      return unitMap[productId];
    }
    return "-";
  };

  const getUnitFromProduct = (product) =>
    product?.unit ??
    product?.Unit ??
    product?.uom ??
    product?.Uom ??
    product?.unitName ??
    product?.UnitName ??
    product?.unitOfMeasure ??
    product?.UnitOfMeasure ??
    product?.unitOfMeasureName ??
    product?.UnitOfMeasureName ??
    "";

  useEffect(() => {
    if (!items.length) return;
    let active = true;
    const missingIds = items
      .map((item) => ({
        productId: getItemProductId(item),
        unit: getItemUnitFromItem(item),
      }))
      .filter(
        (entry) =>
          entry.productId != null &&
          !entry.unit &&
          !unitMap[entry.productId]
      )
      .map((entry) => entry.productId);

    const uniqueIds = Array.from(new Set(missingIds));
    if (!uniqueIds.length) return;

    Promise.all(
      uniqueIds.map(async (productId) => {
        try {
          const res = await fetchProduct(productId);
          const product = res?.product ?? res?.data ?? res ?? null;
          const unit = getUnitFromProduct(product);
          return { productId, unit };
        } catch (err) {
          console.error(err);
          return { productId, unit: "" };
        }
      })
    ).then((entries) => {
      if (!active) return;
      const next = {};
      entries.forEach((entry) => {
        if (entry.unit) next[entry.productId] = entry.unit;
      });
      if (Object.keys(next).length) {
        setUnitMap((prev) => ({ ...prev, ...next }));
      }
    });

    return () => {
      active = false;
    };
  }, [items, fetchProduct, unitMap]);

  const invoice = order?.invoice || order?.Invoice;

  const subtotalFromItems = items.reduce((sum, it) => {
    const qty = it.quantity ?? it.Quantity ?? 1;
    const unit = it.unitPrice ?? it.UnitPrice ?? 0;
    const line = it.lineTotal ?? it.LineTotal ?? qty * unit;
    return sum + Number(line || 0);
  }, 0);

  const orderSubtotal = Number(order?.subtotal ?? order?.Subtotal ?? NaN);
  const subtotal = Number.isFinite(orderSubtotal)
    ? orderSubtotal
    : subtotalFromItems;

  const orderDiscount = Number(
    order?.discountAmount ?? order?.DiscountAmount ?? 0
  );
  const discount = orderDiscount;

  const orderVat = Number(order?.vatAmount ?? order?.VatAmount ?? 0);
  const tax = orderVat;

  const orderShippingFee = Number(
    order?.shippingFee ?? order?.ShippingFee ?? NaN
  );

  const orderTotal = Number(order?.total ?? order?.Total ?? NaN);

  const baseTotal = Number.isFinite(orderTotal)
    ? orderTotal
    : subtotal - discount + tax + (Number.isFinite(orderShippingFee) ? orderShippingFee : 0);

  let shippingFee;
  if (Number.isFinite(orderShippingFee)) {
    shippingFee = orderShippingFee;
  } else {
    shippingFee = baseTotal - (subtotal - discount + tax);
    if (shippingFee < 0) shippingFee = 0;
  }

  const displayTotal = baseTotal;


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
            <Breadcrumb.Item
              linkAs={Link}
              linkProps={{ to: "/staff/manager-orders" }}
            >
              Đơn hàng
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Chi tiết đơn #{id}</Breadcrumb.Item>
          </Breadcrumb>

          <h4 className="staff-page-title">Chi tiết đơn hàng #{id}</h4>
          <p className="staff-page-lead">
            Xem đầy đủ thông tin khách hàng, địa chỉ giao hàng và sản phẩm.
          </p>
        </div>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => navigate(-1)}
          >
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Quay lại
          </Button>
        </div>
      </div>

      <Card className="staff-panel">
        <Card.Body>
          {loading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              <span>Đang tải chi tiết đơn...</span>
            </div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : !order ? (
            <div className="text-muted">Không tìm thấy đơn hàng</div>
          ) : (
            <>
              <Row className="mb-4">
                <Col xs={12} md={6}>
                  <h5>Thông tin khách hàng</h5>
                  <div>Khách hàng: {order.customerName}</div>
                  <div>Email: {order.customerEmail}</div>
                  <div>Số điện thoại: {order.customerPhone}</div>
                  <div>Ngày tạo: {formatDateTime(order.createdAt)}</div>
                  <div className="mt-2">
                    Trạng thái: {renderStatus(order.status)}
                  </div>
                </Col>
                <Col xs={12} md={6}>
                  <h5>Địa chỉ giao hàng</h5>
                  <div>
                    Người nhận:{" "}
                    {order.shippingRecipientName || order.customerName}
                  </div>
                  <div>
                    SĐT người nhận:{" "}
                    {order.shippingPhoneNumber || order.customerPhone}
                  </div>
                  <div>
                    Địa chỉ:{" "}
                    {[
                      order.shippingLine1,
                      order.shippingWard,
                      order.shippingDistrict,
                      order.shippingProvince,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </div>

                  <h5 className="mt-4">Thanh toán</h5>
                  <div>Phương thức: {paymentMethodLabel(order)}</div>
                </Col>
              </Row>

              <hr />

              <h5 className="mb-3">Sản phẩm trong đơn</h5>
              {items.length === 0 ? (
                <div className="text-muted">Đơn hàng chưa có sản phẩm</div>
              ) : (
                <>
                  <Table hover responsive size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Sản phẩm</th>
                        <th>Số lượng</th>
                        <th>Đơn vị tính</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.orderItemId ?? index}>
                          <td>{index + 1}</td>
                          <td>{item.productName}</td>
                          <td>{item.quantity}</td>
                          <td>{getItemUnit(item)}</td>
                          <td>
                            {formatCurrency(item.unitPrice ?? 0)}
                          </td>
                          <td>
                            {formatCurrency(item.lineTotal ?? 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  <Row className="mt-3">
                    <Col md={6} />
                    <Col md={6}>
                      <div className="d-flex justify-content-between">
                        <span>Tạm tính</span>
                        <strong>{formatCurrency(subtotal)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Phí ship</span>
                        <strong>{formatCurrency(shippingFee)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Giảm giá</span>
                        <strong>-{formatCurrency(discount)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Thuế</span>
                        <strong>{formatCurrency(tax)}</strong>
                      </div>
                      <hr />
                      <div className="d-flex justify-content-between">
                        <span>Tổng cộng</span>
                        <strong>{formatCurrency(displayTotal)}</strong>
                      </div>
                    </Col>
                  </Row>
                </>
              )}

              <Row className="mt-4 align-items-center g-2">
                <Col xs={12} md={6}>
                  <strong>
                    Tổng tiền: {formatCurrency(order.total ?? order.Total ?? 0)}
                  </strong>
                </Col>
                <Col
                  xs={12}
                  md={6}
                  className="d-flex justify-content-end gap-2 mt-2 mt-md-0"
                >
                  {canCancel(order) && (
                    <Button
                      size="sm"
                      variant="outline-danger"
                      disabled={cancelling}
                      onClick={handleCancelOrder}
                    >
                      {cancelling ? "Đang hủy..." : "Hủy đơn hàng"}
                    </Button>
                  )}

                  {String(order.status || "").toLowerCase() ===
                    "cancelled" && (
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deleting}
                        onClick={handleDeleteOrder}
                      >
                        {deleting ? "Đang xóa..." : "Xóa đơn đã hủy"}
                      </Button>
                    )}
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
    </StaffLayout>
  );
}
