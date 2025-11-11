// src/pages/customers/api/useCustomers.js
export default function useCustomersApi() {
  const base = "/api/customers";

  // Lấy danh sách khách hàng
  const fetchCustomers = async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${base}?${query}`);
    if (!res.ok) throw new Error(`Failed to load customers (${res.status})`);
    return await res.json();
  };

  // Lấy chi tiết 1 khách hàng
  const getCustomerById = async (id) => {
    const res = await fetch(`${base}/${id}`);
    if (!res.ok) throw new Error("Customer not found");
    return await res.json();
  };

  return { fetchCustomers, getCustomerById };
}
