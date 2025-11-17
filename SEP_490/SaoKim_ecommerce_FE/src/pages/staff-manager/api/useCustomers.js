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

  async function handleJson(res, actionName) {
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[${actionName}] error`, res.status, text);
      throw new Error(`${actionName} failed (${res.status})`);
    }
    return res.json();
  }

  // Lấy danh sách khách hàng
  const fetchCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}${qs}`, {
      credentials: "include",
    });
    return handleJson(res, "Fetch customers");
  };

  // Lấy chi tiết 1 khách hàng
  const getCustomerById = async (id) => {
    const res = await fetch(`${base}/${id}`, {
      credentials: "include",
    });
    return handleJson(res, "Get customer detail");
  };

  // Lịch sử đơn hàng
  const fetchCustomerOrders = async (id, params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/${id}/orders${qs}`, {
      credentials: "include",
    });
    return handleJson(res, "Fetch customer orders");
  };

  // Ban / Unban
  const updateCustomerStatus = async (id, isBanned) => {
    const res = await fetch(`${base}/${id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ isBanned }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Update status] error", res.status, text);
      throw new Error(`Update status failed (${res.status})`);
    }
    return true;
  };

  // Thêm ghi chú
  const addCustomerNote = async (id, content) => {
    const res = await fetch(`${base}/${id}/notes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });
    return handleJson(res, "Add note");
  };

  // Export Excel (.xlsx)
  const exportCustomers = async (params = {}) => {
    const qs = buildQuery(params);
    const res = await fetch(`${base}/export${qs}`, {
      credentials: "include",
      headers: {
        Accept:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[Export customers] error", res.status, text);
      throw new Error(`Export customers failed (${res.status})`);
    }
    return res.blob();
  };

  return {
    fetchCustomers,
    getCustomerById,
    fetchCustomerOrders,
    updateCustomerStatus,
    addCustomerNote,
    exportCustomers,
  };
}
