import axios from "axios";

// ✅ Use Vite proxy when available (recommended)
// - In dev: browser calls http://SERVER_IP:3000/api/... (same origin), Vite proxies to Django
// - In prod: you can set VITE_API_BASE_URL to your real API domain if needed
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// Request interceptor - add access token
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        // ✅ IMPORTANT: do NOT hardcode 127.0.0.1 here.
        // Use same API base so other devices work too.
        const plain = axios.create({ baseURL: API_BASE });
        const response = await plain.post("/auth/refresh/", { refresh: refreshToken });

        const newAccessToken = response.data.access;
        localStorage.setItem("accessToken", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;