import { api } from "./apiClient";

function mapBEtoFE(p) {
  return {
    id: p.productID ?? p.id,
    sku: p.productCode ?? p.code,
    name: p.productName ?? p.name,
    category: p.category ?? null,
    price: p.price ?? 0,
    stock: p.quantity ?? 0,
    status: p.status ?? (p.active ? "Active" : "Inactive"),
    active: (p.status ?? "Active").toLowerCase() === "active",
    createdAt: p.createAt ?? p.createdAt ?? p.date ?? null,
  };
}

function mapFEtoBE(d) {
  return {
    productID: d.id,
    productName: d.name,
    productCode: d.sku,
    category: d.category,
    price: d.price,
    quantity: d.stock,
    status: d.active ? "Active" : "Inactive",
  };
}

async function listFull() {
  const basics = await api.request("/products");
  const details = await Promise.all(
    (basics || []).map((b) => api.request(`/products/detail/${b.id}`))
  );
  return details.map(mapBEtoFE);
}

function create(fePayload) {
  return api.request("/products", { method: "POST", body: mapFEtoBE(fePayload) });
}

function update(id, fePayload) {
  return api.request(`/products/${id}`, { method: "PUT", body: mapFEtoBE({ ...fePayload, id }) });
}

function remove(id) {
  return api.request(`/products/${id}`, { method: "DELETE" });
}

export const productsApi = { listFull, create, update, remove, mapBEtoFE };
