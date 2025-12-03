// src/pages/staff-manager/api/useCustomers.js
export default function useCustomersApi() {
  const base = "/api/customers";

  const buildQuery = (params = {}) => {
    const s = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      s.set(k, String(v));
    });
    const qs = s.toString();
    return qs ? `?${qs}` : "";
  };

  const getToken = () => {
    try {
      return localStorage.getItem("token");
    } catch {
      return null;
    }
  };

  const withAuth = (extraHeaders = {}) => {
    const token = getToken();
    const headers = { ...extraHeaders };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  async function handleJson(res, actionName) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${actionName}] lỗi`, res.status, text);
      throw new Error(`${actionName} thất bại (mã ${res.status})`);
    }
    return res.json();
  }

  const fetchCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}${qs}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Tải danh sách khách hàng");
  };

  const getCustomerById = async (id) => {
    const res = await fetch(`${base}/${id}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Lấy chi tiết khách hàng");
  };

  const fetchCustomerOrders = async (id, params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/${id}/orders${qs}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Tải đơn hàng của khách");
  };

  const deleteCustomer = async (id) => {
    const res = await fetch(`${base}/${id}`, {
      method: "DELETE",
      headers: withAuth(),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Xóa khách hàng] lỗi", res.status, text);
      throw new Error(`Xóa khách hàng thất bại (mã ${res.status})`);
    }

    return true;
  };

  const addCustomerNote = async (id, content) => {
    const res = await fetch(`${base}/${id}/notes`, {
      method: "POST",
      headers: withAuth({
        "Content-Type": "application/json",
      }),
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    return handleJson(res, "Thêm ghi chú");
  };

  const updateCustomerNote = async (customerId, noteId, content) => {
    const res = await fetch(`${base}/${customerId}/notes/${noteId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    return handleJson(res, "Cập nhật ghi chú");
  };

  const deleteCustomerNote = async (customerId, noteId) => {
    const res = await fetch(`${base}/${customerId}/notes/${noteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Xóa ghi chú khách] lỗi", res.status, text);
      throw new Error(`Xóa ghi chú thất bại (mã ${res.status})`);
    }

    return true;
  };

  const exportCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/export${qs}`, {
      method: "GET",
      headers: withAuth({
        Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Xuất khách hàng] lỗi", res.status, text);
      throw new Error(`Xuất danh sách thất bại (mã ${res.status})`);
    }

    return res.blob();
  };

  const updateOrderStatus = async (orderId, status) => {
    const res = await fetch(`/api/staff/orders/${orderId}/status`, {
      method: "PATCH",
      headers: withAuth({
        "Content-Type": "application/json",
      }),
      credentials: "include",
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Cập nhật trạng thái đơn] lỗi", res.status, text);
      throw new Error(`Cập nhật trạng thái đơn thất bại (mã ${res.status})`);
    }

    return true;
  };

  const fetchOrderItems = async (orderId) => {
    const res = await fetch(`/api/staff/orders/${orderId}/items`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Tải sản phẩm trong đơn");
  };

  return {
    fetchCustomers,
    getCustomerById,
    fetchCustomerOrders,
    deleteCustomer,
    addCustomerNote,
    updateCustomerNote,
    deleteCustomerNote,
    exportCustomers,
    updateOrderStatus,
    fetchOrderItems,
  };
}
