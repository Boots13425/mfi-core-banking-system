import axiosInstance from './axios';

// ========== LOAN OFFICER ENDPOINTS ==========

export const loanOfficerGetClientContext = async (clientId) => {
  const response = await axiosInstance.get(`/api/loan-officer/clients/${clientId}/loan-context`);
  return response.data;
};

export const getLoanProducts = async () => {
  const response = await axiosInstance.get('/api/loan-products/');
  return response.data;
};

export const createLoan = async (clientId, payload) => {
  const response = await axiosInstance.post('/api/loans/', {
    client_id: clientId,
    ...payload,
  });
  return response.data;
};

export const updateLoan = async (loanId, payload) => {
  const response = await axiosInstance.patch(`/api/loans/${loanId}/`, payload);
  return response.data;
};

export const getLoanDetail = async (loanId) => {
  const response = await axiosInstance.get(`/api/loans/${loanId}/`);
  return response.data;
};

export const submitLoan = async (loanId) => {
  const response = await axiosInstance.post(`/api/loans/${loanId}/submit/`);
  return response.data;
};

export const uploadLoanDocument = async (loanId, file, documentType) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('document_type', documentType);
  
  const response = await axiosInstance.post(
    `/api/loans/${loanId}/documents/`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response.data;
};

export const postRepayment = async (loanId, payload) => {
  const response = await axiosInstance.post(`/api/loans/${loanId}/repayments/`, payload);
  return response.data;
};

export const waivePenalty = async (loanId, scheduleItemId, reason) => {
  const response = await axiosInstance.post(`/api/loans/${loanId}/penalties/waive/`, {
    schedule_item_id: scheduleItemId,
    waive_reason: reason,
  });
  return response.data;
};

// ========== BRANCH MANAGER ENDPOINTS ==========

export const getBranchManagerLoanQueue = async (branchId) => {
  const response = await axiosInstance.get(`/api/branch-manager/loans/submitted/`, {
    params: { branch_id: branchId }
  });
  return response.data;
};

export const approveLoan = async (loanId, remarks = '') => {
  const response = await axiosInstance.post(`/api/branch-manager/loans/${loanId}/approve/`, {
    remarks,
  });
  return response.data;
};

export const rejectLoan = async (loanId, reason) => {
  const response = await axiosInstance.post(`/api/branch-manager/loans/${loanId}/reject/`, {
    rejection_reason: reason,
  });
  return response.data;
};

export const requestLoanChanges = async (loanId, remarks) => {
  const response = await axiosInstance.post(`/api/branch-manager/loans/${loanId}/request-changes/`, {
    remarks,
  });
  return response.data;
};

// ========== CASHIER ENDPOINTS ==========

export const getCashierApprovedLoans = async (branchId) => {
  const response = await axiosInstance.get(`/api/cashier/loans/approved/`, {
    params: { branch_id: branchId }
  });
  return response.data;
};

export const disburseLoan = async (loanId, payload) => {
  const response = await axiosInstance.post(`/api/cashier/loans/${loanId}/disburse/`, payload);
  return response.data;
};

export const postCashierRepayment = async (loanId, payload) => {
  const response = await axiosInstance.post(`/api/loans/${loanId}/repayments/`, payload);
  return response.data;
};
