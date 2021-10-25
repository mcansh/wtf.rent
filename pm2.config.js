module.exports = {
  apps: [
    {
      name: "Remix",
      script: "remix run",
      ignore_watch: ["."],
    },
    {
      name: "Tailwind",
      script: "tailwind --output app/styles/global.css --watch --postcss",
      ignore_watch: ["."],
    },
  ],
};
