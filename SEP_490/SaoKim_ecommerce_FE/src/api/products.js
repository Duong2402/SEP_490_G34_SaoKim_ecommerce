// src/api/products.js
import http from "./http";

export const ProductsAPI = {
  // Lấy danh sách sản phẩm với filter/search/paginate/sort
  // params: { q, page, pageSize, sortBy, sortDir }
  list: (params = {}) =>
    http.get("/api/products", {
      params,
    }),
};
