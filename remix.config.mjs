/** @type {import('@remix-run/dev').AppConfig} */
export default {
  appDirectory: "app",
  browserBuildDirectory: "public/build",
  publicPath: "/build/",
  serverBuildDirectory: "build",
  future: {
    unstable_dev: true,
    unstable_postcss: true,
    unstable_tailwind: true,
    v2_routeConvention: true,
  },
};
