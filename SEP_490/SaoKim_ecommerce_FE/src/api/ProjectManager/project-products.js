// src/api/ProjectManager/project-products.js
import http from "../http";

export const ProjectProductAPI = {
  list: (projectId) => http.get(`/api/projects/${projectId}/products`),
  create: (projectId, data) => http.post(`/api/projects/${projectId}/products`, data),
  update: (projectId, id, data) => http.put(`/api/projects/${projectId}/products/${id}`, data),
  remove: (projectId, id) => http.delete(`/api/projects/${projectId}/products/${id}`),
};
