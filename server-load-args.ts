// remix/node-tsx stays first so Node can load the TypeScript preload.
export const serverLoadArgs = ["--import", "remix/node-tsx", "--import", "./instrument.ts"] as const
