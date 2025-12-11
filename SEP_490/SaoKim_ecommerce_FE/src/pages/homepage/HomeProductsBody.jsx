import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomepageHeader from "../../components/HomepageHeader";
import ProductSidebar from "../../components/ProductSidebar";
import "../../styles/home.css";

let API_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
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
          name: product.name ?? product.productName ?? "Chưa đặt tên",
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
        if (!cancelled) setError(err.message || "Không thể tải sản phẩm");
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
  if (value == null || Number(value) <= 0) return "Liên hệ báo giá";
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(value));
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

function HomeBanner() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0); 

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
    if (totalSlides <= 1) return; 
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
              height: "420px",       
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


function ProductCard({ product }) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = imageError
    ? "https://via.placeholder.com/600x450?text=No+Image"
    : buildImageUrl(product.thumbnailUrl);
  const stockLabel =
    typeof product.stock === "number" && product.stock > 0 ? `${product.stock} còn hàng` : "Đang cập nhật";

  return (
    <article className="product-card">
      <Link to={`/products/${product.id}`} className="product-card__media">
        <img src={imageSrc} alt={product.name || "Sản phẩm"} loading="lazy" onError={() => setImageError(true)} />
      </Link>

      <div className="product-card__body">
        {product.category && <span className="product-card__badge">{product.category}</span>}
        <Link to={`/products/${product.id}`} className="product-card__title">
          {product.name || "Sản phẩm"}
        </Link>
        <div className="product-card__meta">
          <span className="product-card__price">{formatCurrency(product.price)}</span>
          <span className="product-card__stock">{stockLabel}</span>
        </div>
      </div>

      <div className="product-card__footer">
        <Link
          to={`/products/${product.id}`}
          className="home-btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Xem chi tiết
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
        Trước
      </button>
      <span className="text-secondary small">{`Trang ${page} / ${totalPages}`}</span>
      <button type="button" onClick={goNext} disabled={page >= totalPages}>
        Sau
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
  const [priceFilter, setPriceFilter] = useState({ min: null, max: null });
  const [categories, setCategories] = useState([]);

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

  useEffect(() => {
    setPriceFilter({ min: null, max: null });
  }, [category]);

  useEffect(() => {
    fetchJson(`${API_BASE}/api/categories`)
      .then((payload) => {
        let list = [];
        if (Array.isArray(payload)) list = payload;
        else if (payload?.items) list = payload.items;
        else if (payload?.categories) list = payload.categories;
        const unique = Array.from(
          new Set((list || []).map((item) => (typeof item === "string" ? item : item?.name)).filter(Boolean))
        );
        setCategories(unique);
      })
      .catch(() => setCategories([]));
  }, []);

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

  const totalItems = priceFilterActive
    ? filteredItems.length
    : all.totalItems || filteredItems.length;
  const startIndex = totalItems ? (priceFilterActive ? 1 : (all.page - 1) * pageSize + 1) : 0;
  const endIndex = totalItems ? (priceFilterActive ? filteredItems.length : Math.min(all.page * pageSize, all.totalItems)) : 0;

  const metaText = totalItems ? `Hiển thị ${startIndex} - ${endIndex} / ${totalItems} sản phẩm` : "Chưa có sản phẩm phù hợp.";

  return (
    <div className="home-page">
      <HomepageHeader />

      <section className="home-hero">
        <div className="home-container">
          <div className="home-hero__shell">
            <div className="home-hero__copy">
              <span className="home-badge">
                <i className="fa-solid fa-star" aria-hidden="true" />
                Chiếu sáng Sao Kim
              </span>
              <h1 className="home-hero__title">Thắp sáng không gian sống & dự án kinh doanh của bạn</h1>
              <p className="home-hero__desc">
                Lựa chọn đèn trang trí, downlight, tracklight và giải pháp chiếu sáng thông minh được tư vấn bởi đội ngũ
                kỹ sư Sao Kim. Tối ưu ánh sáng, tiết kiệm năng lượng và đảm bảo chuẩn thiết kế cho dự án.
              </p>
              <div className="home-cta">
                <a className="home-btn-primary" href="#catalog">
                  Xem danh mục sản phẩm
                </a>
                <Link to="/login" className="home-btn-ghost">
                  Giải pháp cho đối tác&nbsp;
                  <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
            <div className="home-hero__panel">
              <div className="home-metric">
                <strong>2000+</strong>
                <span>Sản phẩm chiếu sáng đồng bộ</span>
              </div>
              <div className="home-metric">
                <strong>450+</strong>
                <span>Dự án showroom, khách sạn, nhà hàng</span>
              </div>
              <div className="home-metric">
                <strong>24/7</strong>
                <span>Hỗ trợ kỹ thuật & tư vấn thiết kế</span>
              </div>
              <div className="home-metric">
                <strong>Tiết kiệm</strong>
                <span>Tối ưu công suất & ngân sách</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-container" id="catalog" style={{ paddingBottom: 28 }}>
        <div className="home-layout">
          <ProductSidebar
            categories={categories}
            selectedCategory={category}
            onCategoryChange={setCategory}
            priceFilter={priceFilter}
            onPriceFilter={setPriceFilter}
          />
          <div className="home-main">
            <div className="home-toolbar">
              <div>
                <p className="home-kicker">Danh mục</p>
                <h2 className="home-toolbar__title">Sản phẩm nổi bật</h2>
                <span className="home-toolbar__meta">{metaText}</span>
              </div>
              <div className="home-toolbar__actions">
                <div className="home-search">
                  <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                  <input
                    type="search"
                    value={keywordInput}
                    onChange={(event) => setKeywordInput(event.target.value)}
                    placeholder="Từ khóa, mã thiết bị, bộ sưu tập..."
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
                  <option value="new">Mới nhất</option>
                  <option value="price_asc">Giá: Thấp đến cao</option>
                  <option value="price_desc">Giá: Cao đến thấp</option>
                </select>
              </div>
            </div>

            {loading && <div className="product-empty-state">Đang tải sản phẩm...</div>}
            {error && !loading && <div className="product-empty-state">{error}</div>}

            {!loading && !error && (
              <>
                {filteredItems.length ? (
                  <Grid items={filteredItems} />
                ) : (
                  <div className="product-empty-state">
                    Không tìm thấy sản phẩm phù hợp. Hãy thử bỏ bớt bộ lọc hoặc từ khóa.
                  </div>
                )}
                {!priceFilterActive && (
                  <Pagination page={all.page || page} totalPages={all.totalPages || 0} onPage={setPage} />
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="home-section" id="solutions">
        <div className="home-container">
          <div className="home-section__header">
            <h2>Giải pháp theo lĩnh vực</h2>
            <p>Sao Kim hỗ trợ từ triển khai nhanh cho cửa hàng đến gói thiết kế chuyên sâu cho khách sạn, resort.</p>
          </div>
          <div className="home-solutions__grid">
            <article className="home-solutions__card">
              <h3>Showroom & Retail</h3>
              <p>Tracklight, downlight CRI cao, điều khiển dimming linh hoạt nâng tầm trải nghiệm mua sắm.</p>
            </article>
            <article className="home-solutions__card">
              <h3>Khách sạn & Nhà hàng</h3>
              <p>Đèn trang trí, wall washer, dải LED tạo tổng thể sang trọng và đồng nhất phong cách.</p>
            </article>
            <article className="home-solutions__card">
              <h3>Văn phòng & Công trình</h3>
              <p>Giải pháp chiếu sáng chuẩn ergonomic, tối ưu công suất và giảm chói cho không gian làm việc.</p>
            </article>
            <article className="home-solutions__card">
              <h3>Biệt thự & Căn hộ</h3>
              <p>Thiết kế layout ánh sáng thông minh, bảo đảm an toàn điện và hiệu quả chi phí.</p>
            </article>
          </div>
        </div>
      </section>
      <section className="home-section" id="projects">
        <div className="home-container">
          <div className="home-section__header">
            <h2>Bộ sưu tập nổi bật</h2>
            <p>Những sản phẩm bán chạy được nhiều nhà thiết kế tin dùng.</p>
          </div>
          <div className="home-showcase__grid">
            <article className="home-showcase__card">
              <h4>Seri NovaSpot</h4>
              <span>Tracklight tinh chỉnh góc chiếu 10-40°, phù hợp trưng bày.</span>
            </article>
            <article className="home-showcase__card">
              <h4>Downlight Aurora</h4>
              <span>Âm trần UGR &lt; 16, ánh sáng mềm cho không gian lưu trú.</span>
            </article>
            <article className="home-showcase__card">
              <h4>Linear Flex Pro</h4>
              <span>Dải LED IP66, phối màu linh hoạt cho mặt dựng ngoài trời.</span>
            </article>
            <article className="home-showcase__card">
              <h4>Decor Stella</h4>
              <span>Đèn trang trí tạo điểm nhấn, phối hợp dễ dàng với nội thất.</span>
            </article>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="home-container">
          <div className="home-section__header">
            <h2>Cam kết từ Sao Kim</h2>
            <p>Chúng tôi đồng hành từ giai đoạn tư vấn đến vận hành để dự án sáng đẹp và an toàn.</p>
          </div>
          <div className="home-values__grid">
            <article className="home-values__card">
              <h4>Tư vấn kỹ thuật</h4>
              <p>Đội ngũ kỹ sư đồng hành, kiểm tra độ rọi, màu sắc, tối ưu số lượng thiết bị.</p>
            </article>
            <article className="home-values__card">
              <h4>Hậu mãi & bảo hành</h4>
              <p>Hỗ trợ đổi mới nhanh, chính sách bảo hành rõ ràng, linh kiện sẵn có.</p>
            </article>
            <article className="home-values__card">
              <h4>Tiến độ & chi phí</h4>
              <p>Lập kế hoạch giao hàng, lắp đặt và ngân sách minh bạch, tối ưu cho nhà thầu.</p>
            </article>
            <article className="home-values__card">
              <h4>Thiết kế đồng bộ</h4>
              <p>Giải pháp chiếu sáng trọn bộ: đèn, phụ kiện, điều khiển thông minh.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="home-container" id="contact">
        <div className="home-contact">
          <div>
            <p className="home-kicker" style={{ color: "rgba(255,255,255,0.85)" }}>
              Liên hệ nhanh
            </p>
            <h3 style={{ margin: "4px 0 6px" }}>Bạn cần tư vấn chiếu sáng?</h3>
            <p style={{ margin: 0, color: "rgba(255,255,255,0.85)" }}>
              Gửi thông tin cho chúng tôi hoặc gọi hotline để được kỹ sư Sao Kim đề xuất giải pháp phù hợp.
            </p>
          </div>
          <div className="home-contact__actions">
            <a className="home-btn-primary" href="tel:0918113559">
              Gọi 0918 113 559
            </a>
            <a
              className="home-btn-ghost"
              href="mailto:contact@saokim.vn"
              style={{ color: "#fff", border: "1px solid rgba(255,255,255,0.4)" }}
            >
              contact@saokim.vn
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="home-container site-footer__inner">
          <div>
            <h5>Sao Kim Lighting</h5>
            <div>Chuyên gia cung cấp thiết bị và giải pháp chiếu sáng chuyên nghiệp.</div>
          </div>
          <div>&copy; {new Date().getFullYear()} Sao Kim Lighting. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

export default HomeProductsBody;
