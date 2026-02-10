import axiosInstance from "./axios";

const KYC_API = {
  byClient: (clientId) => `/clients/${clientId}/kyc/`,
  submit: (clientId) => `/clients/${clientId}/kyc/submit/`,
  verify: (clientId) => `/clients/${clientId}/kyc/verify/`,
  reject: (clientId) => `/clients/${clientId}/kyc/reject/`,
};

export async function getClient(clientId) {
  const res = await axiosInstance.get(`/clients/${clientId}/`);
  return res.data;
}

export async function getKyc(clientId) {
  const res = await axiosInstance.get(KYC_API.byClient(clientId));
  return res.data;
}

/**
 * IMPORTANT:
 * Backend allows PATCH (not POST) for /clients/:id/kyc/
 */
export async function saveKyc(clientId, payload) {
  const res = await axiosInstance.patch(KYC_API.byClient(clientId), payload);
  return res.data;
}

export async function submitKyc(clientId) {
  const res = await axiosInstance.post(KYC_API.submit(clientId));
  return res.data;
}

export async function verifyKyc(clientId) {
  const res = await axiosInstance.post(KYC_API.verify(clientId));
  return res.data;
}

export async function rejectKyc(clientId, payload) {
  const res = await axiosInstance.post(KYC_API.reject(clientId), payload);
  return res.data;
}
