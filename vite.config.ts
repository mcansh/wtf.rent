import rsc from "@vitejs/plugin-rsc";
import { svgSprite } from "@mcansh/vite-plugin-svg-sprite";
import { unstable_reactRouterRSC as reactRouterRSC } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import devtoolsJson from "vite-plugin-devtools-json";


export default defineConfig({
  plugins: [tailwindcss(),
    tsconfigPaths(),
    svgSprite(),
    reactRouterRSC(),
    rsc(),
    devtoolsJson(),
  ]
});
