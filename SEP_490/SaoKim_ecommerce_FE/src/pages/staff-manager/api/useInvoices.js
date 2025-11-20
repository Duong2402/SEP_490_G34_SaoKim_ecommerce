import http from "@/api/http";

export default function useInvoicesApi() {
  const buildQuery = (opts = {}) => {
    const params = new URLSearchParams();
    if (opts.q) params.set("q", opts.q);
    if (opts.page) params.set("page", opts.page);
    if (opts.pageSize) params.set("pageSize", opts.pageSize);
    if (opts.sortBy) params.set("sortBy", opts.sortBy);
    if (opts.sortDir) params.set("sortDir", opts.sortDir);
    if (opts.status) params.set("status", opts.status);
    return params.toString();
  };

  const fetchInvoices = async (opts = {}) => {
    const qs = buildQuery(opts);
    const res = await http.get(`/invoices${qs ? "?" + qs : ""}`);
    return res;                         // interceptor đã trả về res.data rồi
  };

  const getInvoice = async (id) => {
    const res = await http.get(`/invoices/${id}`);
    return res;
  };

  const updateStatus = async (id, status) => {
    const res = await http.put(`/invoices/${id}/status`, { status });
    return res;
  };

  const deleteInvoice = async (id) => {
    const res = await http.delete(`/invoices/${id}`);
    return res;
  };

  // PDF: upload thủ công (giữ nếu cần)
  const uploadPdf = async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await http.post(`/invoices/${id}/pdf`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  };

  // PDF: lấy blob; inline=true để preview (Content-Disposition:inline)
  const getPdfBlob = async (id, inline = false) => {
    const res = await http.get(
      `/invoices/${id}/pdf${inline ? "?inline=true" : ""}`,
      { responseType: "blob" }
    );
    return res;             // interceptor trả về blob (res.data)
  };

  // PDF: generate theo nghiệp vụ (Paid mới cho phép)
  const generatePdf = async (id) => {
    const res = await http.post(`/invoices/${id}/generate-pdf`);
    return res;
  };

  const deletePdf = async (id) => {
    const res = await http.delete(`/invoices/${id}/pdf`);
    return res;
  };

  return {
    fetchInvoices,
    getInvoice,
    updateStatus,
    deleteInvoice,
    // PDF helpers
    uploadPdf,
    getPdfBlob,
    generatePdf,
    deletePdf,
  };
}
