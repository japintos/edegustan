import { app } from "./app.js";
import { env } from "./config/env.js";
import { initDatabase } from "./models/index.js";

const start = async () => {
  await initDatabase();
  app.listen(env.port, () => {
    console.log(`Degustan API running on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
