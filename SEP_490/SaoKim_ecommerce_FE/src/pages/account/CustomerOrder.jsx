import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function CustomerOrder() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [userId, setUserId] = useState(null);
  const navigate = useNavigate();

  // Lấy base URL từ .env (giống http.ts)
  const apiBase =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL
      : "";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchUserId = async () => {
      try {
        const res = await fetch(`${apiBase}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Không lấy được thông tin user");
        const data = await res.json();
        setUserId(data.userID || data.id); // tuỳ API trả ra
      } catch (e) {
        setError(e.message || "Lỗi user");
      }
    };

    fetchUserId();
  }, [navigate, apiBase]);

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem("token");

    const fetchOrders = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(
          `${apiBase}/api/customers/${userId}/orders?page=${page}&pageSize=${pageSize}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Không lấy được đơn hàng");
        const data = await res.json();
        setOrders(data.items || []);
        setTotal(data.total || 0);
      } catch (e) {
        setError(e.message || "Lỗi tải đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [userId, page, pageSize, apiBase]);

  const nextPage = () => setPage((p) => p + 1);
  const prevPage = () => setPage((p) => Math.max(1, p - 1));

  // Lấy danh sách tên sản phẩm từ một order (gộp thành chuỗi)
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
              <th style={{ padding: 8, border: "1px solid #eee" }}>Mã đơn</th>
              <th style={{ padding: 8, border: "1px solid #eee" }}>Ngày đặt</th>
              <th style={{ padding: 8, border: "1px solid #eee" }}>Sản phẩm</th>
              <th style={{ padding: 8, border: "1px solid #eee" }}>Tổng tiền</th>
              <th style={{ padding: 8, border: "1px solid #eee" }}>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId || o.OrderId}>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {o.orderId || o.OrderId}
                </td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {o.createdAt
                    ? new Date(o.createdAt).toLocaleString("vi-VN")
                    : "-"}
                </td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {getProductNames(o)}
                </td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {o.total != null
                    ? Number(o.total).toLocaleString("vi-VN")
                    : "0"}{" "}
                  ₫
                </td>
                <td style={{ padding: 8, border: "1px solid #eee" }}>
                  {o.status || "-"}
                </td>
              </tr>
            ))}
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
