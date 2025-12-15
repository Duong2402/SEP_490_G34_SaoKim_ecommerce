import React from "react";
import PropTypes from "prop-types";
import { Card, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShoppingCart, faArrowRight } from "@fortawesome/free-solid-svg-icons";

const defaultFormatPrice = (value) =>
  value || value === 0
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
    : "Liên hệ";

const ProductCard = ({ product, badgeText, onView, onAddToCart, formatPrice }) => {
  const handleView = () => {
    if (onView) onView(product);
  };

  const handleAdd = () => {
    if (onAddToCart) onAddToCart(product);
  };

  const priceLabel = (formatPrice || defaultFormatPrice)(product.price);

  return (
    <Card className="luxury-card home-product-card h-100">
      {badgeText && <div className="home-product-badge">{badgeText}</div>}

      <div className="home-product-media">
        <Card.Img
          variant="top"
          src={product.image}
          className="home-product-img cursor-pointer"
          onClick={handleView}
          alt={product.name}
        />
      </div>

      <Card.Body className="home-product-body">
        <div className="home-product-meta">{product.category}</div>
        <Card.Title className="home-product-title cursor-pointer" onClick={handleView}>
          {product.name}
        </Card.Title>
        <div className="home-product-price">{priceLabel}</div>
        <div className="home-product-actions">
          <Button className="home-product-btn primary" onClick={handleView}>
            Xem chi tiết
          </Button>
          {onAddToCart && (
            <Button className="home-product-btn ghost" onClick={handleAdd} title="Thêm vào giỏ">
              <FontAwesomeIcon icon={faShoppingCart} />
            </Button>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

ProductCard.propTypes = {
  product: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    image: PropTypes.string,
    category: PropTypes.string,
  }).isRequired,
  badgeText: PropTypes.string,
  onView: PropTypes.func,
  onAddToCart: PropTypes.func,
  formatPrice: PropTypes.func,
};

export default ProductCard;
