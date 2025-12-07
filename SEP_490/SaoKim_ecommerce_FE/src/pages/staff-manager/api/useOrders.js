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

  // lấy token cho staff
  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("staffToken") || localStorage.getItem("token");
    return token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {};
  };

  async function handleJson(res, actionName) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${actionName}] lỗi`, res.status, text);

      let message = `${actionName} thất bại (mã ${res.status})`;
      if (text) {
        try {
          const data = JSON.parse(text);
          message = data?.message || data?.error || message;
        } catch {
          message = text;
        }
      }

      throw new Error(message);
    }
    return res.json();
  }

  // LẤY DANH SÁCH ĐƠN HÀNG
  const fetchOrders = async (params = {}) => {
    const cleaned = { ...params };
    if (cleaned.status === "all") {
      delete cleaned.status;
    }

    const qs = buildQuery(cleaned);
    const res = await fetch(`${base}${qs}`, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
    return handleJson(res, "Tải đơn hàng");
  };

  // LẤY CHI TIẾT 1 ĐƠN
  const fetchOrderDetail = async (orderId) => {
    const res = await fetch(`${base}/${orderId}`, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
    return handleJson(res, "Tải chi tiết đơn hàng");
  };

  // LẤY LIST ITEMS CỦA 1 ĐƠN
  const fetchOrderItems = async (orderId) => {
    const res = await fetch(`${base}/${orderId}/items`, {
      method: "GET",
      headers: {
        ...getAuthHeaders(),
      },
      credentials: "include",
    });
    return handleJson(res, "Tải danh sách sản phẩm của đơn");
  };

  // CẬP NHẬT TRẠNG THÁI 1 ĐƠN
  const updateOrderStatus = async (orderId, status) => {
    const res = await fetch(`${base}/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
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
        // ignore
      }

      console.error("[Cập nhật trạng thái đơn] lỗi", res.status, message);
      throw new Error(message);
    }

    return true;
  };

  // XÓA ĐƠN HÀNG (PHẢI Ở TRẠNG THÁI Cancelled)
  const deleteOrder = async (orderId) => {
    const res = await fetch(`${base}/${orderId}`, {
      method: "DELETE",
      headers: {
        ...getAuthHeaders(),
      },
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
    fetchOrderDetail,
    fetchOrderItems,
    updateOrderStatus,
    deleteOrder,
  };
}
