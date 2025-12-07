import http from "./http";

export const ProductsAPI = {
  list: (params = {}) =>
    http.get("/products", {
      params,
    }),
  getHomeProducts: (params = {}) => http.get("/products/home", { params }),
};
