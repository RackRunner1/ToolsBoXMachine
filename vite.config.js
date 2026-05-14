import { defineConfig } from "vite";
import { resolve } from "path";
import injectHTML from "vite-plugin-html-inject";
import fs from "fs";

export default defineConfig({
  base: "/",
  plugins: [
    injectHTML(),
    {
      name: "serve-zxcvbn",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (
            req.url === "/zxcvbn.js" ||
            req.url === "/tools/password-gen/zxcvbn.js"
          ) {
            const content = fs.readFileSync(
              resolve(__dirname, "tools/password-gen/zxcvbn.js"),
            );
            res.setHeader("Content-Type", "application/javascript");
            res.end(content);
          } else {
            next();
          }
        });
      },
      generateBundle() {
        const source = fs.readFileSync(
          resolve(__dirname, "tools/password-gen/zxcvbn.js"),
        );
        this.emitFile({
          type: "asset",
          fileName: "zxcvbn.js",
          source,
        });
        this.emitFile({
          type: "asset",
          fileName: "tools/password-gen/zxcvbn.js",
          source,
        });
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        blur: resolve(__dirname, "tools/blur/blur.html"),
        correcteur: resolve(__dirname, "tools/correcteur/correcteur.html"),
        "password-gen": resolve(
          __dirname,
          "tools/password-gen/password-gen.html",
        ),
        privacy: resolve(__dirname, "pages/privacy.html"),
        terms: resolve(__dirname, "pages/terms.html"),
        philosophy: resolve(__dirname, "pages/philosophy.html"),
        "qr-gen": resolve(__dirname, "tools/qr-gen/qr-gen.html"),
        calculator: resolve(__dirname, "tools/calculator/calculator.html"),
        "dns-leaker": resolve(__dirname, "tools/dns-leaker/dns-leaker.html"),
      },
    },
  },
});
