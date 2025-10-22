// vite.config.js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@components": path.resolve(__dirname, "src/components"),
      "@account":    path.resolve(__dirname, "src/components/account"),
      "@shop":       path.resolve(__dirname, "src/components/shop"),
      "@ui":         path.resolve(__dirname, "src/components/ui"),
      "@context":    path.resolve(__dirname, "src/context"),
      "@hooks":      path.resolve(__dirname, "src/hooks"),
      "@lib":        path.resolve(__dirname, "src/lib"),
      "@logic":      path.resolve(__dirname, "src/logic"),
      "@api":        path.resolve(__dirname, "src/pages/api"),
      "@pages":      path.resolve(__dirname, "src/pages"),
    },
  },

  /* ✅ Help Vite pre-bundle Recharts correctly */
  optimizeDeps: {
    include: ["recharts"],
  },

  server: {
    middlewareMode: false,
    port: 5173,
    setupMiddlewares(middlewares) {
      middlewares.use(async (req, res, next) => {
        if (req.method === "POST" && req.url === "/api/journal-prompt") {
          let body = "";
          req.on("data", (c) => (body += c));
          req.on("end", () => {
            try {
              const { mood="", social_battery="", love_language="", archetype="" } = JSON.parse(body || "{}");
              const prompt =
                `What's on your mind today? ` +
                (mood || social_battery || love_language
                  ? `Consider how feeling ${mood || "?"}, `
                    + `with ${social_battery || "?"} social energy, `
                    + `and needing ${love_language || "?"} might be shaping your day${
                        archetype ? ` as a ${archetype}` : ""
                      }.`
                  : "");
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ prompt, source: "dev-mock" }));
            } catch {
              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ prompt: "What's on your mind today?", source: "dev-mock" }));
            }
          });
          return;
        }
        next();
      });
      return middlewares;
    },
  },
})
