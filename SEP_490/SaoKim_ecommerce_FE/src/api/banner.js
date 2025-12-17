import http from "./http";

function toIsoOrNull(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function buildFormData(payload) {
  const fd = new FormData();

  fd.append("title", payload?.title ?? "");
  fd.append("isActive", String(!!payload?.isActive));

  const hasFile = !!payload?.imageFile;

  if (hasFile) fd.append("imageFile", payload.imageFile);

  const imgUrl = (payload?.imageUrl ?? "").trim();
  if ((!hasFile && imgUrl) || (hasFile && imgUrl)) {
    fd.append("imageUrl", imgUrl);
  }

  if (payload?.linkUrl != null) fd.append("linkUrl", payload.linkUrl);

  const s = payload?.startDate;
  const e = payload?.endDate;

  const toIsoOrNull = (v) => {
    if (!v) return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  const startIso = toIsoOrNull(s);
  const endIso = toIsoOrNull(e);

  if (startIso) fd.append("startDate", startIso);
  if (endIso) fd.append("endDate", endIso);

  return fd;
}


export const BannerAPI = {
  getAll(params) {
    return http.get("/banner", { params });
  },
  getById(id) {
    return http.get(`/banner/${id}`);
  },

  create(payload) {
    const fd = buildFormData(payload);
    return http.post("/banner", fd);
  },

  update(id, payload) {
    const fd = buildFormData(payload);
    return http.put(`/banner/${id}`, fd);
  },

  delete(id) {
    return http.delete(`/banner/${id}`);
  },
};
