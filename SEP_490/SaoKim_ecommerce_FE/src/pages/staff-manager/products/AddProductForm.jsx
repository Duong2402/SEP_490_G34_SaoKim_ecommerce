import PropTypes from "prop-types";
import ProductForm from "./ProductForm";

function AddProductForm({ apiBase, onSuccess, onCancel }) {
  const handleSubmit = async (data) => {
    const res = await fetch(apiBase, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to create product");
    }
    onSuccess && onSuccess();
  };

  return (
    <ProductForm submitLabel="Create" onSubmit={handleSubmit} onCancel={onCancel} />
  );
}

AddProductForm.propTypes = {
  apiBase: PropTypes.string,
  onSuccess: PropTypes.func,
  onCancel: PropTypes.func,
};

AddProductForm.defaultProps = {
  apiBase: "/api/products",
  onSuccess: undefined,
  onCancel: undefined,
};

export default AddProductForm;
