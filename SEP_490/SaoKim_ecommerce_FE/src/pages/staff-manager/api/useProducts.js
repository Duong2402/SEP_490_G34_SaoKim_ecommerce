// src/pages/staff-manager/api/useProducts.js
import { useCallback, useMemo, useState } from "react";

/**
 * Hook CRUD cho sản phẩm Staff
 */
export default function useProductsApi() {
  const apiBase = "https://localhost:7278";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const jsonHeaders = useMemo(() => ({ "Content-Type": "application/json" }), []);

  const request = useCallback(
    async (path, options = {}) => {
      setLoading(true);
      setError(null);
      try {
        const isFormData = options.body instanceof FormData;
        const headers = isFormData ? options.headers || {} : { ...jsonHeaders, ...(options.headers || {}) };

        const res = await fetch(`${apiBase}${path}`, {
          ...options,
          headers,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Yêu cầu thất bại (mã ${res.status})`);
        }

        const ct = res.headers.get("content-type") || "";
        return ct.includes("application/json") ? await res.json() : null;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiBase, jsonHeaders]
  );

  async function fetchProducts({ q, page = 1, pageSize = 10, sortBy = "id", sortDir = "asc" } = {}) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    params.set("sortBy", sortBy);
    params.set("sortDir", sortDir);

    const res = await fetch(`/api/products?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || "Không tải được danh sách sản phẩm");
    }
    const data = await res.json();

    const payload = data?.data || data;
    return payload; // { items, page, pageSize, total, totalPages }
  }

  const fetchProduct = useCallback(
    async (id) => {
      if (id == null) throw new Error("Thiếu mã sản phẩm");
      return await request(`/api/Products/${id}`, { method: "GET" });
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

      const created = await request(`/api/Products`, {
        method: "POST",
        body: formData,
      });

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

      const updated = await request(`/api/Products/${id}`, {
        method: "PUT",
        body: formData,
      });

      setProducts((prev) =>
        prev.map((p) => ((p.productID ?? p.id) === id ? { ...p, ...payload, ...(updated || {}) } : p))
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
    setProducts,
    emptyProduct,
  };
}
