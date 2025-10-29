import React from "react";
import PropTypes from "prop-types";
import ProductForm from "./ProductForm";

function EditProductForm({ id, initial, apiBase, onSuccess, onCancel }) {
  const handleSubmit = async (data) => {
    const res = await fetch(`${apiBase}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to update product");
    }
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

EditProductForm.propTypes = {
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  initial: PropTypes.object,
  apiBase: PropTypes.string,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

EditProductForm.defaultProps = {
  initial: {},
  apiBase: "/api/products",
  onSuccess: undefined,
  onCancel: undefined,
};

export default EditProductForm;
