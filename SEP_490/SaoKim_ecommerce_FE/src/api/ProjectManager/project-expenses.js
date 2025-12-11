import http from "../http";

export const ProjectExpenseAPI = {
  list: (projectId, params) =>
    http.get(`/projects/${projectId}/expenses`, { params }),

  get: (projectId, id) =>
    http.get(`/projects/${projectId}/expenses/${id}`),

  create: (projectId, data) =>
    http.post(`/projects/${projectId}/expenses`, data),

  update: (projectId, id, data) =>
    http.put(`/projects/${projectId}/expenses/${id}`, data),

  remove: (projectId, id) =>
    http.delete(`/projects/${projectId}/expenses/${id}`),
};
