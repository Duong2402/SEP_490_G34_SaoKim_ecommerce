import http from "./http";

export const CustomerAPI = {
  getAll: (params) => http.get("/customers", { params }),
};

