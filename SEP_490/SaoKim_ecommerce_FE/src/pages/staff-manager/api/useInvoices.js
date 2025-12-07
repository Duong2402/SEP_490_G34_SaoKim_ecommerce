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
    return res;
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

  const uploadPdf = async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await http.post(`/invoices/${id}/pdf`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res;
  };

  const getPdfBlob = async (id, inline = false) => {
    const res = await http.get(
      `/invoices/${id}/pdf${inline ? "?inline=true" : ""}`,
      { responseType: "blob" }
    );
    return res;
  };

  const generatePdf = async (id) => {
    const res = await http.post(`/invoices/${id}/generate-pdf`);
    return res;
  };

  const deletePdf = async (id) => {
    const res = await http.delete(`/invoices/${id}/pdf`);
    return res;
  };

  const sendInvoiceEmail = async (id) => {
    const res = await http.post(`/invoices/${id}/send-email`);
    return res;
  };

  return {
    fetchInvoices,
    getInvoice,
    updateStatus,
    deleteInvoice,
    uploadPdf,
    getPdfBlob,
    generatePdf,
    deletePdf,
    sendInvoiceEmail,
  };
}
