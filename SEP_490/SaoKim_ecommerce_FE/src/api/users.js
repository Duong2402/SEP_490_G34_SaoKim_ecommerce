import http from "./http";

const API_BASE = typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL
  : "";

const getToken = () => {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem("token");
  }
  return null;
};

// Helper để tạo FormData từ object
const createFormData = (data) => {
  const formData = new FormData();
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value !== null && value !== undefined) {
      if (value instanceof File) {
        formData.append(key, value);
      } else if (value instanceof Date) {
        formData.append(key, value.toISOString());
      } else {
        formData.append(key, value);
      }
    }
  });
  return formData;
};

export const UserAPI = {
  getAll: (params) => http.get("/api/users", { params }),
  
  getById: (id) => http.get(`/api/users/${id}`),
  
  create: (data) => {
    const formData = createFormData(data);
    return http.post("/api/users", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  
  update: (id, data) => {
    const formData = createFormData(data);
    return http.put(`/api/users/${id}`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${getToken()}`,
      },
    });
  },
  
  remove: (id) => http.delete(`/api/users/${id}`),
  
  getRoles: () => http.get("/api/users/roles"),
};

