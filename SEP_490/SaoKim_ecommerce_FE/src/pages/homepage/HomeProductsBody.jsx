import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EcommerceHeader from "../../components/EcommerceHeader";
import ProductSidebar from "../../components/ProductSidebar";


// API base (để trống nếu dùng proxy Vite)
let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

// ---- helpers -------------------------------------------------
async function fetchJson(url, opts = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${text}`);
    }
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(id);
  }
}

function useHomeProducts(params) {
  const [data, setData] = useState({ featured: [], newArrivals: [], all: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const qs = useMemo(() => {
    const s = new URLSearchParams();
    if (params.page) s.set("Page", String(params.page));
    if (params.pageSize) s.set("PageSize", String(params.pageSize));
    if (params.sortBy) s.set("SortBy", params.sortBy);
    if (params.keyword) s.set("Keyword", params.keyword);
    if (params.category) s.set("Category", params.category);
    return s.toString();
  }, [params.page, params.pageSize, params.sortBy, params.keyword, params.category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const url = `${API_BASE}/api/products/home${qs ? `?${qs}` : ""}`;
    fetchJson(url)
      .then((json) => {
        if (cancelled) return;

        let adapted = {
          featured: [],
          newArrivals: [],
          all: { page: params.page || 1, pageSize: params.pageSize || 12, totalItems: 0, totalPages: 0, items: [] },
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
          const firstArray = Object.values(json).find((v) => Array.isArray(v));
          if (firstArray) {
            adapted.all.items = firstArray;
            adapted.all.totalItems = firstArray.length;
            adapted.all.totalPages = 1;
          }
        }

        const normalize = (p) => ({
          id: p.id ?? p.productID ?? p.productId,
          name: p.name ?? p.productName,
          price: p.price ?? 0,
          thumbnailUrl: p.thumbnailUrl ?? p.image ?? null,
          stock: p.stock ?? p.quantity ?? null,
          createdAt: p.createdAt ?? p.createAt ?? p.date ?? null,
          description: p.description ?? null,
          category: p.category ?? null,
        });

        adapted.featured = (adapted.featured || []).map(normalize);
        adapted.newArrivals = (adapted.newArrivals || []).map(normalize);
        adapted.all.items = (adapted.all.items || []).map(normalize);

        setData(adapted);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Fetch error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [qs]);

  return { data, loading, error };
}

// ---- presentational ------------------------------------------
function ProductCard({ p }) {
  const [imgError, setImgError] = useState(false);
  
  // Xây dựng URL ảnh: nếu đã có http/https thì dùng luôn, 
  // nếu bắt đầu bằng / thì dùng relative (proxy sẽ xử lý),
  // nếu có API_BASE thì nối vào
  const getImageUrl = (url) => {
    if (!url) return "https://via.placeholder.com/400x300?text=No+Image";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    // Nếu bắt đầu bằng /, dùng relative path để proxy xử lý
    if (url.startsWith("/")) return url;
    // Nếu không, nối với API_BASE
    return `${API_BASE}${API_BASE ? "/" : ""}${url}`;
  };
  
  const imgSrc = getImageUrl(p.thumbnailUrl);
  const hasPrice = p.price && p.price > 0;

  return (
    <div className="card border-0 shadow-sm h-100 hover-shadow transition">
      {/* Logo nhỏ góc trên trái */}
      <div className="position-absolute" style={{ top: 10, left: 10, zIndex: 1 }}>
        <span className="badge bg-light text-dark">SVT</span>
      </div>

      {/* Hình ảnh sản phẩm */}
      <Link to={`/products/${p.id}`} className="text-decoration-none">
        <div className="position-relative" style={{ height: 250, overflow: "hidden" }}>
          <img
            src={imgError ? "https://via.placeholder.com/400x300?text=No+Image" : imgSrc}
            alt={p.name}
            className="w-100 h-100 object-fit-cover"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        </div>
      </Link>

      {/* Icons/Tags thông tin sản phẩm */}
      <div className="px-3 pt-2">
        <div className="d-flex flex-wrap gap-1 mb-2">
          <span className="badge bg-info text-white" style={{ fontSize: "0.7rem" }}>Bảo hành 30 tháng</span>
          {p.category && (
            <span className="badge bg-success text-white" style={{ fontSize: "0.7rem" }}>{p.category}</span>
          )}
        </div>

        {/* Tên sản phẩm */}
        <Link to={`/products/${p.id}`} className="text-dark text-decoration-none">
          <h6 className="fw-bold mb-2" style={{ minHeight: 40 }}>{p.name}</h6>
        </Link>

        {/* Đánh giá sao */}
        <div className="d-flex align-items-center gap-1 mb-2">
          <span className="text-warning">★★★★★</span>
          <small className="text-muted">(0 đánh giá)</small>
        </div>

        {/* Giá */}
        <div className="mb-2">
          {hasPrice ? (
            <div className="fw-bold text-danger fs-5">
              {new Intl.NumberFormat("vi-VN").format(Number(p.price || 0))} VND
            </div>
          ) : (
            <div className="fw-bold text-secondary">Liên hệ</div>
          )}
        </div>

        {/* Nút hành động */}
        <div className="mb-3">
          {hasPrice ? (
            <button className="btn btn-primary w-100 btn-sm">
              THÊM VÀO GIỎ HÀNG
            </button>
          ) : (
            <Link to={`/products/${p.id}`} className="btn btn-outline-primary w-100 btn-sm">
              ĐỌC TIẾP
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function Grid({ items }) {
  if (!items?.length) return <div className="text-muted text-center py-5">Không có sản phẩm</div>;
  return (
    <div className="row g-4">
      {items.map((p) => (
        <div key={p.id} className="col-md-4 col-lg-3 col-xl-2">
          <ProductCard p={p} />
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  const prev = () => onPage(Math.max(1, page - 1));
  const next = () => onPage(Math.min(totalPages, page + 1));
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button onClick={prev} disabled={page <= 1} className="rounded-xl border px-3 py-1 disabled:opacity-50">
        Trước
      </button>
      <span className="text-sm">Trang {page} / {totalPages}</span>
      <button onClick={next} disabled={page >= totalPages} className="rounded-xl border px-3 py-1 disabled:opacity-50">
        Sau
      </button>
    </div>
  );
}


function HomeProductsBody({ category: propCategory = "" }) {
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [sortBy, setSortBy] = useState("new");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [category, setCategory] = useState(propCategory || "");
  
  // Update category when prop changes
  useEffect(() => {
    if (propCategory !== category) {
      setCategory(propCategory || "");
      setPage(1);
    }
  }, [propCategory, category]);

  // debounce keyword
  useEffect(() => {
    const id = setTimeout(() => {
      setKeyword(keywordInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [keywordInput]);

  const { data, loading, error } = useHomeProducts({ page, pageSize, sortBy, keyword, category });
  const all = data?.all || { items: [], totalPages: 0, page: 1, totalItems: 0 };

  return (
    <div>
      {/* Toolbar - Sort and Search */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-muted">
          Hiển thị {((all.page - 1) * pageSize + 1)}-{Math.min(all.page * pageSize, all.totalItems)} của {all.totalItems} kết quả
        </div>
        <div className="d-flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="form-select form-select-sm"
            style={{ width: 'auto' }}
          >
            <option value="new">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
        </div>
      </div>

      {/* Error/Loading */}
      {loading && <div className="text-center py-5">Đang tải...</div>}
      {error && <div className="alert alert-danger">Lỗi: {error}</div>}

      {/* Products Grid */}
      {!loading && !error && (
        <>
          <Grid items={all.items} />
          <div className="mt-4">
            <Pagination page={all.page || page} totalPages={all.totalPages || 0} onPage={setPage} />
          </div>
        </>
      )}
    </div>
  );
}

// ===== wrapper: Header/Hero/Footer (DEFAULT EXPORT) =============
function HomeWrapper() {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    fetchJson(`${API_BASE}/api/categories`)
      .then((list) => {
        let arr = [];
        if (Array.isArray(list)) arr = list;
        else if (list?.items) arr = list.items;
        else if (list?.categories) arr = list.categories;
        const uniq = Array.from(new Set((arr || []).map(x => (typeof x === "string" ? x : x?.name)).filter(Boolean)));
        setCategories(uniq);
      })
      .catch(() => setCategories([]));
  }, []);

  return (
    <div style={{ background: "#fff", color: "#222", width: "100%", minHeight: "100vh" }}>
      {/* HEADER */}
      <EcommerceHeader />
      {/* MAIN CONTENT - 2 Columns Layout */}
      <main className="py-4">
        <div className="container-fluid px-4">
          <div className="row">
            {/* Sidebar - Filters */}
            <ProductSidebar 
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {/* Content - Products Grid */}
            <div className="col-md-9">
              <HomeProductsBody category={selectedCategory} />
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="mt-5 pt-4 pb-5 border-top bg-white">
        <div className="container-fluid px-4">
          <div className="row gy-3 align-items-center">
            <div className="col-md-6">
              <h5 className="mb-2 text-dark fw-bold">SaoKim E-commerce</h5>
              <div className="text-secondary">Hệ thống thiết bị chiếu sáng uy tín.</div>
            </div>
            <div className="col-md-6 text-md-end text-secondary">
              © {new Date().getFullYear()} SaoKim. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default HomeWrapper;
