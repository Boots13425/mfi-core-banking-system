// src/api/http.js

export function getAuthToken() {
  // Try common keys (including our actual key used by axios.js)
  return (
    localStorage.getItem("accessToken") ||   // ✅ ADD THIS
    localStorage.getItem("access") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt") ||
    ""
  );
}

export async function apiFetch(url, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(options.headers || {}),
  };

  // Only set JSON header when body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // ✅ Avoid 304 cache issues masking auth problems
  const res = await fetch(url, {
    ...options,
    headers,
    cache: "no-store",
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const message =
      (data && data.detail) ||
      (typeof data === "string" ? data : "Request failed");
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
