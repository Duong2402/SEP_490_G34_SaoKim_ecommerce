import http from "./http";

// Base URL cho danh sách đơn hàng (có thể override qua VITE_MANAGER_ORDERS_BASE_URL)
// Mặc định trỏ về /api/staff/orders vì BE đang phục vụ route này cho màn hình staff (đã hoạt động).
export const MANAGER_ORDERS_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_MANAGER_ORDERS_BASE_URL) ||
  "/staff/orders";

// Fetch order list with filters + pagination
export async function fetchManagerOrders({ page = 1, pageSize = 10, status, search } = {}) {
  const keyword = search?.trim() || undefined;
  const params = {
    page,
    pageSize,
    status: status || undefined,
    search: keyword,
    // gửi thêm q để tương thích backend đang dùng ở màn staff
    q: keyword,
  };

  // http interceptor already unwraps res.data; keep fallback for BE that wraps payload
  const res = await http.get(MANAGER_ORDERS_BASE_URL, { params });
  return res?.data ?? res;
}

export async function fetchManagerOrderDetail(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await http.get(`${MANAGER_ORDERS_BASE_URL}/${orderId}`);
  return res?.data ?? res;
}

export async function fetchManagerOrderItems(orderId) {
  if (!orderId) throw new Error("orderId is required");
  const res = await http.get(`${MANAGER_ORDERS_BASE_URL}/${orderId}/items`);
  return res?.data ?? res;
}

export default {
  fetchManagerOrders,
  fetchManagerOrderDetail,
  fetchManagerOrderItems,
};
