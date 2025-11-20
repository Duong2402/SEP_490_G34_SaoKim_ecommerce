// src/api/manager-employees.js
import http from "./http";

// unwrap: nếu http trả { data: ... } thì lấy data, còn không thì giữ nguyên res
const unwrap = (res) => (res && res.data !== undefined ? res.data : res);

const createFormData = (data) => {
  const fd = new FormData();
  Object.keys(data || {}).forEach((key) => {
    const value = data[key];
    if (value === null || value === undefined) return;

    if (value instanceof File) {
      fd.append(key, value);
    } else {
      fd.append(key, value);
    }
  });
  return fd;
};

export const ManagerEmployeeAPI = {
  // trả về { items, total, page, pageSize, totalPages }
  getAll: (params) =>
    http.get("/manager/employees", { params }).then(unwrap),

  // trả về 1 employee
  getById: (id) =>
    http.get(`/manager/employees/${id}`).then(unwrap),

  // CREATE: dùng FormData (có image) + set header multipart để http.js không ép json
  create: (data) =>
    http
      .post("/manager/employees", createFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  // UPDATE: cũng dùng FormData + header multipart
  update: (id, data) =>
    http
      .put(`/manager/employees/${id}`, createFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

  remove: (id) =>
    http.delete(`/manager/employees/${id}`).then(unwrap),

  getRoles: () =>
    http.get("/manager/employees/roles").then(unwrap),
};
