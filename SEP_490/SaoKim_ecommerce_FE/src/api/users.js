import http from "./http";

const createFormData = (data) => {
  const fd = new FormData();
  Object.keys(data || {}).forEach((k) => {
    const v = data[k];
    if (v === null || v === undefined) return;
    if (v instanceof File) fd.append(k, v);
    else if (v instanceof Date) fd.append(k, v.toISOString());
    else fd.append(k, v);
  });
  return fd;
};

export const UserAPI = {
  getAll: (params) => http.get("/users", { params }),

  getById: (id) => http.get(`/users/${id}`),

  create: (data) => {
    const formData = createFormData(data);
    return http.post("/users", formData);
  },

  update: (id, data) => {
    const formData = createFormData(data);
    return http.put(`/users/${id}`, formData);
  },

  remove: (id) => http.delete(`/users/${id}`),

  getRoles: () => http.get("/users/roles"),

  getMe: () => http.get("/users/me"),
  updateMe: (data) => http.put("/users/me", createFormData(data)),
  setStatus: (id, status) => http.put(`/users/${id}`, { status }),

  getProjectManagers: () => http.get("/users/project-managers"),
};
