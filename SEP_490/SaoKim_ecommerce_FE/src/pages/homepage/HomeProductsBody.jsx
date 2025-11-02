import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";
import ProductSidebar from "../../components/ProductSidebar";
import "../../styles/home.css";

let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { ...opts, signal: controller.signal });
    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `${response.status} ${response.statusText}`);
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function useHomeProducts(params) {
  const [data, setData] = useState({ featured: [], newArrivals: [], all: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("Page", String(params.page));
    if (params.pageSize) searchParams.set("PageSize", String(params.pageSize));
    if (params.sortBy) searchParams.set("SortBy", params.sortBy);
    if (params.keyword) searchParams.set("Keyword", params.keyword);
    if (params.category) searchParams.set("Category", params.category);
    return searchParams.toString();
  }, [params.page, params.pageSize, params.sortBy, params.keyword, params.category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const endpoint = `${API_BASE}/api/products/home${queryString ? `?${queryString}` : ""}`;
    fetchJson(endpoint)
      .then((json) => {
        if (cancelled) return;

        let adapted = {
          featured: [],
          newArrivals: [],
          all: {
            page: params.page || 1,
            pageSize: params.pageSize || 12,
            totalItems: 0,
            totalPages: 0,
            items: [],
          },
        };

        if (!json) {
          setData(adapted);
          return;
        }

        if (Array.isArray(json)) {
          adapted.all.items = json;
          adapted.all.totalItems = json.length;
          adapted.all.totalPages = 1;
        } else if (json?.all || json?.featured || json?.newArrivals) {
          adapted = {
            featured: json.featured || [],
            newArrivals: json.newArrivals || [],
            all: json.all || adapted.all,
          };
        } else if (json?.items) {
          adapted.all = {
            page: json.page ?? adapted.all.page,
            pageSize: json.pageSize ?? adapted.all.pageSize,
            totalItems: json.totalItems ?? (json.items?.length || 0),
            totalPages: json.totalPages ?? 1,
            items: json.items || [],
          };
        } else if (json && typeof json === "object") {
          const firstArray = Object.values(json).find((value) => Array.isArray(value));
          if (firstArray) {
            adapted.all.items = firstArray;
            adapted.all.totalItems = firstArray.length;
            adapted.all.totalPages = 1;
          }
        }

        const normalize = (product) => ({
          id: product.id ?? product.productID ?? product.productId,
          name: product.name ?? product.productName ?? "Unnamed product",
          price: product.price ?? 0,
          thumbnailUrl: product.thumbnailUrl ?? product.image ?? null,
          stock: product.stock ?? product.quantity ?? null,
          createdAt: product.createdAt ?? product.createAt ?? product.date ?? null,
          description: product.description ?? null,
          category: product.category ?? null,
        });

        adapted.featured = (adapted.featured || []).map(normalize);
        adapted.newArrivals = (adapted.newArrivals || []).map(normalize);
        adapted.all.items = (adapted.all.items || []).map(normalize);

        setData(adapted);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Unable to load products");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [queryString, params.page, params.pageSize]);

  return { data, loading, error };
}

function formatCurrency(value) {
  if (!value || Number(value) <= 0) return "Contact for price";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value));
}

function buildImageUrl(path) {
  if (!path) return "https://via.placeholder.com/600x450?text=No+Image";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}${API_BASE ? "/" : ""}${path}`;
}

function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = imageError ? "https://via.placeholder.com/600x450?text=No+Image" : buildImageUrl(product.thumbnailUrl);
  const stockLabel =
    typeof product.stock === "number" && product.stock > 0 ? `${product.stock} in stock` : null;

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__media">
        <img
          src={imageSrc}
          alt={product.name || "Product image"}
          loading="lazy"
          onError={() => setImageError(true)}
        />
      </Link>

      <div className="product-card__body">
        {product.category && <span className="product-card__badge">{product.category}</span>}
        <Link to={`/products/${product.id}`} className="product-card__title">
          {product.name || "Unnamed product"}
        </Link>
        <div className="product-card__meta">
          <span className="product-card__price">{formatCurrency(product.price)}</span>
          {stockLabel && <span className="product-card__stock">{stockLabel}</span>}
        </div>
      </div>

      <div className="product-card__footer">
        <Link to={`/products/${product.id}`} className="btn btn-primary btn-sm">
          View details
        </Link>
      </div>
    </article>
  );
}

function Grid({ items }) {
  return (
    <div className="product-grid">
      {items.map((product) => (
        <ProductCard key={product.id ?? product.name} product={product} />
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  const goPrev = () => onPage(Math.max(1, page - 1));
  const goNext = () => onPage(Math.min(totalPages, page + 1));

  return (
    <div className="pagination-controls">
      <button type="button" onClick={goPrev} disabled={page <= 1}>
        Previous
      </button>
      <span className="text-secondary small">{`Page ${page} of ${totalPages}`}</span>
      <button type="button" onClick={goNext} disabled={page >= totalPages}>
        Next
      </button>
    </div>
  );
}

function HomeProductsBody({ category: categoryFromProps = "", priceFilter = { min: null, max: null } }) {
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [category, setCategory] = useState(categoryFromProps || "");

  useEffect(() => {
    if (categoryFromProps !== category) {
      setCategory(categoryFromProps || "");
      setPage(1);
    }
  }, [categoryFromProps, category]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(debounce);
  }, [keywordInput]);

  useEffect(() => {
    setPage(1);
  }, [priceFilter.min, priceFilter.max]);

  const { data, loading, error } = useHomeProducts({ page, pageSize, sortBy, keyword, category });
  const all = data?.all || { items: [], totalPages: 0, page: 1, totalItems: 0 };

  const priceFilterActive = priceFilter && (priceFilter.min != null || priceFilter.max != null);

  const filteredItems = useMemo(() => {
    const items = all.items || [];
    if (!priceFilterActive) return items;
    return items.filter((product) => {
      const price = Number(product.price || 0);
      if (priceFilter.min != null && price < priceFilter.min) return false;
      if (priceFilter.max != null && price > priceFilter.max) return false;
      return true;
    });
  }, [all.items, priceFilter, priceFilterActive]);

  const totalItems = priceFilterActive ? filteredItems.length : all.totalItems || filteredItems.length;
  const startIndex = totalItems ? (priceFilterActive ? 1 : (all.page - 1) * pageSize + 1) : 0;
  const endIndex = totalItems
    ? priceFilterActive
      ? filteredItems.length
      : Math.min(all.page * pageSize, all.totalItems)
    : 0;

  const metaText = totalItems
    ? `Showing ${startIndex}-${endIndex} of ${totalItems} products`
    : "Currently no products match your filters.";

  return (
    <div className="home-content" id="catalog">
      <div className="home-toolbar">
        <div className="home-toolbar__info">
          <h2 className="home-toolbar__title">Product catalogue</h2>
          <span className="home-toolbar__meta">{metaText}</span>
        </div>
        <div className="home-toolbar__actions">
          <div className="home-search">
            <span className="home-search__icon">
              <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            </span>
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="Search keywords, model codes or collections..."
            />
          </div>
          <select
            className="home-select"
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
          >
            <option value="new">Newest</option>
            <option value="price_asc">Price: Low to high</option>
            <option value="price_desc">Price: High to low</option>
          </select>
        </div>
      </div>

      {loading && <div className="product-empty-state">Loading products...</div>}
      {error && !loading && <div className="alert alert-danger">{error}</div>}

      {!loading && !error && (
        <>
          {filteredItems.length ? (
            <Grid items={filteredItems} />
          ) : (
            <div className="product-empty-state">
              We could not find any products that match your filters. Try clearing a few selections.
            </div>
          )}
          {!priceFilterActive && (
            <Pagination page={all.page || page} totalPages={all.totalPages || 0} onPage={setPage} />
          )}
        </>
      )}
    </div>
  );
}

function HomeWrapper() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceFilter, setPriceFilter] = useState({ min: null, max: null });

  useEffect(() => {
    fetchJson(`${API_BASE}/api/categories`)
      .then((payload) => {
        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload?.items) list = payload.items;
        else if (payload?.categories) list = payload.categories;
        const unique = Array.from(
          new Set(
            (list || [])
              .map((item) => (typeof item === "string" ? item : item?.name))
              .filter(Boolean)
          )
        );
        setCategories(unique);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setPriceFilter({ min: null, max: null });
  }, [selectedCategory]);

  return (
    <div className="home-wrapper">
      <EcommerceHeader />
      <main className="home-main">
        <section className="home-hero">
          <div className="home-container">
            <div className="home-hero__content">
              <span className="home-hero__badge">
                <i className="fa-solid fa-star" aria-hidden="true" />
                New season collection
              </span>
              <h1>Illuminate every space with tailored lighting design</h1>
              <p>
                Discover a curated collection of architectural lighting, crafted to elevate hospitality,
                retail and residential experiences. Handpicked fixtures with flexible control and sustainable performance.
              </p>
              <div className="home-hero__actions">
                <a className="btn btn-primary btn-sm" href="#catalog">
                  Browse catalogue
                </a>
                <Link to="/login" className="home-hero__link">
                  Partner portal&nbsp;
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="home-container home-layout">
          <ProductSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onPriceFilter={setPriceFilter}
          />
          <HomeProductsBody category={selectedCategory} priceFilter={priceFilter} />
        </div>
      </main>

      <footer className="site-footer">
        <div className="home-container site-footer__inner">
          <div>
            <h5>SaoKim Commerce</h5>
            <div>Premium lighting, seamless control, thoughtful service.</div>
          </div>
          <div>&copy; {new Date().getFullYear()} SaoKim. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default HomeWrapper;
