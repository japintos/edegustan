import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { cartRouter } from "./routes/cart.js";
import { contactRouter } from "./routes/contact.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { productsRouter } from "./routes/products.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const app = express();

// Behind Railway / reverse proxies the client IP is in X-Forwarded-For.
// express-rate-limit requires this or it throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR.
if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

const allowedOrigins = new Set([env.clientUrl, ...env.clientUrls]);

app.use(helmet());
app.use((req, res, next) => {
  const rawFwd =
    typeof req.headers["x-forwarded-host"] === "string" ? req.headers["x-forwarded-host"].split(",")[0]?.trim() ?? "" : "";
  const fromHeader = (req.headers.host ?? "").replace(/:\d+$/, "");
  const requestHost = (rawFwd || fromHeader).replace(/:\d+$/, "");

  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      try {
        const { hostname } = new URL(origin);
        if (requestHost && hostname === requestHost) {
          return callback(null, true);
        }
      } catch {
        /* ignore */
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true
  })(req, res, next);
});
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 60_000, limit: 120 }));

app.get("/api/health", (_req, res) => res.json({ ok: true, name: "Degustan Drink-Store API" }));
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/contact", contactRouter);
app.use("/api/admin", adminRouter);

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "Recurso no encontrado" });
});

const clientDist = path.resolve(__dirname, "../../client/dist");

if (env.nodeEnv === "production" && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientDist, "index.html"), (err) => {
      if (err) next(err);
    });
  });
} else {
  app.get("/", (_req, res) =>
    res.json({
      name: "Degustan Drink-Store API",
      message: "Modo desarrollo: arranca el cliente con Vite (npm run dev) o hace npm run build y NODE_ENV=production para servir la web.",
      health: "/api/health"
    })
  );
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Error interno del servidor" });
});
