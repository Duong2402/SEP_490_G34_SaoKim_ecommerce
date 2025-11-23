// src/pages/staff-manager/api/useOrders.js
export default function useOrdersApi() {
  const base = "/api/staff/orders";

  const buildQuery = (params = {}) => {
    const s = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      s.set(k, String(v));
    });
    const qs = s.toString();
    return qs ? `?${qs}` : "";
  };

  async function handleJson(res, actionName) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${actionName}] error`, res.status, text);
      throw new Error(`${actionName} failed (${res.status})`);
    }
    return res.json();
  }

  // List orders
  const fetchOrders = async (params = {}) => {
    const cleaned = { ...params };
    // KHÔNG gửi status=all lên backend
    if (cleaned.status === "all") {
      delete cleaned.status;
    }

    const qs = buildQuery(cleaned);
    const res = await fetch(`${base}${qs}`, {
      credentials: "include",
    });
    return handleJson(res, "Fetch orders");
  };

  // Update order status
  const updateOrderStatus = async (orderId, status) => {
    const res = await fetch(`${base}/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Update order status] error", res.status, text);
      throw new Error(`Update order status failed (${res.status})`);
    }

    return true;
  };

  // Fetch items in an order
  const fetchOrderItems = async (orderId) => {
    const res = await fetch(`${base}/${orderId}/items`, {
      credentials: "include",
    });
    return handleJson(res, "Fetch order items");
  };

  return {
    fetchOrders,
    updateOrderStatus,
    fetchOrderItems,
  };
}
