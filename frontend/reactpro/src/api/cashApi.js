import axios from "axios";

const API_BASE = import.meta.env.VITE_MAIN_API || "/api";

export const cashApi = axios.create({
  baseURL: API_BASE,
});

// Optional: attach token if you store it in localStorage
cashApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function allocateCashToCashier(payload) {
  // POST /api/cash/sessions/allocate/
  const res = await cashApi.post("/cash/sessions/allocate/", payload);
  return res.data;
}

export async function listMySessions() {
  const res = await cashApi.get("/cash/sessions/");
  return res.data;
}

export async function getMyActiveSession() {
  const res = await cashApi.get("/cash/sessions/my_active/");
  return res.data;
}

export async function confirmSessionOpening(sessionId, payload) {
  const res = await cashApi.post(`/cash/sessions/${sessionId}/confirm_opening/`, payload);
  return res.data;
}

export async function closeSession(sessionId, payload) {
  const res = await cashApi.post(`/cash/sessions/${sessionId}/close/`, payload);
  return res.data;
}

export async function reviewSession(sessionId, payload) {
  const res = await cashApi.post(`/cash/sessions/${sessionId}/review/`, payload);
  return res.data;
}

export async function listLedger(params = {}) {
  const res = await cashApi.get("/cash/ledger/", { params });
  return res.data;
}