import http from "./http";

export const CouponsAPI = {
  list: (params = {}) => http.get("/Coupons", { params }),
  detail: (id) => http.get(`/Coupons/${id}`),
  create: (payload) => http.post("/Coupons", payload),
  update: (id, payload) => http.put(`/Coupons/${id}`, payload),
  remove: (id) => http.delete(`/Coupons/${id}`),
  deactivate: (id) => http.post(`/Coupons/${id}/deactivate`),
  toggle: (id) => http.post(`/Coupons/${id}/toggle`),
};
