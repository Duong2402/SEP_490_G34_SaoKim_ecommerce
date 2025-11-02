import { useState } from "react";
import { Link } from "react-router-dom";

export default function ProductSidebar({ categories = [], selectedCategory, onCategoryChange, onPriceFilter }) {
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(93000000);

  const handleFilter = () => {
    if (onPriceFilter) {
      onPriceFilter({ min: minPrice, max: maxPrice });
    }
  };

  return (
    <aside className="col-md-3">
      {/* DANH MỤC SẢN PHẨM */}
      <div className="bg-white p-3 mb-3 border rounded">
        <h5 className="text-success fw-bold mb-3">DANH MỤC SẢN PHẨM</h5>
        <div className="d-flex flex-column gap-2">
          {categories.map((cat) => (
            <label key={cat} className="d-flex align-items-center gap-2">
              <input
                type="checkbox"
                checked={selectedCategory === cat}
                onChange={() => onCategoryChange && onCategoryChange(cat)}
                className="form-check-input"
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* LỌC THEO GIÁ */}
      <div className="bg-white p-3 mb-3 border rounded">
        <h5 className="text-success fw-bold mb-3">LỌC THEO GIÁ</h5>
        <div className="mb-2">
          <label className="form-label">Giá: {new Intl.NumberFormat("vi-VN").format(minPrice)} VND – {new Intl.NumberFormat("vi-VN").format(maxPrice)} VND</label>
          <div className="d-flex gap-2">
            <input
              type="number"
              className="form-control form-control-sm"
              value={minPrice}
              onChange={(e) => setMinPrice(Number(e.target.value))}
              placeholder="Min"
            />
            <input
              type="number"
              className="form-control form-control-sm"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              placeholder="Max"
            />
          </div>
        </div>
        <button onClick={handleFilter} className="btn btn-secondary w-100 btn-sm">
          LỌC
        </button>
      </div>

      {/* SẢN PHẨM ĐÃ XEM GẦN ĐÂY */}
      <div className="bg-white p-3 mb-3 border rounded">
        <h5 className="text-success fw-bold mb-3">SẢN PHẨM ĐÃ XEM GẦN ĐÂY</h5>
        <div className="text-muted text-sm">
          <p>Chưa có sản phẩm nào</p>
        </div>
      </div>

      {/* Social icons */}
      <div className="d-flex gap-2">
        <a href="#" className="btn btn-primary btn-sm rounded-circle" style={{ width: 40, height: 40 }}>
          💬
        </a>
        <a href="#" className="btn btn-info btn-sm rounded-circle" style={{ width: 40, height: 40 }}>
          💬
        </a>
      </div>
    </aside>
  );
}

