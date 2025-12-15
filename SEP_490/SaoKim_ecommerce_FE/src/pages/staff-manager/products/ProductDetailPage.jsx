
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Spinner,
  Table,
} from "@themesberg/react-bootstrap";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft, faHome,} from "@fortawesome/free-solid-svg-icons";

import StaffLayout from "../../../layouts/StaffLayout";
import useProductsApi from "../api/useProducts";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchProduct } = useProductsApi();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchProduct(id);
        setProduct(res?.product || null);
      } catch (err) {
        setError(err?.message || "Không tải được sản phẩm");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  const renderStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (s === "active")
      return <Badge bg="success">Đang hiển thị</Badge>;
    if (s === "inactive")
      return <Badge bg="secondary">Ngừng bán</Badge>;
    return <Badge bg="light">{status}</Badge>;
  };

  return (
    <StaffLayout>
      <div className="staff-page-header">
        <div>
          <Breadcrumb
            className="d-none d-md-inline-block"
            listProps={{ className: "breadcrumb-dark breadcrumb-transparent" }}
          >
            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/staff/manager-dashboard" }}>
              <FontAwesomeIcon icon={faHome} />
            </Breadcrumb.Item>

            <Breadcrumb.Item linkAs={Link} linkProps={{ to: "/staff/manager-products" }}>
              Sản phẩm
            </Breadcrumb.Item>

            <Breadcrumb.Item active>Chi tiết sản phẩm #{id}</Breadcrumb.Item>
          </Breadcrumb>

          <h4 className="staff-page-title">Chi tiết sản phẩm #{id}</h4>
          <p className="staff-page-lead">Xem thông tin đầy đủ của sản phẩm</p>
        </div>

        <div className="d-flex gap-2">
          <Button variant="outline-secondary" size="sm" onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
            Quay lại
          </Button>
        </div>
      </div>

      <Card className="staff-panel">
        <Card.Body>
          {loading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" />
              Đang tải chi tiết...
            </div>
          ) : error ? (
            <div className="text-danger">{error}</div>
          ) : !product ? (
            <div className="text-muted">Không tìm thấy sản phẩm</div>
          ) : (
            <>
              <Row className="mb-4">
                <Col md={4} className="text-center">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: "100%",
                        maxHeight: 260,
                        objectFit: "contain",
                        borderRadius: 8,
                        border: "1px solid #e0e0e0",
                        background: "#fafafa",
                      }}
                    />
                  ) : (
                    <div className="text-muted">Chưa có ảnh</div>
                  )}
                </Col>

                <Col md={8}>
                  <h5 className="fw-bold text-primary">{product.name}</h5>

                  <div className="table-responsive">
                    <Table borderless size="sm" className="mb-0">
                      <tbody>
                        <tr>
                          <th style={{ width: 150 }}>SKU</th>
                          <td>{product.sku}</td>
                        </tr>

                        <tr>
                          <th>Danh mục</th>
                          <td>{product.category || "-"}</td>
                        </tr>

                        <tr>
                          <th>Giá bán</th>
                          <td>{(product.price ?? 0).toLocaleString("vi-VN")} ₫</td>
                        </tr>

                        <tr>
                          <th>Số lượng</th>
                          <td>{product.quantity ?? product.stock ?? 0}</td>
                        </tr>

                        <tr>
                          <th>Đơn vị tính</th>
                          <td>{product.unit || "-"}</td>
                        </tr>

                        <tr>
                          <th>Trạng thái</th>
                          <td>{renderStatus(product.status)}</td>
                        </tr>

                        <tr>
                          <th>Nhà cung cấp</th>
                          <td>{product.supplier || "-"}</td>
                        </tr>

                        <tr>
                          <th>Ghi chú</th>
                          <td>{product.note || "-"}</td>
                        </tr>

                        <tr>
                          <th>Mô tả</th>
                          <td>{product.description || "-"}</td>
                        </tr>

                        <tr>
                          <th>Ngày tạo</th>
                          <td>
                            {product.created
                              ? new Date(product.created).toLocaleString("vi-VN")
                              : "-"}
                          </td>
                        </tr>

                        <tr>
                          <th>Cập nhật lần cuối</th>
                          <td>
                            {product.updateAt
                              ? new Date(product.updateAt).toLocaleString("vi-VN")
                              : "-"}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Card.Body>
      </Card>
    </StaffLayout>
  );
}
