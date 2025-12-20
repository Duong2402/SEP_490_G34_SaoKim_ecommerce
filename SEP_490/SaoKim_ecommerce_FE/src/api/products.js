import http from "./http";

export const ProductsAPI = {
  // Endpoint cũ (không promo) - giữ lại nếu còn màn nào dùng
  list: (params = {}) =>
    http.get("/products", {
      params,
    }),

  // Home (mày đã ok)
  getHomeProducts: (params = {}) => http.get("/products/home", { params }),

  // Public browse (có promo)
  listPublic: (params = {}) =>
    http.get("/products/public", {
      params,
    }),

  // Batch giá hiện tại (có promo)
  getPrices: (productIds = []) =>
    http.post("/products/prices", {
      productIds,
    }),
};
