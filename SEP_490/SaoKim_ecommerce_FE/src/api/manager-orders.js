import http from "./http";

export const MANAGER_ORDERS_BASE_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_MANAGER_ORDERS_BASE_URL) ||
  "/staff/orders";

export async function fetchManagerOrders({ page = 1, pageSize = 10, status, search } = {}) {
  const keyword = search?.trim() || undefined;
  const params = {
    page,
    pageSize,
    status: status || undefined,
    search: keyword,
    q: keyword,
  };

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
