import React from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { Row, Col, Form, Button } from "@themesberg/react-bootstrap";

const normalizeDefaults = (d = {}) => ({
  sku: d.sku ?? "",
  name: d.name ?? "",
  category: d.category ?? "",
  price: d.price ?? 0,
  stock: d.stock ?? 0,
  active: d.active ?? true,
});

export default function ProductForm({
  defaultValues,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: normalizeDefaults(defaultValues),
    mode: "onBlur",
  });

  const disabled = loading || isSubmitting;

  return (
    <Form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Row className="g-3">
        <Col md={6}>
          <Form.Group>
            <Form.Label>SKU</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. LED10W-WH"
              {...register("sku", {
                required: "SKU is required",
                minLength: { value: 3, message: "Min 3 characters" },
              })}
              isInvalid={!!errors.sku}
              disabled={disabled}
            />
            <Form.Control.Feedback type="invalid">
              {errors.sku?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>Name</Form.Label>
            <Form.Control
              type="text"
              placeholder="Product name"
              {...register("name", { required: "Name is required" })}
              isInvalid={!!errors.name}
              disabled={disabled}
            />
            <Form.Control.Feedback type="invalid">
              {errors.name?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={6}>
          <Form.Group>
            <Form.Label>Category</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. Đèn"
              {...register("category", { required: "Category is required" })}
              isInvalid={!!errors.category}
              disabled={disabled}
            />
            <Form.Control.Feedback type="invalid">
              {errors.category?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min={0}
              placeholder="0"
              {...register("price", {
                required: "Price is required",
                valueAsNumber: true,
                min: { value: 0, message: "Price must be ≥ 0" },
              })}
              isInvalid={!!errors.price}
              disabled={disabled}
            />
            <Form.Control.Feedback type="invalid">
              {errors.price?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label>Stock</Form.Label>
            <Form.Control
              type="number"
              min={0}
              placeholder="0"
              {...register("stock", {
                required: "Stock is required",
                valueAsNumber: true,
                min: { value: 0, message: "Stock must be ≥ 0" },
              })}
              isInvalid={!!errors.stock}
              disabled={disabled}
            />
            <Form.Control.Feedback type="invalid">
              {errors.stock?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={12}>
          <Form.Check
            type="switch"
            id="active-switch"
            label="Active"
            {...register("active")}
            disabled={disabled}
          />
        </Col>

        <Col md={12} className="d-flex gap-2 justify-content-end">
          {onCancel && (
            <Button variant="outline-secondary" onClick={onCancel} disabled={disabled}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={disabled}>
            {submitLabel}
          </Button>
        </Col>
      </Row>
    </Form>
  );
}

ProductForm.propTypes = {
  defaultValues: PropTypes.object,
  submitLabel: PropTypes.string,
  loading: PropTypes.bool,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
};

ProductForm.defaultProps = {
  defaultValues: {},
  submitLabel: "Save",
  loading: false,
  onCancel: undefined,
};
