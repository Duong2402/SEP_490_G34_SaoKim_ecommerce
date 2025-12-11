import React, { useEffect, useMemo, useState } from "react";
import { Container, Row, Col, Form, InputGroup, Button, Card, Pagination } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import HomepageHeader from "../../components/HomepageHeader";
import EcommerceFooter from "../../components/EcommerceFooter";
import ProductCard from "../../components/products/ProductCard";
import ProductSkeleton from "../../components/common/ProductSkeleton";
import { ProductsAPI } from "../../api/products";
import { readCart, writeCart } from "../../api/cartStorage";
import "../../styles/products.css";

const ITEMS_PER_PAGE = 12;

const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [priceFrom, setPriceFrom] = useState("");
  const [priceTo, setPriceTo] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  const normalizeProducts = (items) =>
    items.map((p, index) => ({
      id: p.id || p.productID || p.productId || index,
      name: p.name || p.productName || "Sản phẩm",
      price: Number(p.price) || 0,
      image:
        p.thumbnailUrl || p.image || p.imageUrl || "https://via.placeholder.com/600x450?text=No+Image",
      category: p.category || p.categoryName || p.categoryTitle || "Khác",
    }));

  const parsePriceNumber = (value) => {
    const digits = `${value || ""}`.replace(/\D/g, "");
    return digits ? Number(digits) : 0;
  };

  const formatPriceInput = (value) => {
    const num = parsePriceNumber(value);
    return num ? new Intl.NumberFormat("vi-VN").format(num) : "";
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = {
          q: searchTerm || undefined,
          category: selectedCategory || undefined,
          minPrice: parsePriceNumber(priceFrom) || undefined,
          maxPrice: parsePriceNumber(priceTo) || undefined,
          sort: sortBy || undefined,
          page: currentPage,
          pageSize: ITEMS_PER_PAGE,
        };

        const data = await ProductsAPI.list(params);
        let items = [];
        let total = 0;

        const payload = data?.data?.data ?? data?.data ?? data ?? {};

        if (Array.isArray(payload?.items)) {
          items = payload.items;
          total = payload.totalItems ?? payload.total ?? payload.items.length;
        } else if (Array.isArray(payload)) {
          items = payload;
          total = payload.length;
        }

        const normalized = normalizeProducts(items);
        setProducts(normalized);
        setTotalItems(total || normalized.length);
      } catch (error) {
        console.error("Failed to load products:", error);
        setError("Không tải được danh sách sản phẩm.");
        setProducts([]);
        setTotalItems(0);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchTerm, selectedCategory, priceFrom, priceTo, sortBy, currentPage]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    const fallback = [
      "Đèn chùm",
      "Đèn decor",
      "Đèn tường",
      "Đèn âm trần",
      "Đèn cây",
      "Phòng khách",
      "Phòng ngủ",
    ];
    const result = Array.from(set);
    return result.length ? result : fallback;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (searchTerm.trim()) {
      const keyword = searchTerm.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(keyword));
    }

    if (selectedCategory) {
      list = list.filter((p) => p.category === selectedCategory);
    }

    const min = parsePriceNumber(priceFrom);
    const max = parsePriceNumber(priceTo);

    if (min) {
      list = list.filter((p) => (Number(p.price) || 0) >= min);
    }

    if (max) {
      list = list.filter((p) => (Number(p.price) || 0) <= max);
    }

    switch (sortBy) {
      case "price-asc":
        list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        break;
      case "price-desc":
        list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        break;
      case "name-asc":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return list;
  }, [products, searchTerm, selectedCategory, priceFrom, priceTo, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, priceFrom, priceTo, sortBy]);

  const isServerPaging = totalItems > filteredProducts.length;
  const totalCount = isServerPaging ? totalItems : filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const paginatedProducts = useMemo(() => {
    if (isServerPaging) return filteredProducts;
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage, isServerPaging]);

  const handleAddToCart = (product) => {
    const currentCart = readCart();
    const idx = currentCart.findIndex((item) => item.id === product.id);

    if (idx > -1) {
      currentCart[idx].quantity = (Number(currentCart[idx].quantity) || 0) + 1;
    } else {
      currentCart.push({ ...product, quantity: 1 });
    }

    writeCart(currentCart);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("");
    setPriceFrom("");
    setPriceTo("");
    setSortBy("default");
  };

  const handleApplyFilters = () => {
    if (window.innerWidth < 992) {
      setShowFilters(false);
    }
  };

  return (
    <div className="products-page">
      <HomepageHeader />

      <main className="products-main">
        <Container className="products-hero">
          <div className="breadcrumb-text">Trang chủ / Sản phẩm</div>
          <h1 className="products-title">Tất cả sản phẩm</h1>
          <p className="products-subtitle">
            Khám phá toàn bộ các dòng sản phẩm chiếu sáng từ Sao Kim.
          </p>
        </Container>

        <Container className="products-layout">
          <div className="d-lg-none d-flex justify-content-between align-items-center mb-3">
            <div className="text-muted small">{filteredProducts.length} sản phẩm</div>
            <Button
              variant="outline-light"
              className="filter-toggle-btn"
              onClick={() => setShowFilters((prev) => !prev)}
            >
              Bộ lọc
            </Button>
          </div>

          <Row className="g-4">
            <Col lg={3} className={showFilters ? "" : "d-none d-lg-block"}>
              <Card className="filters-card">
                <Card.Body>
                  <div className="filter-header d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <div className="filter-eyebrow">Bộ lọc</div>
                      <h5 className="filter-title">Bộ lọc sản phẩm</h5>
                    </div>
                  </div>

                  <Form>
                    <Form.Group className="mb-3">
                      <Form.Label className="filter-label">Tìm kiếm</Form.Label>
                      <Form.Control
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Nhập tên sản phẩm..."
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="filter-label">Danh mục</Form.Label>
                      <Form.Select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">Tất cả</option>
                        {categories.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="filter-label">Khoảng giá</Form.Label>
                      <div className="d-flex gap-2">
                        <InputGroup>
                          <Form.Control
                            type="text"
                            value={priceFrom}
                            onChange={(e) => setPriceFrom(formatPriceInput(e.target.value))}
                            placeholder="Từ"
                          />
                          <InputGroup.Text>₫</InputGroup.Text>
                        </InputGroup>
                        <InputGroup>
                          <Form.Control
                            type="text"
                            value={priceTo}
                            onChange={(e) => setPriceTo(formatPriceInput(e.target.value))}
                            placeholder="Đến"
                          />
                          <InputGroup.Text>₫</InputGroup.Text>
                        </InputGroup>
                      </div>
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label className="filter-label">Sắp xếp theo</Form.Label>
                      <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="default">Mặc định</option>
                        <option value="price-asc">Giá tăng dần</option>
                        <option value="price-desc">Giá giảm dần</option>
                        <option value="name-asc">Tên A-Z</option>
                      </Form.Select>
                    </Form.Group>

                    <div className="filter-actions d-flex gap-2">
                      <Button className="filter-apply-btn flex-grow-1" onClick={handleApplyFilters}>
                        Áp dụng
                      </Button>
                      <Button
                        variant="outline-light"
                        className="filter-clear-btn flex-grow-1"
                        onClick={handleClearFilters}
                      >
                        Xóa bộ lọc
                      </Button>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>

            <Col lg={9}>
              {loading ? (
                <Row className="g-4">
                  {[...Array(12)].map((_, index) => (
                    <Col xl={4} lg={4} md={6} sm={6} xs={12} key={`skeleton-${index}`}>
                      <ProductSkeleton />
                    </Col>
                  ))}
                </Row>
              ) : error ? (
                <Card className="empty-state-card">
                  <Card.Body className="text-center">
                    <h5>{error}</h5>
                    <Button className="filter-apply-btn mt-3" onClick={handleClearFilters}>
                      Thử lại
                    </Button>
                  </Card.Body>
                </Card>
              ) : paginatedProducts.length > 0 ? (
                <>
                  <div className="products-grid-header d-flex justify-content-between align-items-center mb-3">
                    <div className="text-muted small">
                      Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                      {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} /{totalCount} sản phẩm
                    </div>
                  </div>

                  <Row className="g-4">
                    {paginatedProducts.map((product) => (
                      <Col xl={4} lg={4} md={6} sm={6} xs={12} key={product.id}>
                        <ProductCard
                          product={product}
                          onView={() => navigate(`/products/${product.id}`)}
                          onAddToCart={handleAddToCart}
                          formatPrice={formatCurrency}
                        />
                      </Col>
                    ))}
                  </Row>

                  <div className="d-flex justify-content-center mt-4">
                    <Pagination className="products-pagination">
                      <Pagination.Prev
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      >
                        Trước
                      </Pagination.Prev>
                      {Array.from({ length: totalPages }).map((_, idx) => {
                        const page = idx + 1;
                        return (
                          <Pagination.Item
                            key={page}
                            active={page === currentPage}
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Pagination.Item>
                        );
                      })}
                      <Pagination.Next
                        disabled={currentPage === totalPages}
                        onClick={() =>
                          setCurrentPage((prev) => (prev === totalPages ? prev : prev + 1))
                        }
                      >
                        Sau
                      </Pagination.Next>
                    </Pagination>
                  </div>
                </>
              ) : (
                <Card className="empty-state-card">
                  <Card.Body className="text-center">
                    <h5>Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.</h5>
                    <p className="text-muted mb-3">
                      Thử thay đổi điều kiện lọc hoặc xóa bộ lọc để xem tất cả sản phẩm.
                    </p>
                    <Button className="filter-apply-btn" onClick={handleClearFilters}>
                      Xóa bộ lọc
                    </Button>
                  </Card.Body>
                </Card>
              )}
            </Col>
          </Row>
        </Container>
      </main>

      <EcommerceFooter />
    </div>
  );
};

export default ProductsPage;
