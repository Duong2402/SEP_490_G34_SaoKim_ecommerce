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
      console.error(`[${actionName}] error`, res.status, text);
      throw new Error(`${actionName} failed (${res.status})`);
    }
    return res.json();
  }

  // Fetch customers (list)
  const fetchCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}${qs}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Fetch customers");
  };

  // Get customer detail
  const getCustomerById = async (id) => {
    const res = await fetch(`${base}/${id}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Get customer detail");
  };

  // Fetch customer orders (Recent Orders)
  const fetchCustomerOrders = async (id, params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/${id}/orders${qs}`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Fetch customer orders");
  };

  // Soft delete customer
  const deleteCustomer = async (id) => {
    const res = await fetch(`${base}/${id}`, {
      method: "DELETE",
      headers: withAuth(),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Delete customer] error", res.status, text);
      throw new Error(`Delete customer failed (${res.status})`);
    }

    return true;
  };

  // Add customer note (Internal Notes)
  const addCustomerNote = async (id, content) => {
    const res = await fetch(`${base}/${id}/notes`, {
      method: "POST",
      headers: withAuth({
        "Content-Type": "application/json",
      }),
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    return handleJson(res, "Add note");
  };
  // Update customer note
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
    return handleJson(res, "Update customer note");
  };

  // Delete customer note
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
      console.error("[Delete customer note] error", res.status, text);
      throw new Error(`Delete customer note failed (${res.status})`);
    }

    return true;
  };

  // Export Excel (.xlsx)
  const exportCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/export${qs}`, {
      method: "GET",
      headers: withAuth({
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      credentials: "include",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Export customers] error", res.status, text);
      throw new Error(`Export customers failed (${res.status})`);
    }

    return res.blob();
  };

  // Update order status
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
      console.error("[Update order status] error", res.status, text);
      throw new Error(`Update order status failed (${res.status})`);
    }

    return true;
  };

  // Fetch items in an order
  const fetchOrderItems = async (orderId) => {
    const res = await fetch(`/api/staff/orders/${orderId}/items`, {
      method: "GET",
      headers: withAuth(),
      credentials: "include",
    });
    return handleJson(res, "Fetch order items");
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
