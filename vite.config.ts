import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: "@shinederu/auth-core", replacement: path.resolve(__dirname, "../shinederu-auth-core/src/index.ts") },
      { find: "@shinederu/auth-react", replacement: path.resolve(__dirname, "../shinederu-auth-react/src/index.ts") },
    ],
  },
});
