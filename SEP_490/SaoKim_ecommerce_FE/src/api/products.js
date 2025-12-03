// src/api/products.js
import http from "./http";

export const ProductsAPI = {
  // params: { q, page, pageSize, sortBy, sortDir }
  list: (params = {}) =>
    http.get("/products", {
      params,
    }),
  getHomeProducts: (params = {}) => http.get("/products/home", { params }),
};
