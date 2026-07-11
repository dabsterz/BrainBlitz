import express from "express";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { registerSocketHandlers, roomManager } from "./socketHandlers.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.set("trust proxy", true);
app.use(express.json());

function getMachineIpAddress() {
  const interfaces = os.networkInterfaces();
  const addresses = Object.values(interfaces)
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => entry.address);

  return (
    addresses.find((address) => address.startsWith("192.168.")) ||
    addresses.find((address) => address.startsWith("10.")) ||
    addresses.find((address) => /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) ||
    addresses[0] ||
    null
  );
}

function getRequestHost(req) {
  return req.get("x-forwarded-host")?.split(",")[0]?.trim() || req.get("host") || `localhost:${port}`;
}

function getHostname(host) {
  if (host.startsWith("[")) {
    const endBracket = host.indexOf("]");
    return host.slice(1, endBracket === -1 ? undefined : endBracket).toLowerCase();
  }

  return host.split(":")[0].toLowerCase();
}

function isLoopbackHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getJoinBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/$/, "");

  const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol || "http";
  const requestHost = getRequestHost(req);
  const hostname = getHostname(requestHost);
  const requestPort = requestHost.includes(":") ? requestHost.split(":").at(-1) : "";
  const machineIp = getMachineIpAddress();

  if (!isLoopbackHost(hostname)) return `${protocol}://${requestHost}`;
  if (!machineIp) return `${protocol}://${requestHost}`;

  return requestPort ? `${protocol}://${machineIp}:${requestPort}` : `${protocol}://${machineIp}`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "BrainBlitz" });
});

app.get("/api/join-url", (req, res) => {
  const hostname = getHostname(getRequestHost(req));
  res.json({
    baseUrl: getJoinBaseUrl(req),
    machineIp: isLoopbackHost(hostname) ? getMachineIpAddress() : null
  });
});

if (isProduction) {
  const distPath = path.join(root, "dist");
  if (!fs.existsSync(path.join(distPath, "index.html"))) {
    throw new Error("Production build not found. Run `npm run build` before `npm start`.");
  }
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  const { createServer } = await import("vite");
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: "spa",
    root
  });
  app.use(vite.middlewares);
}

registerSocketHandlers(io);

const cleanupTimer = setInterval(() => roomManager.cleanupExpiredRooms(), 5 * 60 * 1000);
cleanupTimer.unref?.();

server.listen(port, "0.0.0.0", () => {
  console.log(`BrainBlitz running at http://localhost:${port}`);
});
