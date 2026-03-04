// cashApi.js
// Shared instance ensures authorization headers and refresh logic are applied
// consistently across the app. Previous version duplicated functions and used
// a separate axios instance with a mismatched storage key for the token.

import axiosInstance from './axios';

// expose underlying instance in case other modules expect `cashApi`
export const cashApi = axiosInstance;

// simple global event for other parts of the app to know when a cash-affecting
// change has occurred (deposit, withdrawal, repayment, disbursement, etc.).
// Components that display the active session can listen for the
// `cashSessionChanged` event and refresh themselves.
export function notifyCashSessionChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('cashSessionChanged'));
  }
}

export async function allocateCashToCashier(payload) {
  const res = await axiosInstance.post('/cash/sessions/allocate/', payload);
  return res.data;
}

export async function listMySessions() {
  const res = await axiosInstance.get('/cash/sessions/');
  return res.data;
}

export async function getMyActiveSession() {
  const res = await axiosInstance.get('/cash/sessions/my_active/');
  return res.data;
}

export async function confirmSessionOpening(sessionId, payload) {
  const res = await axiosInstance.post(`/cash/sessions/${sessionId}/confirm_opening/`, payload);
  return res.data;
}

export async function closeSession(sessionId, payload) {
  const res = await axiosInstance.post(`/cash/sessions/${sessionId}/close/`, payload);
  return res.data;
}

export async function reviewSession(sessionId, payload) {
  const res = await axiosInstance.post(`/cash/sessions/${sessionId}/review/`, payload);
  return res.data;
}

export async function listLedger(params = {}) {
  const res = await axiosInstance.get('/cash/ledger/', { params });
  return res.data;
}

