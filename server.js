import { reactRouterFastify } from "@mcansh/remix-fastify/react-router";
import fastify from "fastify";

async function start() {
  let app = fastify();

  await app.register(reactRouterFastify);

  let port = process.env.PORT ? Number(process.env.PORT) || 3000 : 3000;

  let address = await app.listen({ port, host: "0.0.0.0" });
  console.log(`✅ app ready: ${address}`);
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
