// src/api/ProjectManager/projects.js
import http from "../http";

// Nhóm API cho Project
export const ProjectAPI = {
  // Query danh sách project (có filter, paging, sort)
  getAll: (params) => http.get("/Projects", { params }),

  // Lấy chi tiết theo id
  getById: (id) => http.get(`/Projects/${id}`),

  // Tạo mới
  create: (data) => http.post("/Projects", data),

  // Cập nhật
  update: (id, data) => http.put(`/Projects/${id}`, data),

  // Xóa
  remove: (id) => http.delete(`/Projects/${id}`),

  // Báo cáo dự án (JSON & PDF)
  getReport: (id) => http.get(`/projects/${id}/report`),
  getReportPdf: (id) =>
    http.get(`/projects/${id}/report/pdf`, { responseType: "blob" }),
};

// Nhóm API cho Tasks thuộc Project
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
