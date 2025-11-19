// src/pages/manager/products/ManagerProductList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { ProductsAPI } from "../../../api/products";

const formatCurrency = (value) => {
  if (value == null) return "0 ₫";
  return Number(value).toLocaleString("vi-VN") + " ₫";
};

const STATUS_LABELS = {
  Active: "Đang bán",
  Inactive: "Tạm ngưng",
  Draft: "Nháp",
};

export default function ManagerProductList() {
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("created");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({ q: q || undefined, sortBy, sortDir, page, pageSize }),
    [q, sortBy, sortDir, page, pageSize]
  );

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await ProductsAPI.list(params);
      const payload = res?.data?.data ?? res?.data ?? {};
      setRows(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (error) {
      console.error(error);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="manager-panel">
      <div className="manager-panel__header">
        <div>
          <h2 className="manager-panel__title">Danh sách sản phẩm</h2>
          <p className="manager-panel__subtitle">
            Kiểm soát SKU, tồn kho và trạng thái kinh doanh theo thời gian thực.
          </p>
        </div>
        <div className="manager-panel__actions">
          <button type="button" className="manager-btn manager-btn--outline" onClick={loadProducts}>
            Làm mới
          </button>
        </div>
      </div>

      <div className="manager-filters">
        <input
          className="manager-input"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm theo tên, SKU hoặc danh mục"
        />

        <select
          className="manager-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created">Ngày tạo</option>
          <option value="name">Tên sản phẩm</option>
          <option value="sku">Mã SKU</option>
          <option value="category">Danh mục</option>
          <option value="price">Giá bán</option>
          <option value="stock">Tồn kho</option>
          <option value="status">Trạng thái</option>
        </select>

        <select
          className="manager-select"
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
        >
          <option value="desc">Giảm dần</option>
          <option value="asc">Tăng dần</option>
        </select>

        <label style={{ marginLeft: "auto", fontSize: 14, color: "var(--manager-muted)" }}>
          Hiển thị
        </label>
        <select
          className="manager-select"
          style={{ width: 90 }}
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {[10, 20, 50].map((n) => (
            <option key={n} value={n}>
              {n} dòng
            </option>
          ))}
        </select>
      </div>

      <div className="manager-table__wrapper">
        <table className="manager-table">
          <thead>
            <tr>
              <th>#</th>
              <th>SKU</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Đơn vị</th>
              <th>Giá bán</th>
              <th>Tồn kho</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="manager-table__empty" colSpan={9}>
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="manager-table__empty" colSpan={9}>
                  Không tìm thấy sản phẩm phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((product, idx) => (
                <tr key={product.id}>
                  <td>{(page - 1) * pageSize + idx + 1}</td>
                  <td>{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.category ?? "-"}</td>
                  <td>{product.unit ?? "-"}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stock ?? 0}</td>
                  <td>{STATUS_LABELS[product.status] ?? product.status ?? "-"}</td>
                  <td>
                    {product.created
                      ? new Date(product.created).toLocaleDateString("vi-VN")
                      : "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="manager-pagination">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Trước
        </button>
        <span>
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Sau
        </button>
        <span>Tổng {total.toLocaleString("vi-VN")} sản phẩm</span>
      </div>
    </div>
  );
}
