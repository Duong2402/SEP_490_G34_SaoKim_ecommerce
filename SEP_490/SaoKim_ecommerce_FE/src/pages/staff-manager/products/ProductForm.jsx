import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { Row, Col, Form, Button } from "@themesberg/react-bootstrap";
import useCategoriesApi from "../api/useCategories";

const normalizeDefaults = (d = {}) => ({
  sku: d.sku ?? "",
  name: d.name ?? "",
  categoryId: d.categoryId ?? "",       // ✅ dùng id, không còn string name
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
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: normalizeDefaults(defaultValues),
    mode: "onBlur",
  });

  const disabled = loading || isSubmitting;

  const { getCategories, createCategory } = useCategoriesApi();
  const [categories, setCategories] = useState([]);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const categoryId = watch("categoryId");

  useEffect(() => {
    (async () => {
      try {
        const list = await getCategories(); // [{ id, name, slug }]
        setCategories(list || []);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  // Khi chọn option, nếu là "__NEW__" thì bật ô nhập
  const handleCategorySelect = (e) => {
    const v = e.target.value;
    if (v === "__NEW__") {
      setAddingNew(true);
      setValue("categoryId", ""); // xoá chọn tạm
    } else {
      setAddingNew(false);
      setValue("categoryId", v);  // lưu id dạng string; sẽ Number() khi submit
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const created = await createCategory({ name }); // { id, name, slug }
      setCategories((prev) => [...prev, created]);
      setValue("categoryId", String(created.id), { shouldValidate: true }); // chọn luôn id mới
      setAddingNew(false);
      setNewCategory("");
    } catch (err) {
      alert(err.message || "Create category failed");
    }
  };

  const submitWrapped = (values) => {
    // ép kiểu id sang số ở Add/Edit
    return onSubmit({
      ...values,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
    });
  };

  return (
    <Form onSubmit={handleSubmit(submitWrapped)} noValidate>
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

        {/* CategoryId dropdown */}
        <Col md={6}>
          <Form.Group>
            <Form.Label>Category</Form.Label>

            {!addingNew && (
              <Form.Select
                onChange={handleCategorySelect}
                value={categoryId ?? ""}
                {...register("categoryId", {
                  validate: (v) => (v ? true : "Category is required"),
                })}
                isInvalid={!!errors.categoryId}
                disabled={disabled}
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__NEW__">+ Thêm danh mục mới…</option>
              </Form.Select>
            )}

            {(addingNew || categoryId === "__NEW__") && (
              <div className="d-flex gap-2 mt-2">
                <Form.Control
                  type="text"
                  placeholder="Nhập danh mục mới"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  disabled={disabled}
                />
                <Button
                  variant="primary"
                  onClick={handleAddCategory}
                  disabled={disabled}
                >
                  Lưu
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setAddingNew(false);
                    setNewCategory("");
                    setValue("categoryId", "");
                  }}
                  disabled={disabled}
                >
                  Hủy
                </Button>
              </div>
            )}

            <Form.Control.Feedback type="invalid">
              {errors.categoryId?.message}
            </Form.Control.Feedback>
          </Form.Group>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label>Price</Form.Label>
            <Form.Control
              type="number"
              min={0}
              {...register("price", {
                required: "Price is required",
                valueAsNumber: true,
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
              {...register("stock", {
                required: "Stock is required",
                valueAsNumber: true,
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
            <Button
              variant="outline-secondary"
              onClick={onCancel}
              disabled={disabled}
            >
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
