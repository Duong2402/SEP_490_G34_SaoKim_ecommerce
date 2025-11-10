import { useState } from "react";
import "../styles/home.css";

export default function ProductSidebar({
  categories = [],
  selectedCategory,
  onCategoryChange,
  onPriceFilter,
}) {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const toggleCategory = (category) => {
    if (!onCategoryChange) return;
    if (selectedCategory === category) {
      onCategoryChange("");
    } else {
      onCategoryChange(category);
    }
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
    if (onPriceFilter) {
      onPriceFilter({ min: null, max: null });
    }
  };

  return (
    <aside className="home-sidebar">
      <div className="home-sidebar__card">
        <h5>Categories</h5>
        {categories.length ? (
          <div className="home-sidebar__filters">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`home-filter-pill${selectedCategory === category ? " is-active" : ""}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </button>
            ))}
            {selectedCategory && (
              <button
                type="button"
                className="home-filter-pill"
                onClick={() => toggleCategory(selectedCategory)}
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <div className="text-secondary small"></div>
        )}
      </div>

      <div className="home-sidebar__card">
        <h5>Price range</h5>
        <div className="home-price-range">
          <div className="home-price-inputs">
            <input
              type="number"
              min="0"
              placeholder="Min"
              value={minPrice}
              onChange={(event) => setMinPrice(event.target.value)}
            />
            <input
              type="number"
              min="0"
              placeholder="Max"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
          </div>
          <div className="d-flex align-items-center gap-2">
            <button type="button" className="home-price-apply" onClick={applyPriceFilter}>
              Apply
            </button>
            <button type="button" className="btn btn-link p-0 text-secondary" onClick={resetPriceFilter}>
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="home-sidebar__card">
        <h5>Recently viewed</h5>
        <div className="text-secondary small">
          Products you explore will appear here for quick access.
        </div>
      </div>
    </aside>
  );
}
