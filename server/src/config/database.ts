import { Sequelize } from "sequelize";
import { env } from "./env.js";

export const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  // Railway (and most hosts) run MySQL, not MariaDB; use mysql2 via dialect "mysql".
  dialect: "mysql",
  // MySQL 8+ default auth (caching_sha2_password): allow retrieving the server RSA key.
  dialectOptions: {
    allowPublicKeyRetrieval: true
  },
  logging: env.nodeEnv === "development" ? false : false,
  define: {
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
});
