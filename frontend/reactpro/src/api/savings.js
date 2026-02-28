import axiosInstance from './axios';

export async function fetchSavingsProducts() {
  const res = await axiosInstance.get('/savings/products/');
  return res.data;
}

export async function createSavingsAccount(payload) {
  const res = await axiosInstance.post('/savings/accounts/', payload);
  return res.data;
}

export async function fetchSavingsAccountsByClient(clientId) {
  const res = await axiosInstance.get(`/savings/accounts/?client_id=${clientId}`);
  return res.data;
}

export async function fetchSavingsAccount(accountId) {
  const res = await axiosInstance.get(`/savings/accounts/${accountId}/`);
  return res.data;
}

export async function fetchSavingsTransactions(accountId) {
  const res = await axiosInstance.get(`/savings/accounts/${accountId}/transactions/`);
  return res.data;
}

export async function depositToSavingsAccount(accountId, payload) {
  const res = await axiosInstance.post(`/savings/accounts/${accountId}/deposit/`, payload);
  return res.data;
}

export async function withdrawFromSavingsAccount(accountId, payload) {
  const res = await axiosInstance.post(`/savings/accounts/${accountId}/withdraw/`, payload);
  return res.data;
}

export async function fetchPendingWithdrawals() {
  const res = await axiosInstance.get('/branch-manager/savings/withdrawals/pending/');
  return res.data;
}

export async function approveWithdrawal(txId) {
  const res = await axiosInstance.post(`/branch-manager/savings/withdrawals/${txId}/approve/`);
  return res.data;
}

export async function rejectWithdrawal(txId) {
  const res = await axiosInstance.post(`/branch-manager/savings/withdrawals/${txId}/reject/`);
  return res.data;
}

