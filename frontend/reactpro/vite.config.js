import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // bind to all network interfaces so other devices on the LAN can reach
    // the dev server by using the host machine's IP and port (e.g. 192.168.1.5:3000)
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000", 
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
