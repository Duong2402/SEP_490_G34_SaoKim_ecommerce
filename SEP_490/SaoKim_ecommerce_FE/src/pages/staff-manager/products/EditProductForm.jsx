import React from "react";
import ProductForm from "./ProductForm";
import useProductsApi from "../api/useProducts";

function EditProductForm({ id, initial, onSuccess, onCancel }) {
  const { updateProduct } = useProductsApi();

  const handleSubmit = async (values) => {
    const now = new Date().toISOString();

    const payload = {
      ...(initial || {}),
      productName: values.name,
      productCode: values.sku,
      categoryId: values.categoryId ? Number(values.categoryId) : null, // ✅
      price: values.price,
      quantity: values.stock,
      stock: values.stock,
      status: values.active ? "Active" : "Inactive",
      updateBy: "staff01",
      updateAt: now,
    };

    // dọn các trường cũ nếu còn sót
    delete payload.category;

    await updateProduct(id, payload);
    onSuccess && onSuccess();
  };

  return (
    <ProductForm
      defaultValues={initial}
      submitLabel="Update"
      onSubmit={handleSubmit}
      onCancel={onCancel}
    />
  );
}

export default EditProductForm;
