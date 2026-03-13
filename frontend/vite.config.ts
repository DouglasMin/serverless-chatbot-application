import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@chatbot/shared": path.resolve(__dirname, "../shared/types"),
    },
  },
  build: {
    outDir: "dist",
  },
});
