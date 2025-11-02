import React from "react";
import PropTypes from "prop-types";
import ProductForm from "./ProductForm";
import useProductsApi from "../api/useProducts";

function EditProductForm({ id, initial, onSuccess, onCancel }) {

  const {updateProduct, } = useProductsApi()


  // Submit từ form -> gọi API
  const handleSubmit = async (values) => {
    const now = new Date().toISOString();

    const payload = {
      // giữ lại các trường cũ nếu BE cần (tránh mất dữ liệu không có trên form)
      ...(initial || {}),

      productName: values.name,
      productCode: values.sku,
      category: values.category,
      price: values.price,
      quantity: values.stock,
      stock: values.stock,
      status: values.active ? "Active" : "Inactive",

      // các trường meta
      updateBy: "staff01",
      updateAt: now,
    };

    // tuỳ API có cho gửi productID hay không; nếu không thì xóa:
    // delete payload.productID;

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
