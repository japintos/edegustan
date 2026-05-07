import dotenv from "dotenv";

dotenv.config();

const parseCloudinaryUrl = (value?: string) => {
  if (!value) return {};

  try {
    const parsed = new URL(value);
    return {
      apiKey: decodeURIComponent(parsed.username),
      apiSecret: decodeURIComponent(parsed.password),
      cloudName: parsed.hostname
    };
  } catch {
    return {};
  }
};

const cloudinaryUrl = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

const required = (key: string, fallback?: string) => {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  clientUrl: required("CLIENT_URL", "http://localhost:5173"),
  clientUrls: (process.env.CLIENT_URLS ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  database: {
    host: required("DB_HOST", "127.0.0.1"),
    port: Number(process.env.DB_PORT ?? 3306),
    name: required("DB_NAME", "degustan_db"),
    user: required("DB_USER", "root"),
    password: process.env.DB_PASSWORD ?? ""
  },
  jwt: {
    secret: required("JWT_SECRET", "dev-secret-change-me"),
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d"
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "Degustan Drink-Store <no-reply@degustan.com>"
  },
  bank: {
    holder: process.env.BANK_ACCOUNT_HOLDER ?? "Degustan Drink-Store",
    cbu: process.env.BANK_ACCOUNT_CBU ?? "0000000000000000000000",
    alias: process.env.BANK_ACCOUNT_ALIAS ?? "DEGUSTAN.DRINKS",
    bank: process.env.BANK_ACCOUNT_BANK ?? "Banco a configurar"
  },
  mercadoPago: {
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? cloudinaryUrl.cloudName,
    apiKey: process.env.CLOUDINARY_API_KEY ?? cloudinaryUrl.apiKey,
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? cloudinaryUrl.apiSecret,
    folder: process.env.CLOUDINARY_FOLDER ?? "degustan/products"
  }
};
