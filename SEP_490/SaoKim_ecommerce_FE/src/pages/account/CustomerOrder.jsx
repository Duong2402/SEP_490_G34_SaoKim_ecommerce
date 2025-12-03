import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  // Base URL: ưu tiên .env, nếu không có thì fallback về port backend
  const apiBase =
    (typeof import.meta !== "undefined" &&
      import.meta.env?.VITE_API_BASE_URL) ||
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
        console.log("Call orders url =", url);

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
            // ignore nếu body không phải JSON
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
    const items =
      order.items ||
      order.Items ||
      order.products ||
      order.Products ||
      [];

    if (!Array.isArray(items) || items.length === 0) return "-";

    const names = items
      .map((it) => it.productName || it.ProductName || it.name || it.Name)
      .filter(Boolean);

    return names.length > 0 ? names.join(", ") : "-";
  };

  const getProductImage = (order) => {
  const items =
    order.items ||
    order.Items ||
    order.products ||
    order.Products ||
    [];

  if (!Array.isArray(items) || items.length === 0) return "";

  const first = items[0];

  return (
    first.productImage ||
    first.ProductImage ||
    first.imageUrl ||
    first.ImageUrl ||
    ""
  );
};

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "24px auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>Đơn hàng của tôi</h2>
        <button
          onClick={() => navigate("/")}
          style={{
            border: 0,
            background: "#f3f3f3",
            borderRadius: 6,
            padding: "8px 16px",
          }}
        >
          &larr; Trở Lại
        </button>
      </div>

      {error && <div style={{ color: "#b00020" }}>{error}</div>}

      {loading ? (
        <div>Đang tải đơn hàng...</div>
      ) : orders.length === 0 ? (
        <div>Chưa có đơn hàng nào.</div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: 12,
          }}
        >
          <thead>
  <tr style={{ background: "#f5f5f7" }}>
    <th style={{ padding: 8, border: "1px solid #eee" }}>Sản phẩm</th>
    <th style={{ padding: 8, border: "1px solid #eee" }}>Ngày đặt</th>
    <th style={{ padding: 8, border: "1px solid #eee" }}>Tổng tiền</th>
    <th style={{ padding: 8, border: "1px solid #eee" }}>Trạng thái</th>
  </tr>
</thead>
<tbody>
  {orders.map((o) => {
    const img = getProductImage(o);
    return (
      <tr key={o.orderId || o.OrderId}>
        <td style={{ padding: 8, border: "1px solid #eee" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {img && (
              <img
                src={img}
                alt={getProductNames(o)}
                style={{
                  width: 48,
                  height: 48,
                  objectFit: "cover",
                  borderRadius: 4,
                  border: "1px solid #ddd",
                }}
              />
            )}
            <span>{getProductNames(o)}</span>
          </div>
        </td>
        <td style={{ padding: 8, border: "1px solid #eee" }}>
          {o.createdAt || o.CreatedAt || o.orderDate || o.OrderDate
            ? new Date(
                o.createdAt || o.CreatedAt || o.orderDate || o.OrderDate
              ).toLocaleString("vi-VN")
            : "-"}
        </td>
        <td style={{ padding: 8, border: "1px solid #eee" }}>
          {o.total != null || o.Total != null
            ? Number(o.total ?? o.Total).toLocaleString("vi-VN")
            : "0"}{" "}
          ₫
        </td>
        <td style={{ padding: 8, border: "1px solid #eee" }}>
          {o.status || o.Status || "-"}
        </td>
      </tr>
    );
  })}
</tbody>
        </table>
      )}

      {total > pageSize && (
        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <button onClick={prevPage} disabled={page === 1}>
            Trang trước
          </button>
          <span>Trang {page}</span>
          <button onClick={nextPage} disabled={page * pageSize >= total}>
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}
