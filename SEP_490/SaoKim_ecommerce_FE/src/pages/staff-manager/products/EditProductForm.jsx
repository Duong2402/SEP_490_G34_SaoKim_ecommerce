
import React from "react";
import ProductForm from "./ProductForm";
import useProductsApi from "../api/useProducts";

function EditProductForm({ id, initial, onSuccess, onCancel }) {
  const { updateProduct } = useProductsApi();

  const handleSubmit = async (values) => {
    const payload = {
      sku: values.sku,
      name: values.name,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
      unit: values.unit || initial?.unit,
      price: values.price,
      quantity: values.stock,
      stock: values.stock,
      active: values.active,
      description:
        values.description ??
        initial?.description ??
        "",
      supplier:
        values.supplier ??
        initial?.supplier ??
        "",
      note:
        values.note ??
        initial?.note ??
        "",
      updateBy: "staff01",
      imageFile: values.imageFile || null,
    };

    await updateProduct(id, payload);
    onSuccess && onSuccess();
  };

  return (
    <ProductForm
      defaultValues={initial}
      submitLabel="Cập nhật"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}

export default EditProductForm;
