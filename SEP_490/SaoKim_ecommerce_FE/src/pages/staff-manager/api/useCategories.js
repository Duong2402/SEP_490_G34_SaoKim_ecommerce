export default function useCategoriesApi() {
  const base = "/api/categories";

  const getCategories = async () => {
    const res = await fetch(base);
    if (!res.ok) throw new Error("Không tải được danh mục");
    return await res.json(); 
  };

  const getCategory = async (id) => {
    const res = await fetch(`${base}/${id}`);
    if (!res.ok) throw new Error("Danh mục không tồn tại");
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
      throw new Error(err.message || "Tạo danh mục thất bại");
    }
    return await res.json();
  };

  const updateCategory = async (id, payload) => {
    const res = await fetch(`${base}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Cập nhật danh mục thất bại");
    return await res.json();
  };

  const deleteCategory = async (id) => {
    const res = await fetch(`${base}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Xóa danh mục thất bại");
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
