// src/api/cartStorage.js

// Xác định "chủ giỏ hàng" theo email / username, fallback guest
export function getCartOwnerKey() {
  if (typeof window === "undefined") return "guest";
  const email = localStorage.getItem("userEmail");
  const name = localStorage.getItem("userName");
  return (email || name || "guest").toString();
}

export function getCartKeys() {
  const owner = getCartOwnerKey();
  return {
    itemsKey: `cartItems_${owner}`,
    countKey: `cartCount_${owner}`,
    checkoutKey: `checkoutItems_${owner}`,
  };
}

export function readCart() {
  try {
    const { itemsKey } = getCartKeys();
    const raw = localStorage.getItem(itemsKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeCart(items) {
  const normalized = Array.isArray(items) ? items : [];
  const { itemsKey, countKey } = getCartKeys();

  localStorage.setItem(itemsKey, JSON.stringify(normalized));

  const totalQty = normalized.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0),
    0
  );
  localStorage.setItem(countKey, String(totalQty));

  window.dispatchEvent(new Event("localStorageChange"));
}
