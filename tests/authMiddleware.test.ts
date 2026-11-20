import type { Response } from "express";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { adminMiddleware } from "../src/middlewares/adminMiddleware.js";
import { authMiddleware, type AuthenticatedRequest } from "../src/middlewares/authMiddleware.js";
import { errorHandler } from "../src/middlewares/errorMiddleware.js";

const { jwtSecret, findById } = vi.hoisted(() => ({
  jwtSecret: "auth-middleware-test-key".repeat(3),
  findById: vi.fn(),
}));

vi.mock("../src/config/env.js", () => ({ env: { JWT_SECRET: jwtSecret } }));
vi.mock("../src/modules/auth/models/userModel.js", () => ({ UserModel: { findById } }));

const user = { _id: new Types.ObjectId(), role: "user", isActive: true, tokenVersion: 3 };
const claims = { sub: user._id.toHexString(), tokenVersion: user.tokenVersion };
const select = vi.fn<(fields: string) => Promise<typeof user | null>>();

function makeRequest(token: string) {
  const req = { headers: { authorization: `Bearer ${token}` } } as AuthenticatedRequest;
  const status = vi.fn().mockReturnThis();
  const json = vi.fn();
  const res = { status, json, headersSent: false } as unknown as Response;
  return { req, res, status, json, next: vi.fn() };
}

beforeEach(() => {
  findById.mockReset().mockReturnValue({ select });
  select.mockReset().mockResolvedValue(user);
});

describe("authMiddleware", () => {
  it("autentica un JWT válido y toma el rol del usuario en MongoDB", async () => {
    const { req, res, status, next } = makeRequest(jwt.sign({ ...claims, role: "admin" }, jwtSecret, { expiresIn: "7d" }));

    await authMiddleware(req, res, next);

    expect(findById).toHaveBeenCalledExactlyOnceWith(claims.sub);
    expect(req.user).toEqual({ id: claims.sub, role: "user", tokenVersion: claims.tokenVersion });
    expect(next).toHaveBeenCalledExactlyOnceWith();
    expect(status).not.toHaveBeenCalled();
  });

  it.each([
    ["vencido", jwt.sign(claims, jwtSecret, { expiresIn: -60 })],
    ["aún no vigente", jwt.sign(claims, jwtSecret, { notBefore: "1h" })],
    ["con firma inválida", jwt.sign(claims, "another-test-key")],
    ["malformado", "malformed-token"],
    ["con payload de texto", jwt.sign("texto", jwtSecret)],
    ["sin sub", jwt.sign({ tokenVersion: user.tokenVersion }, jwtSecret)],
    ["con sub que no es un ObjectId", jwt.sign({ ...claims, sub: "invalid-id" }, jwtSecret)],
    ["sin tokenVersion", jwt.sign({ sub: claims.sub }, jwtSecret)],
    ["con tokenVersion de tipo string", jwt.sign({ ...claims, tokenVersion: "3" }, jwtSecret)],
    ["con tokenVersion negativo", jwt.sign({ ...claims, tokenVersion: -1 }, jwtSecret)],
    ["con tokenVersion fraccionario", jwt.sign({ ...claims, tokenVersion: 3.5 }, jwtSecret)],
  ])("responde 401 sin consultar MongoDB cuando el JWT es %s", async (_label, token) => {
    const { req, res, status, next } = makeRequest(token);

    await authMiddleware(req, res, next);

    expect(status).toHaveBeenCalledExactlyOnceWith(401);
    expect(findById).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it.each([
    ["usuario inexistente", null],
    ["usuario inactivo", { ...user, isActive: false }],
    ["token revocado", { ...user, tokenVersion: user.tokenVersion + 1 }],
  ] as const)("responde 401 ante %s", async (_label, foundUser) => {
    select.mockResolvedValueOnce(foundUser);
    const { req, res, status, next } = makeRequest(jwt.sign(claims, jwtSecret));

    await authMiddleware(req, res, next);

    expect(findById).toHaveBeenCalledExactlyOnceWith(claims.sub);
    expect(status).toHaveBeenCalledExactlyOnceWith(401);
    expect(req.user).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it("propaga el fallo de MongoDB para que el manejador central responda 500", async () => {
    const failure = new Error("MongoDB no disponible");
    select.mockRejectedValueOnce(failure);
    const { req, res, status, json, next } = makeRequest(jwt.sign(claims, jwtSecret));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await authMiddleware(req, res, next);

      expect(next).toHaveBeenCalledExactlyOnceWith(failure);
      expect(status).not.toHaveBeenCalled();

      errorHandler(failure, req, res, next);

      expect(status).toHaveBeenCalledExactlyOnceWith(500);
      expect(json).toHaveBeenCalledExactlyOnceWith({ success: false, message: "Error interno del servidor" });
    } finally {
      log.mockRestore();
    }
  });

  it.each(["user", "admin"] as const)("conserva el permiso administrativo para el rol %s", async role => {
    select.mockResolvedValueOnce({ ...user, role });
    const { req, res, status, next } = makeRequest(jwt.sign(claims, jwtSecret));
    const adminNext = vi.fn();

    await authMiddleware(req, res, next);
    expect(next).toHaveBeenCalledExactlyOnceWith();
    adminMiddleware(req, res, adminNext);

    if (role === "admin") {
      expect(adminNext).toHaveBeenCalledExactlyOnceWith();
      expect(status).not.toHaveBeenCalled();
    } else {
      expect(status).toHaveBeenCalledExactlyOnceWith(403);
      expect(adminNext).not.toHaveBeenCalled();
    }
  });
});
