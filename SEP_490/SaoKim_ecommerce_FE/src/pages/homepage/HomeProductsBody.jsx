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
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    Number(value)
  );
}

function buildImageUrl(path) {
  if (!path) return "https://via.placeholder.com/600x450?text=No+Image";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}${API_BASE ? "/" : ""}${path}`;
}

function HeroBlock() {
  return (
    <div className="home-hero__content">
      <span className="home-hero__badge">
        <i className="fa-solid fa-star" aria-hidden="true" />
        Sao Kim Lightning
      </span>
      <h1>Chieu sang an tuong cho moi khong gian song va kinh doanh</h1>
      <p>
        Lua chon danh muc den trang tri, downlight, tracklight va giai phap chieu sang thong minh
        duoc Sao Kim tu van chuyen sau. Toi uu anh sang, tiet kiem nang luong va dam bao tieu
        chuan thiet ke du an.
      </p>
      <div className="home-hero__actions">
        <a className="btn btn-primary btn-small" href="#catalog">
          Xem danh muc san pham
        </a>
        <Link to="/login" className="home-hero__link">
          Giai phap cho doi tac&nbsp;
          <i className="fa-solid fa-arrow-right" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

/* BANNER + HERO: hero là slide 0, các banner là slide 1..n */
function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0); // 0 = hero, 1..n = banner

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const payload = await fetchJson(`${API_BASE}/api/banner`);
        if (cancelled) return;

        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload?.items) list = payload.items;

        const normalized = (list || []).map((b) => ({
          id: b.id ?? b.Id,
          title: b.title ?? b.Title ?? "",
          imageUrl: b.imageUrl ?? b.ImageUrl ?? "",
          linkUrl: b.linkUrl ?? b.LinkUrl ?? "",
          isActive:
            b.isActive !== undefined
              ? b.isActive
              : b.IsActive !== undefined
              ? b.IsActive
              : true,
        }));

        const active = normalized.filter((x) => x.isActive && x.imageUrl);
        setBanners(active);
      } catch {
        setBanners([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSlides = 1 + (banners?.length || 0);

  useEffect(() => {
    if (totalSlides <= 1) return; // chỉ hero thì không cần auto slide
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(timer);
  }, [totalSlides]);

  const currentIsHero = index === 0 || totalSlides === 1;
  const currentBanner = !currentIsHero ? banners[index - 1] : null;

  return (
    <section className="home-hero">
      <div className="home-container" style={{ position: "relative" }}>
        {currentIsHero || loading || !currentBanner ? (
          <HeroBlock />
        ) : (
          <div
            className="home-banner__media"
            style={{
              width: "100%",
              height: "420px",       // THÊM DÒNG NÀY
              overflow: "hidden",
              position: "relative",
              marginBottom: "24px",
              borderRadius: "16px",
            }}
          >
            <a href={currentBanner.linkUrl || "#"} style={{ display: "block" }}>
              <img
                src={buildImageUrl(currentBanner.imageUrl)}
                alt={currentBanner.title || "Homepage banner"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </a>

            {currentBanner.title && (
              <div
                style={{
                  position: "absolute",
                  left: "24px",
                  bottom: "24px",
                  background: "rgba(0,0,0,0.45)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  maxWidth: "60%",
                  fontSize: "15px",
                  lineHeight: 1.4,
                }}
              >
                {currentBanner.title}
              </div>
            )}
          </div>
        )}

        {totalSlides > 1 && (
          <div
            style={{
              position: "absolute",
              right: "18px",
              bottom: "18px",
              display: "flex",
              gap: "6px",
            }}
          >
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  background: i === index ? "#fff" : "rgba(255,255,255,0.5)",
                }}
                aria-label={i === 0 ? "Hero" : `Banner ${i}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* SẢN PHẨM */

function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = imageError
    ? "https://via.placeholder.com/600x450?text=No+Image"
    : buildImageUrl(product.thumbnailUrl);
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
        <Link to={`/products/${product.id}`} className="btn btn-primary btn-small">
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

function HomeProductsBody({
  category: categoryFromProps = "",
  priceFilter = { min: null, max: null },
}) {
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

  const { data, loading, error } = useHomeProducts({
    page,
    pageSize,
    sortBy,
    keyword,
    category,
  });
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

  const totalItems = priceFilterActive
    ? filteredItems.length
    : all.totalItems || filteredItems.length;
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
        <HomeBanner />

        <div className="home-container home-layout">
          <ProductSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            onPriceFilter={setPriceFilter}
          />
          <HomeProductsBody category={selectedCategory} priceFilter={priceFilter} />
        </div>

        <section className="home-solutions" id="solutions">
          <div className="home-container">
            <div className="home-section__header">
              <h2>Giai phap chieu sang theo linh vuc</h2>
              <p>
                Sao Kim Lightning ho tro tu giai phap trien khai nhanh cho cua hang den cac goi
                thiet ke chuyen sau cho khach san va cong trinh cao cap.
              </p>
            </div>
            <div className="home-solutions__grid">
              <article className="home-solutions__card">
                <h3>Showroom & Retail</h3>
                <p>
                  Gan ket trai nghiem mua sam voi den tracklight, downlight CRI cao va dieu khien
                  dimming linh hoat.
                </p>
              </article>
              <article className="home-solutions__card">
                <h3>Khach san & Nha hang</h3>
                <p>
                  Bo suu tap den trang tri, wall washer va day dan LED dam bao tong the sang trong,
                  tinh te.
                </p>
              </article>
              <article className="home-solutions__card">
                <h3>Can ho & Biet thu</h3>
                <p>
                  Tu van layout anh sang thong minh, toi uu cong suat va an toan dien cho khong gian
                  song.
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className="home-showcase" id="projects">
          <div className="home-container">
            <div className="home-section__header">
              <h2>Bo suu tap noi bat</h2>
              <p>
                Lua chon san pham ban chay duoc nhieu nha thiet ke tin dung trong cac du an gan day.
              </p>
            </div>
            <div className="home-showcase__grid">
              <article className="home-showcase__card">
                <h4>Seri NovaSpot</h4>
                <span>Tracklight tinh chinh goc chieu 10-40&deg;, phu hop trien lam</span>
              </article>
              <article className="home-showcase__card">
                <h4>Downlight Aurora</h4>
                <span>Downlight am tran, UGR &lt; 16, sang mem cho khach san</span>
              </article>
              <article className="home-showcase__card">
                <h4>Linear Flex Pro</h4>
                <span>Day dan LED IP66, phoi mau linh hoat cho mat dung ngoai troi</span>
              </article>
            </div>
          </div>
        </section>

        <section className="home-contact" id="contact">
          <div className="home-container home-contact__shell">
            <div className="home-contact__copy">
              <h2>Can ho tro tu van chieu sang?</h2>
              <p>
                Gui thong tin cho chung toi hoac lien he hotline de duoc ky su Sao Kim de xuat giai
                phap nhanh chong.
              </p>
            </div>
            <div className="home-contact__actions">
              <a className="btn btn-primary" href="tel:0918113559">
                Goi 0918 113 559
              </a>
              <a className="btn btn-outline" href="mailto:contact@saokim.vn">
                contact@saokim.vn
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="home-container site-footer__inner">
          <div>
            <h5>Sao Kim Lightning</h5>
            <div>Chuyen gia cung cap thiet bi va giai phap chieu sang chuyen nghiep.</div>
          </div>
          <div>&copy; {new Date().getFullYear()} Sao Kim Lightning. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default HomeWrapper;
