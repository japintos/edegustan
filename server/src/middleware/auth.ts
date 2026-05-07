import { NextFunction, Request, Response } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { Role, User } from "../models/index.js";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    role: string;
    email: string | null;
  };
}

export const signToken = (user: User) =>
  jwt.sign(
    { id: user.id, role: user.role?.nombre ?? "cliente", email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn as SignOptions["expiresIn"] }
  );

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token) {
    return res.status(401).json({ message: "Token requerido" });
  }

  try {
    const payload = jwt.verify(token, env.jwt.secret) as { id: number };
    const user = await User.findByPk(payload.id, { include: [{ model: Role, as: "role" }] });

    if (!user || !user.activo) {
      return res.status(401).json({ message: "Usuario no autorizado" });
    }

    req.user = { id: user.id, role: user.role?.nombre ?? "cliente", email: user.email };
    return next();
  } catch {
    return res.status(401).json({ message: "Token invalido" });
  }
};

export const requireRole = (...roles: string[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Permisos insuficientes" });
  }

  return next();
};
