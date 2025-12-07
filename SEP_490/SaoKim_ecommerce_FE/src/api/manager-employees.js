import http from "./http";

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
  getAll: (params) =>
    http.get("/manager/employees", { params }).then(unwrap),

  getById: (id) =>
    http.get(`/manager/employees/${id}`).then(unwrap),

  create: (data) =>
    http
      .post("/manager/employees", createFormData(data), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then(unwrap),

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
