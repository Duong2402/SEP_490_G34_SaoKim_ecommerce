import { useEffect, useState, useCallback, useMemo, memo } from "react";
import { useParams, Link } from "react-router-dom";

let API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "";
if (API_BASE.endsWith("/")) API_BASE = API_BASE.slice(0, -1);

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  if (!res.ok) throw new Error(text || res.statusText);
  return text ? JSON.parse(text) : null;
}

function imgUrl(pathOrFile) {
  if (!pathOrFile) return "https://via.placeholder.com/800x600?text=No+Image";
  // BE đã trả dạng "/images/xxx.jpg" nên nối API_BASE (nếu có)
  if (pathOrFile.startsWith("http")) return pathOrFile;
  return `${API_BASE}${pathOrFile.startsWith("/") ? "" : "/"}${pathOrFile}`;
}

// Component riêng cho sản phẩm liên quan để tránh re-render
const RelatedProductCard = memo(({ product }) => {
  if (!product) return null;
  
  const imageUrl = useMemo(() => imgUrl(product.image), [product.image]);
  const formattedPrice = useMemo(
    () => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(product.price || 0)),
    [product.price]
  );
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/products/${product.id}`}
      className="rounded-2xl border p-3 hover:shadow transition block"
    >
      <div className="aspect-[4/3] w-full overflow-hidden rounded-xl bg-gray-100">
        <img
          src={imgError ? "https://via.placeholder.com/400x300?text=No+Image" : imageUrl}
          alt={product.name || 'Product'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
      <div className="mt-2 line-clamp-2 text-sm">{product.name || ''}</div>
      <div className="text-sm font-semibold">{formattedPrice}</div>
    </Link>
  );
}, (prevProps, nextProps) => {
  // Return true nếu KHÔNG cần re-render (tất cả giá trị giống nhau)
  // Return false nếu CẦN re-render (có giá trị thay đổi)
  if (!prevProps.product || !nextProps.product) return false;
  
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.name === nextProps.product.name &&
    prevProps.product.price === nextProps.product.price &&
    prevProps.product.image === nextProps.product.image
  );
});

RelatedProductCard.displayName = "RelatedProductCard";

export default function ProductDetail() {
  const { id } = useParams();
  const [data, setData] = useState({ product: null, related: [] });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [userName, setUserName] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Fetch product data
  useEffect(() => {
    const url = `${API_BASE}/api/products/${id}`;
    setLoading(true);
    setErr("");
    fetchJson(url)
      .then((json) => setData(json || { product: null, related: [] }))
      .catch((e) => setErr(e.message || "Fetch error"))
      .finally(() => setLoading(false));
  }, [id]);

  // Kiểm tra authentication - chỉ update state khi giá trị thay đổi
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const name = localStorage.getItem("userName");
      
      // Chỉ update state nếu giá trị thực sự thay đổi
      setIsLoggedIn((prev) => {
        const newValue = !!(token && name);
        return prev !== newValue ? newValue : prev;
      });
      
      setUserName((prev) => {
        const newValue = name || null;
        return prev !== newValue ? newValue : prev;
      });
    };

    // Check ngay khi mount
    checkAuth();

    const handleStorageChange = (e) => {
      if (e.key === "token" || e.key === "userName" || !e.key) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("localStorageChange", checkAuth);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("localStorageChange", checkAuth);
    };
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userName");
    localStorage.removeItem("role");
    setIsLoggedIn(false);
    setUserName(null);
    window.dispatchEvent(new Event("localStorageChange"));
  }, []);

  // Memoize header component để tránh re-render
  const renderHeader = useMemo(() => (
    <header className="py-3 border-bottom bg-white shadow-sm">
      <div className="container-fluid px-4 d-flex align-items-center justify-content-between">
        <Link to="/" className="navbar-brand d-flex align-items-center gap-2 text-dark text-decoration-none">
          <img src="/images/logo.png" alt="Logo" style={{ height: 40 }} />
          <span className="fw-bold fs-5">SaoKim E-commerce</span>
        </Link>
        <nav className="d-flex gap-4 align-items-center">
          <a href="/#new-arrivals" className="nav-link text-dark fw-medium">Hàng mới</a>
          <a href="/#all-products" className="nav-link text-dark fw-medium">Sản phẩm</a>
          {isLoggedIn ? (
            <div className="d-flex align-items-center gap-3">
              <span className="text-dark fw-medium">Xin chào, {userName}</span>
              <button 
                onClick={handleLogout}
                className="btn btn-outline-secondary btn-sm text-dark fw-medium"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-warning btn-sm text-dark fw-medium">Đăng nhập</Link>
          )}
        </nav>
      </div>
    </header>
  ), [isLoggedIn, userName, handleLogout]);

  if (loading) return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#222" }}>
      {renderHeader}
      <div className="p-6">Đang tải...</div>
    </div>
  );
  if (err) return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#222" }}>
      {renderHeader}
      <div className="p-6 text-red-700">Lỗi: {err}</div>
    </div>
  );
  if (!data?.product) return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#222" }}>
      {renderHeader}
      <div className="p-6">Không tìm thấy sản phẩm.</div>
    </div>
  );

  const p = data.product;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "#fff", color: "#222" }}>
      {/* HEADER */}
      {renderHeader}

      {/* CONTENT */}
      <div className="mx-auto max-w-6xl p-4 md:p-6">
      <nav className="mb-4 text-sm">
        <Link to="/" className="text-blue-600 hover:underline">Trang chủ</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-600">Chi tiết sản phẩm</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Hình */}
        <div className="rounded-2xl border overflow-hidden bg-gray-50">
          <img
            src={imgUrl(p.image)}
            alt={p.name}
            className="w-full h-full object-contain"
            style={{ maxHeight: 520 }}
            onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/800x600?text=No+Image")}
          />
        </div>

        {/* Thông tin */}
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">{p.name}</h1>
          <div className="text-xl font-semibold">
            {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(p.price || 0))}
          </div>
          <div className="text-sm text-gray-600">
            Mã: <span className="font-mono">{p.code || "-"}</span>
          </div>
          <div className="text-sm text-gray-600">
            Danh mục: <span>{p.category || "-"}</span>
          </div>
          <div className="text-sm text-gray-600">
            Tồn kho: <span>{typeof p.quantity === "number" ? p.quantity : "-"}</span>
          </div>
          {p.description && (
            <div className="prose max-w-none">
              <h3 className="font-semibold">Mô tả</h3>
              <p className="whitespace-pre-line">{p.description}</p>
            </div>
          )}
          <div className="pt-2">
            <button className="rounded-xl bg-black text-white px-5 py-3">Thêm vào giỏ</button>
          </div>
        </div>
      </div>

      {/* Sản phẩm liên quan */}
      {data.related && Array.isArray(data.related) && data.related.length > 0 && (
        <section className="mt-10">
          <div className="mb-3 text-lg font-semibold">Sản phẩm liên quan</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data.related.map((r) => (
              <RelatedProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
      </div>
    </div>
  );
}
