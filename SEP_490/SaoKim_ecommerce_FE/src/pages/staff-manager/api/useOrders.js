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
      console.error(`[${actionName}] lỗi`, res.status, text);
      throw new Error(`${actionName} thất bại (mã ${res.status})`);
    }
    return res.json();
  }

  const fetchOrders = async (params = {}) => {
    const cleaned = { ...params };
    if (cleaned.status === "all") {
      delete cleaned.status;
    }

    const qs = buildQuery(cleaned);
    const res = await fetch(`${base}${qs}`, {
      credentials: "include",
    });
    return handleJson(res, "Tải đơn hàng");
  };

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
      let message = `Cập nhật trạng thái đơn thất bại (mã ${res.status})`;
      try {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            message = data?.message || data?.error || text;
          } catch {
            message = text;
          }
        }
      } catch {
        // fall back to default message
      }

      console.error("[Cập nhật trạng thái đơn] lỗi", res.status, message);
      throw new Error(message);
    }

    return true;
  };

  const fetchOrderItems = async (orderId) => {
    const res = await fetch(`${base}/${orderId}/items`, {
      credentials: "include",
    });
    return handleJson(res, "Tải sản phẩm trong đơn");
  };
  const deleteOrder = async (orderId) => {
    const res = await fetch(`${base}/${orderId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Xóa đơn hàng] lỗi", res.status, text);
      throw new Error(`Xóa đơn hàng thất bại (mã ${res.status})`);
    }

    return true;
  };

  return {
    fetchOrders,
    updateOrderStatus,
    fetchOrderItems,
    deleteOrder,
  };
}
