// src/api/useProductsApi.js
import { useCallback, useMemo, useState } from "react";

/**
 * Hook CRUD cho Products
 * @param {string} apiBase - ví dụ: "https://localhost:7278"
 */
export default function useProductsApi() {
  const apiBase = "https://localhost:7278";
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const jsonHeaders = useMemo(
    () => ({ "Content-Type": "application/json" }),
    []
  );

  const request = useCallback(
    async (path, options = {}) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBase}${path}`, {
          headers: jsonHeaders,
          ...options,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`${res.status} ${res.statusText} - ${text}`);
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

  // GET /api/Products (trả về list)
  // const fetchProducts = useCallback(async () => {
  //   const data = await request(`/api/Products`, { method: "GET" });
  //   // Tùy backend: có thể trả array trực tiếp hoặc { items: [...] }
  //   const items = Array.isArray(data) ? data : data?.items || [];
  //   setProducts(items);
  //   return items;
  // }, [request]);

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

    const res = await fetch(`/api/products?${params.toString()}`);
    return res.json(); // { items, page, pageSize, total, totalPages }
  }

  // GET /api/Products/{id}
  const fetchProduct = useCallback(
    async (id) => {
      if (id == null) throw new Error("Missing product id");
      return await request(`/api/Products/${id}`, { method: "GET" });
    },
    [request]
  );

  // POST /api/Products
  const createProduct = useCallback(
    async (payload) => {
      console.log("payyyyload", payload);

      const created = await request(`/api/Products`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Gắn ngay vào state nếu có id
      setProducts((prev) => [created ?? payload, ...prev]);
      return created;
    },
    [request]
  );

  // PUT /api/Products/{id}
  const updateProduct = useCallback(
    async (id, payload) => {
      if (id == null) throw new Error("Missing product id");
      const updated = await request(`/api/Products/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      // Đồng bộ state theo id (có nơi dùng productID, có nơi dùng id)
      setProducts((prev) =>
        prev.map((p) =>
          (p.productID ?? p.id) === id
            ? { ...p, ...p, ...payload, ...(updated || {}) }
            : p
        )
      );
      return updated;
    },
    [request]
  );

  // DELETE /api/Products/{id}
  const deleteProduct = useCallback(
    async (id) => {
      if (id == null) throw new Error("Missing product id");
      await request(`/api/Products/${id}`, { method: "DELETE" });
      setProducts((prev) => prev.filter((p) => (p.productID ?? p.id) !== id));
      return true;
    },
    [request]
  );

  // Mẫu object product (nếu bạn cần khởi tạo form)
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
    // actions
    fetchProducts,
    fetchProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    // tiện ích
    setProducts,
    emptyProduct,
  };
}
