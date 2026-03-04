import axiosInstance from "./axios";

export async function getCashierDailyPack(date) {
  const qs = date ? `?date=${date}` : "";
  const res = await axiosInstance.get(`/reports/cashier_daily_pack/${qs}`);
  return res.data;
}

export async function getBranchDailyPack(date) {
  const qs = date ? `?date=${date}` : "";
  const res = await axiosInstance.get(`/reports/branch_daily_pack/${qs}`);
  return res.data;
}

export async function getBranchLiquidity(date) {
  const qs = date ? `?date=${date}` : "";
  const res = await axiosInstance.get(`/reports/branch_liquidity/${qs}`);
  return res.data;
}