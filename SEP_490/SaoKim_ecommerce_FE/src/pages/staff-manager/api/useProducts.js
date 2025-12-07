// src/pages/staff-manager/api/useProducts.js
import { useCallback, useMemo, useState } from "react";
import { apiFetch } from "../../../api/lib/apiClient"; 

/**
 * Hook CRUD cho sản phẩm Staff
 */
export default function useProductsApi() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (path, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(path, options);
      return res;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  async function fetchProducts({
    q,
    page = 1,
    pageSize = 10,
    sortBy = "id",
    sortDir = "asc",
  } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);

    const res = await request(`/api/products?${params.toString()}`, {
      method: "GET",
    });
    const data = await res.json();

    const payload = data?.data || data;
    return payload; // { items, page, pageSize, total, totalPages }
  }

  const fetchProduct = useCallback(
    async (id) => {
      if (id == null) throw new Error("Thiếu mã sản phẩm");
      const res = await request(`/api/Products/${id}`, { method: "GET" });
      return res.json(); // { product, related }
    },
    [request]
  );

  const createProduct = useCallback(
    async (payload) => {
      const formData = new FormData();
      formData.append("Sku", payload.sku);
      formData.append("Name", payload.name);

      if (payload.categoryId != null) {
        formData.append("CategoryId", String(payload.categoryId));
      }

      if (payload.unit != null) {
        formData.append("Unit", payload.unit);
      }

      formData.append("Price", String(payload.price ?? 0));
      formData.append("Quantity", String(payload.quantity ?? 0));
      formData.append("Stock", String(payload.stock ?? 0));
      formData.append("Active", String(payload.active ?? true));

      if (payload.description) formData.append("Description", payload.description);
      if (payload.supplier) formData.append("Supplier", payload.supplier);
      if (payload.note) formData.append("Note", payload.note);

      if (payload.imageFile) {
        formData.append("ImageFile", payload.imageFile);
      }

      const res = await request(`/api/Products`, {
        method: "POST",
        body: formData,
      });

      const created = await res.json().catch(() => null);

      setProducts((prev) => [created ?? payload, ...prev]);
      return created;
    },
    [request]
  );

  const updateProduct = useCallback(
    async (id, payload) => {
      if (id == null) throw new Error("Thiếu mã sản phẩm");

      const formData = new FormData();
      formData.append("Sku", payload.sku);
      formData.append("Name", payload.name);

      if (payload.categoryId != null) {
        formData.append("CategoryId", String(payload.categoryId));
      }

      if (payload.unit != null) {
        formData.append("Unit", payload.unit);
      }

      formData.append("Price", String(payload.price ?? 0));
      formData.append("Quantity", String(payload.quantity ?? 0));
      formData.append("Stock", String(payload.stock ?? 0));
      formData.append("Active", String(payload.active ?? true));

      if (payload.description) formData.append("Description", payload.description);
      if (payload.supplier) formData.append("Supplier", payload.supplier);
      if (payload.note) formData.append("Note", payload.note);
      if (payload.updateBy) formData.append("UpdateBy", payload.updateBy);

      if (payload.imageFile) {
        formData.append("ImageFile", payload.imageFile);
      }

      const res = await request(`/api/Products/${id}`, {
        method: "PUT",
        body: formData,
      });

      const updated = await res.json().catch(() => null);

      setProducts((prev) =>
        prev.map((p) =>
          (p.productID ?? p.id) === id ? { ...p, ...payload, ...(updated || {}) } : p
        )
      );
      return updated;
    },
    [request]
  );

  const deleteProduct = useCallback(
    async (id) => {
      if (id == null) throw new Error("Thiếu mã sản phẩm");
      await request(`/api/Products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => (p.productID ?? p.id) !== id));
      return true;
    },
    [request]
  );

  const updateProductStatus = useCallback(
    async (id, status) => {
      if (id == null) throw new Error("Thiếu mã sản phẩm");
      if (!status) throw new Error("Thiếu trạng thái mới");

      const body = JSON.stringify({ status });

      const res = await request(`/api/Products/${id}/status`, {
        method: "PATCH",
        body,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const result = await res.json().catch(() => null);

      setProducts((prev) =>
        prev.map((p) =>
          (p.productID ?? p.id) === id ? { ...p, status, ...(result || {}) } : p
        )
      );

      return result;
    },
    [request]
  );

  const getUoms = useCallback(async () => {
    const res = await request(`/api/warehousemanager/unit-of-measures`, {
      method: "GET",
    });
    const data = await res.json().catch(() => []);
    return data || [];
  }, [request]);

  const emptyProduct = useMemo(
    () => ({
      productID: 0,
      productName: "",
      productCode: "",
      category: "",
      unit: "",
      price: 0,
      quantity: 0,
      stock: 0,
      status: "",
      image: "",
      description: "",
      supplier: "",
      note: "",
      created: new Date().toISOString(),
      date: new Date().toISOString(),
      createAt: new Date().toISOString(),
      createBy: "",
      updateBy: "",
      updateAt: new Date().toISOString(),
    }),
    []
  );

  return {
    products,
    loading,
    error,
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    updateProductStatus,
    setProducts,
    emptyProduct,
    getUoms,
  };
}
