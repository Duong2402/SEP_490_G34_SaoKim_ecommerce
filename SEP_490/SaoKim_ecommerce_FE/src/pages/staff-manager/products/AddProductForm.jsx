
import useProductsApi from "../api/useProducts";
import ProductForm from "./ProductForm";

function AddProductForm({ onCancel, onSuccess }) {
  const { createProduct } = useProductsApi();

  const handleCreate = async (values) => {
    const payload = {
      sku: values.sku,
      name: values.name,
      categoryId: values.categoryId ? Number(values.categoryId) : null,
      unit: values.unit,
      price: values.price,
      quantity: values.stock,
      stock: values.stock,
      active: values.active,
      description: values.description || "",
      supplier: values.supplier || "",
      note: values.note || "",
      imageFile: values.imageFile || null,
    };

    await createProduct(payload);
    onSuccess && onSuccess();
  };

  return (
    <ProductForm
      submitLabel="Thêm sản phẩm"
      onSubmit={handleCreate}
      onCancel={onCancel}
    />
  );
}

export default AddProductForm;
