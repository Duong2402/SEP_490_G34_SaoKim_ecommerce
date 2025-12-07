import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchManagerOrders } from "../../../api/manager-orders";
import http from "../../../api/http";

const STATUS_OPTIONS = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Chờ xử lý", value: "Pending" },
  { label: "Đang xử lý", value: "Processing" },
  { label: "Đang giao", value: "Shipping" },
  { label: "Hoàn tất", value: "Completed" },
  { label: "Đã hủy", value: "Cancelled" },
];

const STATUS_LABELS = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  shipping: "Đang giao",
  completed: "Hoàn tất",
  cancelled: "Đã hủy",
};

const DEFAULT_PAGE_SIZE = 10;

export default function ManagerOrderListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [invoicesMap, setInvoicesMap] = useState({});

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchManagerOrders({
        page,
        pageSize,
        status: statusFilter !== "all" ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      });

      const payload = response?.data?.data ?? response?.data ?? response ?? {};
      const rawItems = payload.items ?? [];
      const items = Array.isArray(rawItems) ? rawItems : [];
      const paginationInfo = payload.pagination ?? {};

      setOrders(items);

      const nextTotal = Number(paginationInfo.total ?? payload.total ?? items.length ?? 0) || 0;
      const nextPageSize =
        Number(paginationInfo.pageSize ?? payload.pageSize ?? pageSize) || DEFAULT_PAGE_SIZE;
      const nextPageRaw = paginationInfo.page ?? payload.page ?? page;
      const nextPage = Number.isFinite(Number(nextPageRaw)) ? Number(nextPageRaw) : page;
      const safePage = nextPage > 0 ? nextPage : 1;

      if (nextPageSize !== pageSize) setPageSize(nextPageSize);
      if (safePage !== page) setPage(safePage);
      setTotal(nextTotal);
    } catch (err) {
      console.error("Failed to load orders:", err);
      const notFound =
        err?.response?.status === 404
          ? "Không tìm thấy endpoint đơn hàng. Kiểm tra MANAGER_ORDERS_BASE_URL hoặc biến môi trường VITE_MANAGER_ORDERS_BASE_URL đã khớp route backend chưa (mặc định /api/staff/orders)."
          : null;
      setError(
        notFound || err?.response?.data?.message || err?.message || "Không thể tải danh sách đơn hàng."
      );
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, debouncedSearch]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    let cancelled = false;
    const loadInvoices = async () => {
      const candidates = orders.filter(
        (o) => !(o.invoiceCode || o.invoice?.code) && (o.orderCode || o.code || o.id || o.orderId)
      );
      if (!candidates.length) return;

      await Promise.all(
        candidates.map(async (order) => {
          try {
            const orderCode = order.orderCode || order.code || order.OrderCode || order.Code;
            const orderId = order.orderId || order.id || order.OrderId || order.Id;
            const key = orderId || orderCode;
            if (!key) return;

            const res = await http.get("/invoices", {
              params: {
                q: orderCode || orderId,
                orderCode: orderCode || undefined,
                orderId: orderId || undefined,
                pageSize: 50,
              },
            });

            const payload = res?.data ?? res;
            const list = payload?.items ?? payload ?? [];
            const normalizedOrderId = String(orderId || "").trim().toLowerCase();
            const normalizedOrderCode = String(orderCode || "").trim().toLowerCase();

            const match = list.find((inv) => {
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

            if (!cancelled && match) {
              setInvoicesMap((prev) => ({
                ...prev,
                [key]: match.invoiceCode || match.code,
              }));
            }
          } catch (err) {
            console.error("Không tải được hóa đơn cho đơn hàng", order.orderCode || order.id, err);
          }
        })
      );
    };

    loadInvoices();
    return () => {
      cancelled = true;
    };
  }, [orders]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / (pageSize || DEFAULT_PAGE_SIZE))),
    [total, pageSize]
  );

  const handleRefresh = () => {
    loadOrders();
  };

  const handleStatusChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const goToPage = (nextPage) => {
    const safePage = Math.max(1, Math.min(totalPages, nextPage));
    setPage(safePage);
  };

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Danh sách đơn hàng</h2>
          <p className="manager-panel__subtitle">
            Theo dõi đơn hàng khách hàng với bộ lọc trạng thái, tìm kiếm và phân trang nhanh.
          </p>
        </div>
      </div>

      <OrderListToolbar
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        loading={loading}
        onSearchChange={handleSearchChange}
        onStatusChange={handleStatusChange}
        onRefresh={handleRefresh}
      />

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <div>{error}</div>
          <button type="button" className="btn btn-sm btn-outline-light" onClick={handleRefresh}>
            Thử lại
          </button>
        </div>
      )}

      <div className="manager-table__wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Hóa đơn</th>
              <th style={{ width: 140 }}></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="manager-table__empty">
                  <div className="d-flex align-items-center justify-content-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Đang tải đơn hàng...</span>
                  </div>
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="manager-table__empty">
                  {searchTerm
                    ? "Không tìm thấy khách hàng hoặc đơn hàng phù hợp."
                    : "Chưa có đơn hàng."}
                </td>
              </tr>
            ) : (
              orders.map((order, index) => {
                const detailId = order.orderId ?? order.id;
                const key = detailId ?? order.orderCode ?? order.code ?? index;
                const code = order.orderCode ?? order.code ?? detailId ?? "-";
                const customerName = order.customerName ?? order.customer?.name ?? "N/A";
                const phone = order.phone ?? order.customerPhone ?? order.customer?.phone;
                const totalAmount = order.totalAmount ?? order.total ?? order.amount;
                const createdAt = order.createdAt ?? order.created ?? order.createdDate;
                const orderKey = detailId || code;
                const invoiceCode =
                  order.invoiceCode ||
                  order.invoice?.code ||
                  (orderKey ? invoicesMap[orderKey] : null) ||
                  "-";

                return (
                  <tr key={key}>
                    <td>{code}</td>
                    <td>{customerName}</td>
                    <td>{phone || "-"}</td>
                    <td>{formatCurrency(totalAmount)}</td>
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td>{formatDateTime(createdAt)}</td>
                    <td>{invoiceCode || "-"}</td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        className="manager-btn manager-btn--outline"
                        onClick={() =>
                          detailId &&
                          navigate(`/manager/orders/${detailId}`, {
                            state: { order },
                          })
                        }
                        disabled={!detailId}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="manager-pagination">
        <button type="button" onClick={() => goToPage(page - 1)} disabled={page <= 1 || loading}>
          Trước
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {renderPageNumbers(page, totalPages, goToPage).map((item) => item)}
        </div>

        <button
          type="button"
          onClick={() => goToPage(page + 1)}
          disabled={page >= totalPages || loading}
        >
          Tiếp
        </button>

        <span style={{ marginLeft: "auto" }}>
          Trang {page} / {totalPages} • Tổng {total.toLocaleString("vi-VN")} đơn hàng
        </span>
      </div>
    </div>
  );
}

function OrderListToolbar({
  searchTerm,
  statusFilter,
  loading,
  onSearchChange,
  onStatusChange,
  onRefresh,
}) {
  return (
    <div className="manager-filters">
      <input
        className="manager-input"
        type="search"
        placeholder="Tìm theo tên khách hàng hoặc số điện thoại"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
      />

      <select
        className="manager-select"
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value)}
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
        <button
          type="button"
          className="manager-btn manager-btn--outline"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Đang làm mới..." : "Làm mới"}
        </button>
      </div>
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

function renderPageNumbers(current, totalPages, onClick) {
  const nodes = [];
  const windowSize = 2;
  const start = Math.max(1, current - windowSize);
  const end = Math.min(totalPages, current + windowSize);

  if (start > 1) {
    nodes.push(
      <button key={1} type="button" className="manager-btn manager-btn--outline" onClick={() => onClick(1)}>
        1
      </button>
    );
    if (start > 2) nodes.push(<span key="start-ellipsis">...</span>);
  }

  for (let p = start; p <= end; p++) {
    const isCurrent = p === current;
    nodes.push(
      <button
        key={p}
        type="button"
        className="manager-btn manager-btn--outline"
        style={
          isCurrent
            ? {
                background: "var(--manager-blue-600)",
                color: "#fff",
                borderColor: "var(--manager-blue-600)",
              }
            : undefined
        }
        onClick={() => onClick(p)}
        disabled={isCurrent}
      >
        {p}
      </button>
    );
  }

  if (end < totalPages) {
    if (end < totalPages - 1) nodes.push(<span key="end-ellipsis">...</span>);
    nodes.push(
      <button
        key={totalPages}
        type="button"
        className="manager-btn manager-btn--outline"
        onClick={() => onClick(totalPages)}
      >
        {totalPages}
      </button>
    );
  }

  return nodes;
}
