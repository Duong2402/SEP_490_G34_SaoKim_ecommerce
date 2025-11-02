import useProductsApi from "../api/useProducts";
import ProductForm from "./ProductForm";

function AddProductForm({  onCancel, onSuccess }) {

  const {createProduct}= useProductsApi();

  const handleCreate = async (values) => {
    const now = new Date().toISOString();

    const payload = {        
      productName: values.name,
      productCode: values.sku,
      category: values.category,
      unit: "pcs",                           // hoặc lấy từ form nếu có
      price: values.price,
      quantity: values.stock,                // quantity theo form stock
      stock: values.stock,
      status: values.active ? "Active" : "Inactive",
      image: "",
      description: "",
      supplier: "",
      note: "",
      created: now,
      date: now,
      createAt: now,
      createBy: "staff01",                   // tuỳ bạn set
      updateBy: "",
      updateAt: now,
    };

    await createProduct(payload);
    onSuccess && onSuccess()
  };

  return (
    <ProductForm submitLabel="Create" onSubmit={handleCreate} onCancel={onCancel} />
  );
}


export default AddProductForm;
