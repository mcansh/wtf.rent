import { svgSprite } from "@mcansh/vite-plugin-svg-sprite";
import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import rsc from "@vitejs/plugin-rsc";
import { defineConfig } from "vite";
import { denyImports } from "vite-env-only";
import devtoolsJson from "vite-plugin-devtools-json";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tailwindcss(),
    denyImports({
      client: { files: ["**/.server/*", "**/*.server.*"] },
    }),
    tsconfigPaths(),
    svgSprite(),
    reactRouterRSC(),
    rsc(),
    devtoolsJson(),
  ],
});
