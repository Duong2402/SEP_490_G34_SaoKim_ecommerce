

export async function createReceivingSlip() {
  const data = {
    supplier: "Test",
    receiptDate: "2025-10-26T00:00:00Z",
    referenceNo: "RCV-1001",
    note: "nhập lô 1",
    items: [
      { productId: 1, productName: "Đèn Rạng Đông", uom: "cái", quantity: 10, unitPrice: 200000 },
      { productId: 2, productName: "Đèn Hừng Sáng", uom: "cái", quantity: 5, unitPrice: 350000 }
    ]
  };

  try {
    const res = await fetch("https://localhost:7278/api/warehousemanager/receiving-slips", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const error = await res.json();
      console.error("Error:", error);
    } else {
      const result = await res.json();
      console.log("Created:", result);
    }
  } catch (err) {
    console.error("Network error:", err);
  }
}
