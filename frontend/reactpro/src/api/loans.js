import axiosInstance from './axios';

// LOAN PRODUCTS
export const getLoanProducts = async () => {
  const response = await axiosInstance.get('/loan-products/');
  return response.data;
};

export const getLoanProductDetail = async (productId) => {
  const response = await axiosInstance.get(`/loan-products/${productId}/`);
  return response.data;
};

// LOAN OFFICER - CLIENTS & CONTEXT
export const getActiveLoanOfficerClients = async () => {
  const response = await axiosInstance.get('/loan-officer/clients/');
  return response.data.clients;
};

export const getLoanContext = async (clientId) => {
  const response = await axiosInstance.get(`/loan-officer/clients/${clientId}/loan-context/`);
  return response.data;
};

// LOAN CRUD
export const createLoan = async (loanData) => {
  const response = await axiosInstance.post('/loans/', loanData);
  return response.data;
};

export const getLoanDetail = async (loanId) => {
  const response = await axiosInstance.get(`/loans/${loanId}/`);
  return response.data;
};

export const updateLoan = async (loanId, loanData) => {
  const response = await axiosInstance.patch(`/loans/${loanId}/`, loanData);
  return response.data;
};

export const listLoans = async () => {
  const response = await axiosInstance.get('/loans/');
  return response.data;
};

// LOAN SUBMISSION
export const submitLoan = async (loanId) => {
  const response = await axiosInstance.post(`/loans/${loanId}/submit/`);
  return response.data;
};

// DOCUMENTS
export const uploadLoanDocument = async (loanId, documentData) => {
  const formData = new FormData();
  formData.append('document_type', documentData.document_type);
  formData.append('document_file', documentData.document_file);
  if (documentData.label) {
    formData.append('label', documentData.label);
  }
  if (documentData.description) {
    formData.append('description', documentData.description);
  }
  
  const response = await axiosInstance.post(
    `/loans/${loanId}/upload_document/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const uploadLoanDocumentsBulk = async (loanId, formData) => {
  const response = await axiosInstance.post(
    `/loans/${loanId}/upload_documents_bulk/`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
};

export const getLoanDocuments = async (loanId) => {
  const response = await axiosInstance.get(`/loans/${loanId}/get_documents/`);
  return response.data;
};

// REPAYMENT SCHEDULE
export const getLoanSchedule = async (loanId) => {
  const response = await axiosInstance.get(`/loans/${loanId}/get_schedule/`);
  return response.data;
};

// REPAYMENT
export const postRepayment = async (loanId, repaymentData) => {
  const response = await axiosInstance.post(`/loans/${loanId}/post_repayment/`, repaymentData);
  return response.data;
};

// PENALTY WAIVER
export const waivePenalty = async (loanId, waiverData) => {
  const response = await axiosInstance.post(`/loans/${loanId}/waive_penalty/`, waiverData);
  return response.data;
};

// BRANCH MANAGER
export const getSubmittedLoans = async () => {
  const response = await axiosInstance.get('/branch-manager/loans/submitted/');
  return response.data;
};

export const getBranchManagerLoanDetail = async (loanId) => {
  const response = await axiosInstance.get(`/branch-manager/loans/${loanId}/`);
  return response.data;
};

export const approveLoan = async (loanId) => {
  const response = await axiosInstance.post(`/branch-manager/loans/${loanId}/approve/`);
  return response.data;
};

export const rejectLoan = async (loanId, remarks) => {
  const response = await axiosInstance.post(`/branch-manager/loans/${loanId}/reject/`, { remarks });
  return response.data;
};

export const requestLoanChanges = async (loanId, remarks) => {
  const response = await axiosInstance.post(`/branch-manager/loans/${loanId}/request-changes/`, { remarks });
  return response.data;
};

// CASHIER
export const getApprovedLoans = async () => {
  const response = await axiosInstance.get('/cashier/loans/approved/');
  return response.data;
};

export const disburseLoan = async (loanId, disbursementData) => {
  const response = await axiosInstance.post(`/cashier/loans/${loanId}/disburse/`, disbursementData);
  return response.data;
};

// Default export for backward compatibility
export default {
  getLoanProducts,
  getLoanProductDetail,
  getActiveLoanOfficerClients,
  getLoanContext,
  createLoan,
  getLoanDetail,
  updateLoan,
  listLoans,
  submitLoan,
  uploadLoanDocument,
  uploadLoanDocumentsBulk,
  getLoanDocuments,
  getLoanSchedule,
  postRepayment,
  waivePenalty,
  getSubmittedLoans,
  getBranchManagerLoanDetail,
  approveLoan,
  rejectLoan,
  requestLoanChanges,
  getApprovedLoans,
  disburseLoan,
};
