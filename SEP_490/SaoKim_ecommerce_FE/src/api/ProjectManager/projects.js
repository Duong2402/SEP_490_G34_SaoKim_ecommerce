import http from "../http";

// Giữ nguyên nhóm ProjectAPI như hiện tại + bổ sung các hàm báo cáo
export const ProjectAPI = {
  getAll: (params) => http.get("/api/Projects", { params }),
  getById: (id) => http.get(`/api/Projects/${id}`),
  create: (data) => http.post("/api/Projects", data),
  update: (id, data) => http.put(`/api/Projects/${id}`, data),
  remove: (id) => http.delete(`/api/Projects/${id}`),

  // NEW: báo cáo dự án (JSON & PDF)
  getReport: (id) => http.get(`/api/projects/${id}/report`),
  getReportPdf: (id) =>
    http.get(`/api/projects/${id}/report/pdf`, { responseType: "blob" }),
};

// Nhóm API cho Tasks (dùng route /api/projects/{projectId}/tasks)
export const TaskAPI = {
  list: (projectId) => http.get(`/api/projects/${projectId}/tasks`),
  get: (projectId, taskId) =>
    http.get(`/api/projects/${projectId}/tasks/${taskId}`),
  create: (projectId, payload) =>
    http.post(`/api/projects/${projectId}/tasks`, payload),
  update: (projectId, taskId, payload) =>
    http.put(`/api/projects/${projectId}/tasks/${taskId}`, payload),
  remove: (projectId, taskId) =>
    http.delete(`/api/projects/${projectId}/tasks/${taskId}`),
};
