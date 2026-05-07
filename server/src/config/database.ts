import { Sequelize } from "sequelize";
import { env } from "./env.js";

export const sequelize = new Sequelize(env.database.name, env.database.user, env.database.password, {
  host: env.database.host,
  port: env.database.port,
  // Railway (and most hosts) run MySQL; Sequelize uses the mysql2 driver (dialect "mysql").
  dialect: "mysql",
  logging: env.nodeEnv === "development" ? false : false,
  define: {
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
});
