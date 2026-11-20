import { once } from "node:events";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";
import { changePasswordSchema, registerSchema } from "../src/modules/auth/schemas/authSchema.js";

const { jwtSecret, findById, findOne, updateOne, create } = vi.hoisted(() => ({
  jwtSecret: "logout-test-key".repeat(5),
  findById: vi.fn(),
  findOne: vi.fn(),
  create: vi.fn(),
  updateOne: vi.fn<(filter: { _id: string; isActive: boolean; tokenVersion: number }, update: { $inc: { tokenVersion: number }; $set?: { password: string } }) => {
    exec: () => Promise<{ matchedCount: number }>;
  }>(),
}));

vi.mock("../src/config/env.js", () => ({ env: { JWT_SECRET: jwtSecret, CLIENT_URL: "http://localhost:5173" } }));
vi.mock("../src/modules/auth/models/userModel.js", () => ({ UserModel: { findById, findOne, updateOne, create } }));

const user = { _id: new Types.ObjectId(), username: "neko", email: "neko@example.test", role: "user", isActive: true };
const userId = user._id.toHexString();
const password = "only-for-logout-tests";
const profile = { _id: user._id, username: user.username, email: user.email, role: user.role };
const readUser = vi.fn<() => Promise<typeof user & { tokenVersion: number }>>();
const beforeWrite = vi.fn<() => Promise<void>>();
const save = vi.fn<() => Promise<void>>();
const expiredSession = { success: false, message: "La sesión ha expirado. Inicia sesión nuevamente" };
let tokenVersion: number;
let originalHash: string;
let passwordHash: string;
let server: ReturnType<typeof app.listen>;
let authUrl: string;

function postLogout(token: string) {
  return fetch(`${authUrl}/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
}

function getProfile(token: string) {
  return fetch(`${authUrl}/me`, { headers: { Authorization: `Bearer ${token}` } });
}

function patch(path: string, token: string, data: object) {
  return fetch(`${authUrl}/${path}`, {
    method: "PATCH", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
}

function login(password: string) {
  return fetch(`${authUrl}/login`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, password }),
  });
}

function makeToken(version: number) {
  return jwt.sign({ sub: userId, tokenVersion: version }, jwtSecret);
}

function holdWrite() {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  return { pending, release };
}

beforeAll(async () => {
  originalHash = await bcrypt.hash(password, 4);
  server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("El servidor de prueba no tiene un puerto TCP");
  authUrl = `http://127.0.0.1:${address.port}/api/v1/auth`;
});

afterAll(async () => {
  if (!server?.listening) return;
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

beforeEach(() => {
  tokenVersion = 0;
  passwordHash = originalHash;
  save.mockReset().mockResolvedValue(undefined);
  create.mockReset().mockResolvedValue(user);
  findOne.mockReset().mockReturnValue(Object.assign(Promise.resolve(null), {
    select: async () => ({ ...user, password: passwordHash, tokenVersion }),
  }));
  readUser.mockReset().mockImplementation(async () => ({ ...user, tokenVersion }));
  beforeWrite.mockReset().mockResolvedValue(undefined);
  findById.mockReset().mockImplementation(() => Object.assign(Promise.resolve({ ...user, save }), {
    select: (fields: string) => {
      if (fields.includes("tokenVersion")) return readUser();
      if (fields === "+password") return Promise.resolve({ ...user, password: passwordHash, tokenVersion });
      return { lean: () => ({ exec: async () => profile }) };
    },
  }));
  updateOne.mockReset().mockImplementation((filter, { $inc, $set }) => ({
    exec: async () => {
      await beforeWrite();
      if (filter._id !== userId || filter.isActive !== user.isActive || filter.tokenVersion !== tokenVersion) return { matchedCount: 0 };
      if ($set) passwordHash = $set.password;
      tokenVersion += $inc.tokenVersion;
      return { matchedCount: 1 };
    },
  }));
});

describe("PATCH /api/v1/auth/change-password", () => {
  const next = "nueva-contraseña-segura";

  it("revoca la versión anterior con una operación y permite iniciar sesión con la contraseña nueva", async () => {
    const oldToken = makeToken(0);
    const response = await patch("change-password", oldToken, { currentPassword: password, newPassword: next });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "Contraseña actualizada correctamente" });
    expect(updateOne).toHaveBeenCalledExactlyOnceWith(
      { _id: userId, isActive: true, tokenVersion: 0 }, { $set: { password: expect.any(String) }, $inc: { tokenVersion: 1 } },
    );
    expect(await bcrypt.compare(next, passwordHash)).toBe(true);
    expect((await getProfile(oldToken)).status).toBe(401);
    expect((await login(password)).status).toBe(401);
    const freshLogin = await login(next);
    expect(freshLogin.status).toBe(200);
    const body = await freshLogin.json() as { data: { token: string } };
    expect(jwt.verify(body.data.token, jwtSecret)).toMatchObject({ tokenVersion: 1 });
    expect((await getProfile(body.data.token)).status).toBe(200);
  });

  it("rechaza una contraseña actual incorrecta y no escribe", async () => {
    const response = await patch("change-password", makeToken(0), { currentPassword: "incorrecta", newPassword: next });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "La contraseña actual es incorrecta" });
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("rechaza nuevas contraseñas iguales o de más de 72 bytes antes de escribir", async () => {
    for (const newPassword of [password, "é".repeat(36) + "a"]) {
      const response = await patch("change-password", makeToken(0), { currentPassword: password, newPassword });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({ errors: { fieldErrors: { newPassword: [expect.any(String)] } } });
    }
    expect(updateOne).not.toHaveBeenCalled();
  });

  it("aplica un solo cambio si dos solicitudes alcanzan la escritura con el mismo JWT", async () => {
    const write = holdWrite();
    beforeWrite.mockReturnValue(write.pending);
    const token = makeToken(0);
    const passwords = [next, "otra-contraseña-segura"];
    const pending = Promise.all(passwords.map(newPassword => patch("change-password", token, { currentPassword: password, newPassword })));
    try {
      await vi.waitFor(() => expect(beforeWrite).toHaveBeenCalledTimes(2), { timeout: 3000 });
    } finally {
      write.release();
    }

    const responses = await pending;
    expect(responses.map(response => response.status).sort()).toEqual([200, 401]);
    expect(tokenVersion).toBe(1);
    expect(await bcrypt.compare(passwords[responses.findIndex(response => response.status === 200)]!, passwordHash)).toBe(true);
  });

  it("un cambio retenido pierde ante logout y conserva válido el login posterior", async () => {
    const write = holdWrite();
    beforeWrite.mockReturnValueOnce(write.pending);
    const token = makeToken(0);
    const pending = patch("change-password", token, { currentPassword: password, newPassword: next });
    let freshToken: string;
    try {
      await vi.waitFor(() => expect(beforeWrite).toHaveBeenCalledTimes(1), { timeout: 3000 });
      expect((await postLogout(token)).status).toBe(200);
      const response = await login(password);
      expect(response.status).toBe(200);
      freshToken = (await response.json() as { data: { token: string } }).data.token;
    } finally {
      write.release();
    }

    expect((await pending).status).toBe(401);
    expect(await bcrypt.compare(password, passwordHash)).toBe(true);
    expect(tokenVersion).toBe(1);
    expect((await getProfile(freshToken)).status).toBe(200);
  });

  it("conserva la versión y responde 500 cuando MongoDB rechaza la escritura", async () => {
    beforeWrite.mockRejectedValueOnce(new Error("Fallo simulado de MongoDB"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await patch("change-password", makeToken(0), { currentPassword: password, newPassword: next });
      expect(response.status).toBe(500);
      expect(tokenVersion).toBe(0);
      expect(passwordHash).toBe(originalHash);
    } finally {
      log.mockRestore();
    }
  });
});

describe("Edición y registro de perfil", () => {
  it.each(["username", "email"])("responde 409 ante un E11000 del índice de %s", async field => {
    save.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { [field]: 1 } }));
    const response = await patch("me", makeToken(0), { username: "neko_nuevo" });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ success: false, message: "El correo o nombre de usuario ya está registrado" });
  });

  it("conserva el 500 de un índice inesperado", async () => {
    save.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { _id: 1 } }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const response = await patch("me", makeToken(0), { username: "neko_nuevo" });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, message: "Error interno del servidor" });
    } finally {
      log.mockRestore();
    }
  });

  it("devuelve el perfil parcial con los campos normalizados y conserva la sesión", async () => {
    const response = await patch("me", makeToken(0), { username: "  neko_nuevo ", email: " NEKO@EXAMPLE.TEST " });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { id: userId, username: "neko_nuevo", email: user.email } });
    expect(tokenVersion).toBe(0);
    expect(await getProfile(makeToken(0))).toMatchObject({ status: 200 });
  });

  it("aplica el límite exacto de 72 bytes UTF-8 en ambos esquemas", () => {
    const boundary = "é".repeat(36);
    for (const candidate of [boundary, boundary + "a"]) {
      const accepts = candidate === boundary;
      expect(registerSchema.safeParse({ ...user, password: candidate }).success).toBe(accepts);
      expect(changePasswordSchema.safeParse({ currentPassword: password, newPassword: candidate }).success).toBe(accepts);
    }
  });

  it("traduce a 409 un correo duplicado durante la escritura de registro", async () => {
    create.mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: 11000, keyPattern: { email: 1 } }));
    const response = await fetch(`${authUrl}/register`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username, email: user.email, password }),
    });
    expect(response.status).toBe(409);
  });
});

describe("POST /api/v1/auth/logout", () => {
  it("incrementa la versión una vez y revoca los tokens de esa versión", async () => {
    const token = makeToken(0);
    const response = await postLogout(token);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, message: "Sesión cerrada correctamente" });
    expect(updateOne).toHaveBeenCalledExactlyOnceWith({ _id: userId, isActive: true, tokenVersion: 0 }, { $inc: { tokenVersion: 1 } });
    expect(tokenVersion).toBe(1);
    expect((await getProfile(token)).status).toBe(401);

    const repeat = await postLogout(token);
    expect(repeat.status).toBe(401);
    expect(await repeat.json()).toEqual(expiredSession);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });

  it("responde 200 y 401 cuando dos logout de la misma versión pasan el middleware antes de escribir", async () => {
    const write = holdWrite();
    beforeWrite.mockReturnValue(write.pending);
    const token = makeToken(0);
    const requests = Promise.all([postLogout(token), postLogout(token)]);

    try {
      await vi.waitFor(() => expect(beforeWrite).toHaveBeenCalledTimes(2));
      expect(tokenVersion).toBe(0);
    } finally {
      write.release();
    }

    const responses = await requests;
    expect(responses.map(response => response.status).sort()).toEqual([200, 401]);
    expect(await responses.find(response => response.status === 401)?.json()).toEqual(expiredSession);
    expect(tokenVersion).toBe(1);
  });

  it("mantiene válido el JWT de un nuevo login cuando termina un logout anterior", async () => {
    const write = holdWrite();
    beforeWrite.mockReturnValueOnce(write.pending);
    const oldToken = makeToken(0);
    const delayedLogout = postLogout(oldToken);
    let newToken: string;

    try {
      await vi.waitFor(() => expect(beforeWrite).toHaveBeenCalledTimes(1));
      expect((await postLogout(oldToken)).status).toBe(200);

      const login = await fetch(`${authUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, password }),
      });
      expect(login.status).toBe(200);
      const body = await login.json() as { data: { token: string } };
      newToken = body.data.token;
      expect(jwt.verify(newToken, jwtSecret)).toMatchObject({ sub: userId, tokenVersion: 1 });
      expect((await getProfile(newToken)).status).toBe(200);
    } finally {
      write.release();
    }

    const response = await delayedLogout;
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual(expiredSession);
    expect(tokenVersion).toBe(1);
    expect((await getProfile(newToken)).status).toBe(200);
  });

  it.each(["lectura", "escritura"])("responde 500 si falla MongoDB durante la %s", async operation => {
    const error = new Error("Fallo simulado de MongoDB");
    if (operation === "lectura") readUser.mockRejectedValueOnce(error);
    else beforeWrite.mockRejectedValueOnce(error);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await postLogout(makeToken(0));
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ success: false, message: "Error interno del servidor" });
      expect(updateOne).toHaveBeenCalledTimes(operation === "lectura" ? 0 : 1);
      expect(tokenVersion).toBe(0);
    } finally {
      log.mockRestore();
    }
  });
});
