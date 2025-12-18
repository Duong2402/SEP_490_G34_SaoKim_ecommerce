import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Container,
  Row,
  Spinner,
} from "react-bootstrap";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import "../../styles/order-detail.css";

const STATUS_LABELS = {
  pending: { label: "Chờ xử lý", variant: "warning" },
  processing: { label: "Đang xử lý", variant: "warning" },
  confirmed: { label: "Đã xác nhận", variant: "info" },
  paid: { label: "Đã thanh toán", variant: "info" },
  shipping: { label: "Đang giao", variant: "primary" },
  completed: { label: "Hoàn tất", variant: "success" },
  cancelled: { label: "Đã hủy", variant: "secondary" },
};

const PAYMENT_METHOD_LABELS = {
  cod: "Thanh toán khi nhận hàng (COD)",
  cash_on_delivery: "Thanh toán khi nhận hàng (COD)",
  bank_transfer_qr: "Chuyển khoản qua QR",
};

const PAYMENT_STATUS_LABELS = {
  paid: { label: "Đã thanh toán", variant: "success" },
  pending: { label: "Chờ thanh toán", variant: "warning" },
  unpaid: { label: "Chưa thanh toán", variant: "warning" },
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const apiBase =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_API_BASE_URL) ||
    "https://localhost:7278";
  const apiBaseNormalized = (apiBase || "").replace(/\/+$/, "");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    let cancelled = false;
    const fetchDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${apiBase}/api/customer/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          navigate("/login");
          return;
        }

        if (!res.ok) {
          let msg = `Không tải được đơn hàng (mã ${res.status})`;
          try {
            const text = await res.text();
            if (text) {
              try {
                const data = JSON.parse(text);
                msg = data?.message || data?.detail || text;
              } catch {
                msg = text;
              }
            }
          } catch {
            // keep fallback
          }
          throw new Error(msg);
        }

        const data = await res.json();
        if (!cancelled) setOrder(data);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không tải được đơn hàng");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [apiBase, orderId, navigate]);

  const items = useMemo(() => {
    if (!order) return [];
    return order.items || order.Items || [];
  }, [order]);

  const invoice = order?.invoice || order?.Invoice;
  const shippingAddress = order?.shippingAddress || order?.ShippingAddress;
  const payment = order?.payment || order?.Payment;
  const invoiceId =
    invoice?.invoiceId ?? invoice?.InvoiceId ?? invoice?.id ?? invoice?.Id;

  const subtotalFromItems = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + Number(it.lineTotal ?? it.LineTotal ?? 0),
        0
      ),
    [items]
  );

  const orderSubtotal = Number(order?.subtotal ?? order?.Subtotal ?? NaN);
  const invoiceSubtotal = Number(invoice?.subtotal ?? invoice?.Subtotal ?? NaN);
  const subtotal = Number.isFinite(orderSubtotal)
    ? orderSubtotal
    : Number.isFinite(invoiceSubtotal)
      ? invoiceSubtotal
      : subtotalFromItems;

  const orderDiscount = Number(
    order?.discountAmount ?? order?.DiscountAmount ?? NaN
  );
  const invoiceDiscount = Number(invoice?.discount ?? invoice?.Discount ?? 0);
  const discount = Number.isFinite(orderDiscount)
    ? orderDiscount
    : invoiceDiscount;

  const orderVat = Number(order?.vatAmount ?? order?.VatAmount ?? NaN);
  const invoiceTax = Number(invoice?.tax ?? invoice?.Tax ?? 0);
  const tax = Number.isFinite(orderVat) ? orderVat : invoiceTax;

  const orderShippingFee = Number(
    order?.shippingFee ?? order?.ShippingFee ?? NaN
  );

  const totalFromOrder = Number(order?.total ?? order?.Total ?? NaN);
  const totalFromInvoice = Number(invoice?.total ?? invoice?.Total ?? NaN);

  const baseTotal =
    Number.isFinite(totalFromOrder) && totalFromOrder > 0
      ? totalFromOrder
      : Number.isFinite(totalFromInvoice)
        ? totalFromInvoice
        : NaN;

  let shippingFee;
  if (Number.isFinite(orderShippingFee)) {
    shippingFee = orderShippingFee;
  } else if (Number.isFinite(baseTotal)) {
    shippingFee = baseTotal - (subtotal - discount + tax);
    if (shippingFee < 0) shippingFee = 0;
  } else {
    shippingFee = 0;
  }

  const displayTotal = Number.isFinite(baseTotal)
    ? baseTotal
    : subtotal - discount + tax + shippingFee;

  const statusKey = (order?.status || order?.Status || "").toLowerCase();
  const statusMeta = STATUS_LABELS[statusKey] || {
    label: order?.status || order?.Status || "Không xác định",
    variant: "secondary",
  };

  const paymentMethodRaw = (
    payment?.method ||
    payment?.Method ||
    order?.paymentMethod ||
    order?.PaymentMethod ||
    ""
  ).toLowerCase();

  const paymentMethodKey = paymentMethodRaw;
  const isCod =
    paymentMethodKey === "cod" || paymentMethodKey === "cash_on_delivery";

  const paymentMethod =
    PAYMENT_METHOD_LABELS[paymentMethodKey] ||
    payment?.method ||
    payment?.Method ||
    "Chưa cập nhật";

  const paymentStatusKey = (
    payment?.status ||
    payment?.Status ||
    ""
  ).toLowerCase();
  const paymentStatus =
    PAYMENT_STATUS_LABELS[paymentStatusKey] || PAYMENT_STATUS_LABELS.pending;

  const formatCurrency = (value) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(Number(value) || 0);

  const formatDateTime = (value) =>
    value ? new Date(value).toLocaleString("vi-VN") : "-";

  const resolveImage = (url) => {
    if (!url) return null;
    const raw = String(url).trim().replace(/\\/g, "/");
    if (!raw) return null;
    if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;

    let path = raw.startsWith("/") ? raw : `/${raw}`;
    const lower = path.toLowerCase();
    if (!lower.startsWith("/images/") && !lower.startsWith("/uploads/")) {
      path = `/images${path}`;
    }

    return `${apiBaseNormalized}${path}`;
  };

  const orderCode =
    order?.orderCode ||
    order?.code ||
    order?.OrderCode ||
    order?.Code ||
    order?.orderId ||
    order?.OrderId ||
    orderId;

  const statusSteps = useMemo(
    () =>
      isCod
        ? ["pending", "shipping", "paid", "completed"]
        : ["pending", "shipping", "completed"],
    [isCod]
  );

  const currentStepIndex = statusSteps.findIndex((s) => s === statusKey);

  const renderTimeline = () => (
    <div className="order-timeline card-soft">
      <div className="timeline-grid">
        {statusSteps.map((step, idx) => {
          const meta = STATUS_LABELS[step] || { label: step };
          const done =
            statusKey === "cancelled"
              ? false
              : currentStepIndex !== -1 && idx <= currentStepIndex;
          return (
            <div key={step} className="timeline-step">
              <div className={`timeline-dot ${done ? "done" : ""}`}>
                {done ? "✓" : idx + 1}
              </div>
              <div className="timeline-label">{meta.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderItems = () => {
    if (!items.length) {
      return <div className="text-muted small">Đơn hàng chưa có sản phẩm.</div>;
    }

    return items.map((item) => {
      const img = resolveImage(item.imageUrl || item.ImageUrl);
      const name = item.productName || item.ProductName || "Sản phẩm";
      const productId = item.productId || item.ProductId;
      const quantity = item.quantity ?? item.Quantity ?? 1;
      const unitPrice = item.unitPrice ?? item.UnitPrice ?? 0;
      const lineTotal =
        item.lineTotal ?? item.LineTotal ?? quantity * unitPrice;

      return (
        <div
          key={item.orderItemId ?? item.OrderItemId ?? name}
          className="order-item-row"
        >
          <div className="order-item-thumb">
            {img ? (
              <img src={img} alt={name} />
            ) : (
              <div className="placeholder-thumb">SK</div>
            )}
          </div>
          <div className="flex-grow-1">
            <div className="fw-semibold text-primary mb-1">
              {productId ? (
                <Link to={`/products/${productId}`} className="link-primary">
                  {name}
                </Link>
              ) : (
                name
              )}
            </div>
            {(item.unit || item.Unit) && (
              <div className="text-muted small">
                Đơn vị: {item.unit || item.Unit}
              </div>
            )}
            <div className="text-muted small">
              Mã sản phẩm: {item.productCode || item.ProductCode || "-"}
            </div>
          </div>
          <div className="text-end">
            <div className="text-muted small">{formatCurrency(unitPrice)}</div>
            <div className="text-muted small">× {quantity}</div>
            <div className="fw-bold text-accent">
              {formatCurrency(lineTotal)}
            </div>
          </div>
        </div>
      );
    });
  };

  const handleDownloadInvoice = async () => {
    if (!invoiceId) return;
    const token = localStorage.getItem("token");

    setDownloading(true);
    try {
      const pdfUrl = `${apiBase}/api/invoices/${invoiceId}/pdf`;
      const headers = token
        ? {
          Authorization: `Bearer ${token}`,
        }
        : undefined;

      const downloadPdf = () =>
        fetch(pdfUrl, {
          headers,
        });

      let res = await downloadPdf();
      if (res.status === 404) {
        await fetch(`${apiBase}/api/invoices/${invoiceId}/generate-pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(headers || {}),
          },
        });
        res = await downloadPdf();
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Không tải được hóa đơn (mã ${res.status})`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${invoice?.code || invoice?.Code || "hoa-don"}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.message || "Không tải được hóa đơn");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="order-detail-page">
      <HomepageHeader />
      <section className="order-detail-section py-5">
        <Container>
          <Breadcrumb className="order-detail-breadcrumb mb-3">
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/" }}>
              Trang chủ
            </Breadcrumb.Item>
            <Breadcrumb.Item>Trung tâm tài khoản</Breadcrumb.Item>
            <Breadcrumb.Item
              linkAs={Link}
              linkProps={{ to: "/account/orders" }}
            >
              Đơn hàng của tôi
            </Breadcrumb.Item>
            <Breadcrumb.Item active>Chi tiết đơn hàng</Breadcrumb.Item>
          </Breadcrumb>

          <div className="d-flex flex-column gap-2 mb-4">
            <h1 className="order-detail-title display-6 fw-bold mb-0">
              Chi tiết đơn hàng
            </h1>
            <p className="text-muted mb-0">
              Xem thông tin sản phẩm, địa chỉ giao hàng và trạng thái xử lý đơn
              hàng.
            </p>
          </div>

          {error && <Alert variant="danger">{error}</Alert>}

          {loading ? (
            <div className="text-center text-muted py-5">
              <Spinner animation="border" size="sm" className="me-2" />
              Đang tải thông tin đơn hàng...
            </div>
          ) : !order ? (
            <Card className="order-detail-card">
              <Card.Body className="py-5 text-center text-muted">
                Không tìm thấy đơn hàng.
                <div className="mt-3">
                  <Button onClick={() => navigate("/account/orders")}>
                    Về Đơn hàng của tôi
                  </Button>
                </div>
              </Card.Body>
            </Card>
          ) : (
            <Row className="g-4">
              <Col lg={8}>
                <div className="order-detail-card mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="text-muted small">Mã đơn</div>
                      <div className="h5 fw-bold text-primary mb-0">
                        #{orderCode}
                      </div>
                    </div>
                    <Badge bg={statusMeta.variant} className="status-pill">
                      {statusMeta.label}
                    </Badge>
                  </div>

                  <div className="order-info-grid">
                    <div className="info-row">
                      <span className="label">Ngày đặt</span>
                      <span className="value">
                        {formatDateTime(order.createdAt || order.CreatedAt)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Phương thức thanh toán</span>
                      <span className="value">{paymentMethod}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Trạng thái thanh toán</span>
                      <span className="value">
                        <Badge
                          bg={paymentStatus.variant}
                          className="status-pill"
                        >
                          {paymentStatus.label}
                        </Badge>
                      </span>
                    </div>
                    {payment?.transactionCode && (
                      <div className="info-row">
                        <span className="label">Mã giao dịch</span>
                        <span className="value">{payment.transactionCode}</span>
                      </div>
                    )}
                    {payment?.paidAt && (
                      <div className="info-row">
                        <span className="label">Thời gian thanh toán</span>
                        <span className="value">
                          {formatDateTime(payment.paidAt)}
                        </span>
                      </div>
                    )}
                    {invoice?.code && (
                      <div className="info-row">
                        <span className="label">Hóa đơn</span>
                        <span className="value">{invoice.code}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="order-detail-card mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 text-primary">Địa chỉ giao hàng</h5>
                  </div>
                  {shippingAddress ? (
                    <div className="order-info-grid">
                      <div className="info-row">
                        <span className="label">Họ tên</span>
                        <span className="value">
                          {shippingAddress.recipientName || "-"}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Số điện thoại</span>
                        <span className="value">
                          {shippingAddress.phoneNumber || "-"}
                        </span>
                      </div>
                      <div className="info-row">
                        <span className="label">Địa chỉ</span>
                        <span className="value">
                          {[
                            shippingAddress.line1,
                            shippingAddress.ward,
                            shippingAddress.district,
                            shippingAddress.province,
                          ]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted">Chưa có địa chỉ giao hàng.</div>
                  )}
                </div>

                <div className="order-detail-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 text-primary">Sản phẩm trong đơn</h5>
                  </div>
                  <div className="order-items-list">{renderItems()}</div>
                </div>
              </Col>

              <Col lg={4}>
                <div className="order-detail-card mb-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="mb-0 text-primary">Tóm tắt đơn hàng</h5>
                    <Badge bg={statusMeta.variant} className="status-pill">
                      {statusMeta.label}
                    </Badge>
                  </div>

                  <div className="summary-row">
                    <span>Tạm tính</span>
                    <span className="fw-semibold">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Phí ship</span>
                    <span className="fw-semibold">
                      {formatCurrency(shippingFee)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Giảm giá</span>
                    <span className="fw-semibold">
                      -{formatCurrency(discount)}
                    </span>
                  </div>
                  <div className="summary-row">
                    <span>Thuế</span>
                    <span className="fw-semibold">{formatCurrency(tax)}</span>
                  </div>
                  <hr />
                  <div className="summary-row total">
                    <span>Tổng cộng</span>
                    <span className="total-amount">
                      {formatCurrency(displayTotal)}
                    </span>
                  </div>
                  <div className="mt-3 text-muted small">
                    Phương thức thanh toán: {paymentMethod}
                  </div>
                  <div className="mt-1 text-muted small">
                    Trạng thái thanh toán:{" "}
                    <Badge bg={paymentStatus.variant} className="status-pill">
                      {paymentStatus.label}
                    </Badge>
                  </div>

                  <div className="d-grid gap-2 mt-4">
                    <Button
                      className="btn-saokim w-100"
                      onClick={() => navigate("/account/orders")}
                    >
                      Về trang Đơn hàng của tôi
                    </Button>
                    <Button
                      variant="outline-primary"
                      className="w-100"
                      disabled={!invoiceId || downloading}
                      onClick={handleDownloadInvoice}
                    >
                      {downloading ? "Đang tải hóa đơn..." : "Tải hóa đơn"}
                    </Button>
                  </div>
                </div>

                {renderTimeline()}
              </Col>
            </Row>
          )}
        </Container>
      </section>
      <EcommerceFooter />
    </div>
  );
}
