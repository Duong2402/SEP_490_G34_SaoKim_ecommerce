// src/api/ProjectManager/project-expenses.js
import http from "../http";

export const ProjectExpenseAPI = {
  // params: { from, to, category, vendor, keyword, page, pageSize, sort }
  list: (projectId, params) =>
    http.get(`/api/projects/${projectId}/expenses`, { params }),

  get: (projectId, id) =>
    http.get(`/api/projects/${projectId}/expenses/${id}`),

  create: (projectId, data) =>
    http.post(`/api/projects/${projectId}/expenses`, data),

  update: (projectId, id, data) =>
    http.put(`/api/projects/${projectId}/expenses/${id}`, data),

  remove: (projectId, id) =>
    http.delete(`/api/projects/${projectId}/expenses/${id}`),
};
