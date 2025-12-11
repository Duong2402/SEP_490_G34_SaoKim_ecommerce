import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  fetchManagerOrderDetail,
  fetchManagerOrderItems,
} from "../../../api/manager-orders";
import http from "../../../api/http";

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

export default function ManagerOrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const initialOrder = location.state?.order || null;

  const [order, setOrder] = useState(initialOrder);
  const [items, setItems] = useState([]);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [invoiceInfo, setInvoiceInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoadingOrder(true);
        const res = await fetchManagerOrderDetail(orderId);
        const payload = res?.data ?? res;
        if (!cancelled) {
          setOrder(payload);
          if (Array.isArray(payload?.items)) {
            setItems(payload.items);
            setLoadingItems(false);
          }
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể lấy thông tin đơn hàng.");
      } finally {
        if (!cancelled) setLoadingOrder(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;

    const loadItems = async () => {
      try {
        setLoadingItems(true);
        const res = await fetchManagerOrderItems(orderId);
        if (!cancelled) {
          const payload = res?.data?.items ?? res?.items ?? res ?? [];
          setItems(Array.isArray(payload) ? payload : []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || "Không thể lấy danh sách sản phẩm.");
      } finally {
        if (!cancelled) setLoadingItems(false);
      }
    };

    if (items.length === 0) {
      loadItems();
    } else {
      setLoadingItems(false);
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    const orderCode =
      order?.orderCode || order?.code || order?.OrderCode || order?.Code || order?.orderId || order?.id;
    const orderKey = orderCode || orderId;
    if (!orderKey) return;

    const loadInvoice = async () => {
      try {
        setLoadingInvoice(true);
        const res = await http.get("/invoices", {
          params: {
            q: orderKey,
            orderCode: orderCode || undefined,
            orderId: order?.orderId || order?.id || orderId || undefined,
            pageSize: 200, 
          },
        });
        const payload = res?.data ?? res;
        const all = payload?.items ?? payload ?? [];
        const normalizedOrderId = String(order?.orderId || order?.id || orderId || "")
          .trim()
          .toLowerCase();
        const normalizedOrderCode = String(orderCode || "").trim().toLowerCase();

        const matches = all.filter((inv) => {
          const invOrderId = String(inv.orderId || inv.OrderId || "").trim().toLowerCase();
          const invOrderCode = String(inv.orderCode || inv.OrderCode || "").trim().toLowerCase();
          const invCode = String(inv.invoiceCode || inv.code || "").trim().toLowerCase();

          return (
            (normalizedOrderId && invOrderId === normalizedOrderId) ||
            (normalizedOrderCode && invOrderCode === normalizedOrderCode) ||
            (normalizedOrderId && invCode.endsWith(`-${normalizedOrderId}`)) ||
            (normalizedOrderId && invCode.includes(`-${normalizedOrderId}`))
          );
        });

        const match = matches[0] || null;
        if (!cancelled) setInvoiceInfo(match);
      } catch (err) {
        console.error("Không thể lấy hóa đơn liên quan:", err);
      } finally {
        if (!cancelled) setLoadingInvoice(false);
      }
    };

    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [order, orderId]);

  const statusLabel = useMemo(() => {
    const key = String(order?.status || "").toLowerCase();
    return STATUS_LABELS[key] || order?.status || "Không xác định";
  }, [order]);

  const renderStatus = () => <OrderStatusBadge status={order?.status} />;

  const orderCode =
    order?.orderCode ||
    order?.code ||
    order?.OrderCode ||
    order?.Code ||
    order?.orderId ||
    order?.id ||
    orderId;

  const createdAt = order?.createdAt || order?.created || order?.createdDate;
  const totalAmount = order?.totalAmount ?? order?.total ?? order?.amount;
  const customerName = order?.customerName || order?.customer?.name || "N/A";
  const customerPhone = order?.phone || order?.customerPhone || order?.customer?.phone;
  const customerEmail = order?.customerEmail || order?.customer?.email;
  const shippingAddress =
    order?.shippingAddress ||
    order?.ShippingAddress ||
    order?.shipping_address ||
    order?.shippingAddressDto ||
    order?.address ||
    order?.Address ||
    null;
  const shippingLine1 =
    order?.shippingLine1 ||
    order?.ShippingLine1 ||
    order?.shipping_address_line1 ||
    order?.shippingLine ||
    order?.ShippingLine ||
    null;
  const shippingWard =
    order?.shippingWard || order?.ShippingWard || order?.shipping_address_ward || null;
  const shippingDistrict =
    order?.shippingDistrict || order?.ShippingDistrict || order?.shipping_address_district || null;
  const shippingProvince =
    order?.shippingProvince || order?.ShippingProvince || order?.shipping_address_province || null;
  const shippingRecipientName =
    order?.shippingRecipientName || order?.ShippingRecipientName || order?.customerName || null;
  const shippingPhoneNumber =
    order?.shippingPhoneNumber || order?.ShippingPhoneNumber || order?.customerPhone || null;
  const paymentMethod =
    order?.paymentMethod ||
    order?.PaymentMethod ||
    order?.payment?.method ||
    order?.Payment?.Method ||
    "";

  const renderShippingAddress = () => {
    const partsFromLines = [shippingLine1, shippingWard, shippingDistrict, shippingProvince]
      .filter(Boolean)
      .join(", ");
    if (partsFromLines) {
      const recipientPart = shippingRecipientName ? `${shippingRecipientName} - ` : "";
      const phonePart = shippingPhoneNumber ? ` (${shippingPhoneNumber})` : "";
      return `${recipientPart}${partsFromLines}${phonePart}`;
    }
    if (!shippingAddress) return "-";
    if (typeof shippingAddress === "object") {
      const parts = [
        shippingAddress.recipientName,
        shippingAddress.phoneNumber,
        shippingAddress.line1,
        shippingAddress.ward,
        shippingAddress.district,
        shippingAddress.province,
      ]
        .filter(Boolean)
        .join(", ");
      if (parts) return parts;
    }
    return String(shippingAddress);
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header" style={{ alignItems: "center" }}>
        <div>
          <h2 className="manager-panel__title">Đơn hàng #{orderCode}</h2>
          <p className="manager-panel__subtitle">
            Thông tin chi tiết và danh sách sản phẩm trong đơn.
          </p>
        </div>
        <button
          type="button"
          className="manager-btn manager-btn--outline"
          onClick={() => navigate(-1)}
        >
          Quay lại
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={() => navigate(0)}>
            Thử lại
          </button>
        </div>
      )}

      <div className="manager-card" style={{ marginBottom: 16 }}>
        {loadingOrder ? (
          <div className="manager-table__empty">Đang tải thông tin đơn hàng...</div>
        ) : (
          <div className="manager-detail-grid">
            <DetailRow label="Mã đơn" value={orderCode} />
            <DetailRow label="Trạng thái" value={renderStatus()} />
            <DetailRow label="Ngày tạo" value={formatDateTime(createdAt)} />
            <DetailRow label="Tổng tiền" value={formatCurrency(totalAmount)} />
            <DetailRow label="Khách hàng" value={customerName} />
            <DetailRow label="Số điện thoại" value={customerPhone || "-"} />
            <DetailRow label="Email" value={customerEmail || "-"} />
            <DetailRow label="Địa chỉ giao hàng" value={renderShippingAddress()} />
            <DetailRow label="Phương thức thanh toán" value={paymentMethod || "-"} />
            <DetailRow
              label="Mã hóa đơn"
              value={
                order?.invoiceCode ||
                order?.invoice?.code ||
                invoiceInfo?.invoiceCode ||
                invoiceInfo?.code ||
                "-"
              }
              hint={
                loadingInvoice
                  ? "Đang kiểm tra hóa đơn..."
                  : invoiceInfo?.paymentStatus || invoiceInfo?.status
                    ? `Trạng thái: ${invoiceInfo.paymentStatus || invoiceInfo.status}`
                    : invoiceInfo === null
                      ? null
                      : "Không tìm thấy hóa đơn liên quan."
              }
            />
          </div>
        )}
      </div>

      <div className="manager-card">
        <div className="manager-card__header">
          <h3 className="manager-card__title">Sản phẩm trong đơn</h3>
          {loadingItems && <span className="manager-card__hint">Đang tải sản phẩm...</span>}
        </div>

        <div className="manager-table__wrapper">
          <table className="manager-table">
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
              {loadingItems ? (
                <tr>
                  <td colSpan={5} className="manager-table__empty">
                    Đang tải sản phẩm...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="manager-table__empty">
                    Chưa có sản phẩm trong đơn hàng này.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.orderItemId ?? item.id ?? idx}>
                    <td>{idx + 1}</td>
                    <td>{item.productName ?? item.name ?? "-"}</td>
                    <td>{item.quantity ?? "-"}</td>
                    <td>{formatCurrency(item.unitPrice ?? item.price)}</td>
                    <td>{formatCurrency(item.lineTotal ?? item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, hint }) {
  return (
    <div className="manager-detail-row">
      <div className="manager-detail-label">{label}</div>
      <div className="manager-detail-value">{value || "-"}</div>
      {hint ? <div className="manager-card__hint">{hint}</div> : null}
    </div>
  );
}

function OrderStatusBadge({ status }) {
  if (!status) return "-";
  const key = String(status).toLowerCase();
  let className = "manager-status";
  let style = {};

  if (key === "pending" || key === "processing") {
    className += " manager-status--pending";
  } else if (key === "cancelled") {
    className += " manager-status--danger";
  } else if (key === "shipping") {
    style = { color: "var(--manager-blue-700)", background: "rgba(31, 118, 192, 0.12)" };
  } else if (key === "completed") {
    style = { color: "#1f7d41", background: "rgba(31, 125, 65, 0.14)" };
  } else {
    style = { color: "var(--manager-muted)", background: "rgba(92, 108, 130, 0.12)" };
  }

  return (
    <span className={className} style={style}>
      <span className="manager-status__dot" aria-hidden="true" />
      {STATUS_LABELS[key] || status}
    </span>
  );
}

function formatCurrency(value) {
  const numeric = Number(value) || 0;
  return `${numeric.toLocaleString("vi-VN")} VND`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("vi-VN");
}
