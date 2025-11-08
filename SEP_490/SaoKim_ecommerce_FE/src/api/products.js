// src/api/products.js
import http from "./http";

export const ProductsAPI = {
  // Tải toàn bộ sản phẩm. Nếu BE sau này hỗ trợ search/paging,
  // có thể truyền params: http.get("/api/Products", { params: { search, page, pageSize } })
  list: () => http.get("/api/Products"),
};
