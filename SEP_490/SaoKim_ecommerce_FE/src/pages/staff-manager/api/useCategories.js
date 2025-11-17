export default function useCategoriesApi() {
  const base = "/api/categories"; // route chuẩn bạn đã tạo ở backend

  const getCategories = async () => {
    const res = await fetch(base);
    if (!res.ok) throw new Error("Failed to load categories");
    return await res.json(); // [{ id, name, slug }]
  };

  const getCategory = async (id) => {
    const res = await fetch(`${base}/${id}`);
    if (!res.ok) throw new Error("Category not found");
    return await res.json();
  };

  const createCategory = async (payload) => {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Create category failed");
    }
    return await res.json();
  };

  const updateCategory = async (id, payload) => {
    const res = await fetch(`${base}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Update category failed");
    return await res.json();
  };

  const deleteCategory = async (id) => {
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete category failed");
    return await res.json();
  };

  return {
    getCategories,
    getCategory,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
