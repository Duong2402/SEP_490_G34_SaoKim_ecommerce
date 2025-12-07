import http from "../http";

export const ProjectAPI = {
  getAll: (params) => http.get("/Projects", { params }),

  getById: (id) => http.get(`/Projects/${id}`),

  create: (data) => http.post("/Projects", data),

  update: (id, data) => http.put(`/Projects/${id}`, data),

  remove: (id) => http.delete(`/Projects/${id}`),

  getReport: (id) => http.get(`/projects/${id}/report`, { params: { lang: "vi" } }),
  getReportPdf: (id) =>
    http.get(`/projects/${id}/report/pdf`, {
      responseType: "blob",
      params: { lang: "vi" },
      headers: { "Accept-Language": "vi" },
    }),
};

export const TaskAPI = {
  list: (projectId) => http.get(`/projects/${projectId}/tasks`),
  get: (projectId, taskId) =>
    http.get(`/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, payload) =>
    http.post(`/projects/${projectId}/tasks`, payload),
  update: (projectId, taskId, payload) =>
    http.put(`/projects/${projectId}/tasks/${taskId}`, payload),
  remove: (projectId, taskId) =>
    http.delete(`/projects/${projectId}/tasks/${taskId}`),
};