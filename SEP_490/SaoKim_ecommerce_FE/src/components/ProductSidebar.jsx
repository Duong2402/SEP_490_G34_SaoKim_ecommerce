import { useEffect, useState } from "react";
import "../styles/home.css";

export default function ProductSidebar({
  categories = [],
  selectedCategory,
  onCategoryChange,
  onPriceFilter,
  priceFilter = { min: null, max: null },
}) {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    setMinPrice(priceFilter.min ?? "");
    setMaxPrice(priceFilter.max ?? "");
  }, [priceFilter.min, priceFilter.max]);

  const toggleCategory = (category) => {
    if (!onCategoryChange) return;
    onCategoryChange(selectedCategory === category ? "" : category);
  };

  const applyPriceFilter = () => {
    if (!onPriceFilter) return;
    const min = minPrice === "" ? null : Number(minPrice);
    const max = maxPrice === "" ? null : Number(maxPrice);
    onPriceFilter({ min, max });
  };

  const resetPriceFilter = () => {
    setMinPrice("");
    setMaxPrice("");
    if (onPriceFilter) onPriceFilter({ min: null, max: null });
  };

  return (
    <aside className="home-sidebar">
      <div className="home-card">
        <div className="home-card__header">
          <div>
            <p className="home-kicker">Danh mục</p>
            <h5>Sản phẩm</h5>
          </div>
          {selectedCategory && (
            <button className="link-ghost" type="button" onClick={() => toggleCategory(selectedCategory)}>
              Bỏ chọn
            </button>
          )}
        </div>
        <div className="home-sidebar__filters">
          {categories.length ? (
            categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`home-pill${selectedCategory === category ? " is-active" : ""}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))
          ) : (
            <div className="text-secondary small">Chưa có danh mục.</div>
          )}
        </div>
      </div>

      <div className="home-card">
        <div className="home-card__header">
          <div>
            <p className="home-kicker">Ngân sách</p>
            <h5>Lọc theo giá</h5>
          </div>
          <button className="link-ghost" type="button" onClick={resetPriceFilter}>
            Đặt lại
          </button>
        </div>
        <div className="home-price-range">
          <div className="home-price-inputs">
            <label>
              <span>Từ</span>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
            </label>
            <label>
              <span>Đến</span>
              <input
                type="number"
                min="0"
                placeholder="10.000.000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </label>
          </div>
          <button type="button" className="home-btn-primary" onClick={applyPriceFilter}>
            Áp dụng
          </button>
        </div>
      </div>

      <div className="home-card home-card--muted">
        <p className="home-kicker">Dịch vụ</p>
        <h5>Tư vấn & Thiết kế</h5>
        <p className="text-secondary">
          Kỹ sư Sao Kim sẵn sàng hỗ trợ lên layout chiếu sáng, phối màu và tối ưu công suất cho dự án của bạn.
        </p>
        <a className="home-btn-ghost" href="#contact">
          Liên hệ ngay
        </a>
      </div>
    </aside>
  );
}
