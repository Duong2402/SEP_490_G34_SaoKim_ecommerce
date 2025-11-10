import http from "./http";

export const CouponsAPI = {
  list: (params = {}) => http.get("/api/Coupons", { params }),
  detail: (id) => http.get(`/api/Coupons/${id}`),
  create: (payload) => http.post("/api/Coupons", payload),
  update: (id, payload) => http.put(`/api/Coupons/${id}`, payload),
  remove: (id) => http.delete(`/api/Coupons/${id}`),
  deactivate: (id) => http.post(`/api/Coupons/${id}/deactivate`),
  toggle: (id) => http.post(`/api/Coupons/${id}/toggle`),
};
