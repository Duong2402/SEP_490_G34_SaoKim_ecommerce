// src/api/ProjectManager/project-products.js
import http from "../http";

export const ProjectProductAPI = {
  list: (projectId) => http.get(`/projects/${projectId}/products`),
  create: (projectId, data) => http.post(`/projects/${projectId}/products`, data),
  update: (projectId, id, data) => http.put(`/projects/${projectId}/products/${id}`, data),
  remove: (projectId, id) => http.delete(`/projects/${projectId}/products/${id}`),
};
