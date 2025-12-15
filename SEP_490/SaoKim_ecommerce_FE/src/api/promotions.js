import http from "./http";

export const PromotionsAPI = {
  list: (params = {}) => http.get("/promotions", { params }),
  detail: (id, includeProducts = true) =>
    http.get(`/promotions/${id}`, { params: { includeProducts } }),
  create: (data) => http.post("/promotions", data),
  update: (id, data) => http.put(`/promotions/${id}`, data),
  remove: (id) => http.delete(`/promotions/${id}`),

  addProduct: (id, payload) => http.post(`/promotions/${id}/products`, payload),
  removeProduct: (promotionProductId) =>
    http.delete(`/promotions/products/${promotionProductId}`),
};

export default PromotionsAPI;
