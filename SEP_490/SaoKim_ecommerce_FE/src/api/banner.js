import http from "./http"; 
export const BannerAPI = {
  getAll(params) {
    return http.get("/banner", { params });
  },
  getById(id) {
    return http.get(`/banner/${id}`);
  },
  create(payload) {
    return http.post("/banner", payload);
  },
  update(id, payload) {
    return http.put(`/banner/${id}`, payload);
  },
  delete(id) {
    return http.delete(`/banner/${id}`);
  },
};
