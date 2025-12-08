
import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { useForm } from "react-hook-form";
import { Button, Form } from "@themesberg/react-bootstrap";
import useCategoriesApi from "../api/useCategories";
import useProductsApi from "../api/useProducts";

const normalizeDefaults = (d = {}) => ({
  sku: d.sku ?? d.productCode ?? "",
  name: d.name ?? d.productName ?? "",
  categoryId: d.categoryId ?? "",
  price: d.price ?? 0,
  stock: d.stock ?? d.quantity ?? 0,
  active: d.active ?? (d.status ? d.status === "Active" : true),
  unit: d.unit ?? "",
  description: d.description ?? "",
  supplier: d.supplier ?? "",
  note: d.note ?? "",
  imageFile: null,
  updateAt: d.updateAt ?? d.update_at ?? d.UpdateAt ?? null,
});

export default function ProductForm({
  defaultValues,
  submitLabel,
  loading,
  onSubmit,
  onCancel,
}) {
  const defaults = normalizeDefaults(defaultValues);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: defaults,
    mode: "onBlur",
  });

  const disabled = loading || isSubmitting;

  const { getCategories, createCategory } = useCategoriesApi();
  const { getUoms } = useProductsApi();

  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [addingNew, setAddingNew] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const isEdit = !!defaultValues?.id;

  const categoryId = watch("categoryId");
  const updateAt = defaults.updateAt;

  useEffect(() => {
    (async () => {
      try {
        const [catList, uomList] = await Promise.all([
          getCategories(),
          getUoms(),
        ]);
        setCategories(catList || []);
        setUoms(uomList || []);
      } catch {
        setCategories([]);
        setUoms([]);
      }
    })();
  }, []);

  const handleCategorySelect = (e) => {
    const v = e.target.value;
    if (v === "__NEW__") {
      setAddingNew(true);
      setValue("categoryId", "");
    } else {
      setAddingNew(false);
      setValue("categoryId", v);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    try {
      const created = await createCategory({ name });
      setCategories((prev) => [...prev, created]);
      setValue("categoryId", String(created.id), { shouldValidate: true });
      setAddingNew(false);
      setNewCategory("");
    } catch (err) {
      alert(err.message || "Tạo danh mục thất bại");
    }
  };

  const submitWrapped = (values) => {
    return onSubmit({
      ...values,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
    });
  };

  return (
    <Form onSubmit={handleSubmit(submitWrapped)} noValidate>
      <div className="staff-form-grid">
        {isEdit && (
          <Form.Group>
            <Form.Label>Mã SKU</Form.Label>
            <Form.Control
              type="text"
              placeholder="SKU tự sinh"
              {...register("sku")}
              disabled={true}
              readOnly
            />
          </Form.Group>
        )}

        <Form.Group>
          <Form.Label>Tên sản phẩm</Form.Label>
          <Form.Control
            type="text"
            placeholder="Nhập tên sản phẩm"
            {...register("name", { required: "Tên sản phẩm là bắt buộc" })}
            isInvalid={!!errors.name}
            disabled={disabled}
          />
          <Form.Control.Feedback type="invalid">
            {errors.name?.message}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Danh mục */}
        <Form.Group>
          <Form.Label>Danh mục</Form.Label>

          {!addingNew && (
            <Form.Select
              onChange={handleCategorySelect}
              value={categoryId ?? ""}
              {...register("categoryId", {
                validate: (v) => (v ? true : "Vui lòng chọn danh mục"),
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
              <option value="__NEW__">+ Thêm danh mục mới</option>
            </Form.Select>
          )}

          {(addingNew || categoryId === "__NEW__") && (
            <div className="d-flex gap-2 mt-2">
              <Form.Control
                type="text"
                placeholder="Tên danh mục mới"
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

        {/* Giá bán */}
        <Form.Group>
          <Form.Label>Giá bán</Form.Label>
          <Form.Control
            type="number"
            min={0}
            {...register("price", {
              required: "Giá bán là bắt buộc",
              valueAsNumber: true,
            })}
            isInvalid={!!errors.price}
            disabled={disabled}
          />
          <Form.Control.Feedback type="invalid">
            {errors.price?.message}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Số lượng / quantity */}
        <Form.Group>
          <Form.Label>Số lượng</Form.Label>
          <Form.Control
            type="number"
            min={0}
            {...register("stock", {
              required: "Số lượng là bắt buộc",
              valueAsNumber: true,
            })}
            isInvalid={!!errors.stock}
            disabled={disabled}
          />
          <Form.Control.Feedback type="invalid">
            {errors.stock?.message}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Đơn vị tính */}
        <Form.Group>
          <Form.Label>Đơn vị tính</Form.Label>
          <Form.Select
            {...register("unit", {
              required: "Đơn vị tính là bắt buộc",
            })}
            isInvalid={!!errors.unit}
            disabled={disabled || uoms.length === 0}
          >
            <option value="">-- Chọn đơn vị tính --</option>
            {uoms.map((u) => (
              <option key={u.id ?? u.Id} value={u.name ?? u.Name}>
                {u.name ?? u.Name}
              </option>
            ))}
          </Form.Select>
          <Form.Control.Feedback type="invalid">
            {errors.unit?.message}
          </Form.Control.Feedback>
        </Form.Group>

        {/* Ảnh */}
        <Form.Group>
          <Form.Label>Ảnh sản phẩm</Form.Label>
          <Form.Control
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              setValue("imageFile", file, { shouldValidate: false });
            }}
            disabled={disabled}
          />
        </Form.Group>

        {/* Mô tả */}
        <Form.Group>
          <Form.Label>Mô tả</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            placeholder="Mô tả ngắn về sản phẩm"
            {...register("description")}
            disabled={disabled}
          />
        </Form.Group>

        {/* Nhà cung cấp */}
        <Form.Group>
          <Form.Label>Nhà cung cấp</Form.Label>
          <Form.Control
            type="text"
            placeholder="Tên nhà cung cấp"
            {...register("supplier")}
            disabled={disabled}
          />
        </Form.Group>

        {/* Ghi chú */}
        <Form.Group>
          <Form.Label>Ghi chú</Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Ghi chú nội bộ"
            {...register("note")}
            disabled={disabled}
          />
        </Form.Group>

        {/* Active */}
        <Form.Check
          type="switch"
          id="active-switch"
          label="Kích hoạt hiển thị"
          {...register("active")}
          disabled={disabled}
        />
      </div>

      {/* Hiển thị update_at (nếu có) */}
      {updateAt && (
        <div className="mt-2 text-muted small">
          Cập nhật lần cuối:{" "}
          {new Date(updateAt).toLocaleString("vi-VN")}
        </div>
      )}

      <div className="d-flex gap-2 justify-content-end mt-3">
        {onCancel && (
          <Button variant="outline-secondary" onClick={onCancel} disabled={disabled}>
            Hủy
          </Button>
        )}
        <Button type="submit" disabled={disabled}>
          {submitLabel}
        </Button>
      </div>
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
  submitLabel: "Lưu",
  loading: false,
  onCancel: undefined,
};
