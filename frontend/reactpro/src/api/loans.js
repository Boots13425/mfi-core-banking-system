import axiosInstance from './axios';

export async function fetchLoanOfficerActiveClients() {
  const res = await axiosInstance.get('/loan-officer/clients?status=ACTIVE');
  return res.data;
}

export async function fetchClientLoanContext(clientId) {
  const res = await axiosInstance.get(`/loan-officer/clients/${clientId}/loan-context`);
  return res.data;
}

export async function createLoan(payload) {
  const res = await axiosInstance.post('/loans/', payload);
  return res.data;
}

export async function fetchLoan(loanId) {
  const res = await axiosInstance.get(`/loans/${loanId}/`);
  return res.data;
}

export async function fetchLoanSchedule(loanId) {
  const res = await axiosInstance.get(`/loans/${loanId}/schedule/`);
  return res.data;
}

export async function recordRepayment(loanId, payload) {
  const res = await axiosInstance.post(`/loans/${loanId}/repayments/`, payload);
  return res.data;
}

