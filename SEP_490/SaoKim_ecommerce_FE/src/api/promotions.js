// src/api/promotions.js
import http from "./http";

export const PromotionsAPI = {
  list: (params = {}) => http.get("/api/promotions", { params }),
  detail: (id, includeProducts = true) =>
    http.get(`/api/promotions/${id}`, { params: { includeProducts } }),
  create: (data) => http.post("/api/promotions", data),
  update: (id, data) => http.put(`/api/promotions/${id}`, data),
  remove: (id) => http.delete(`/api/promotions/${id}`),

  addProduct: (id, payload) => http.post(`/api/promotions/${id}/products`, payload),
  removeProduct: (promotionProductId) =>
    http.delete(`/api/promotions/products/${promotionProductId}`),
};

export default PromotionsAPI;
