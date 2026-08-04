import app from "./app.js";
import { env, prisma } from "./config/env.js";

const server = app.listen(env.port, () => {
  console.log(`🚀 E-TUYS Backend running on http://localhost:${env.port}`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received. Server is shutting down.`);

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
