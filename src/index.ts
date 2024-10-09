import { fromHono } from "chanfana";
import { MemberRefresh } from "endpoints/adminMemberRefresh";
import { Context, Hono } from "hono";

import { bearerAuth } from "hono/bearer-auth";
import { cache } from "hono/cache";
import { cors } from "hono/cors";
import {
  TransmissionButtons,
  TransmissionRuntime,
} from "publicEndpoints/public";
import { authenticate } from "utils";
import { MemberCreate } from "./endpoints/adminMemberCreate";
import { MemberList } from "./endpoints/adminMemberList";
import { EventCreate } from "./endpoints/analyticsEventCreate";
import { EventList } from "./endpoints/analyticsEventList";

type Bindings = {
  DB_ROSTER: D1Database;
  TRANSMISSION: KVNamespace;
};

// Start a Hono app
const app = new Hono<{ Bindings: Bindings }>();

const allowedOrigins = new Set([
  "https://projectborealis.com",
  "https://admin.projectborealis.com",
  "https://dev.projectborealis.com",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
  "https://localhost:4321",
  "https://127.0.0.1:4321",
]);

app.use(
  "*",
  cors({
    origin: (origin: string, c: Context) => {
      if (
        allowedOrigins.has(origin) ||
        (origin.startsWith("https://") &&
          (origin.endsWith("projborealis.pages.dev") ||
            origin.endsWith("projborealis.workers.dev")))
      ) {
        return origin;
      } else {
        return "null";
      }
    },
    maxAge: 86400,
  })
);
  
app.use(
  "/api/dev/*",
  bearerAuth({
    verifyToken: async (token, c) => {
      return authenticate(token, c.env.API_DEV_TOKEN);
    },
  })
);

app.use(
  "/api/admin/*",
  bearerAuth({
    verifyToken: async (token, c) => {
      return authenticate(token, c.env.API_ADMIN_TOKEN);
    },
  })
);

app.use(
  "/api/game/*",
  bearerAuth({
    verifyToken: async (token, c) => {
      return authenticate(token, c.env.API_GAME_TOKEN);
    },
  })
);

// Setup OpenAPI registry
const openapi = fromHono(app, {
  docs_url: "/",
});

openapi.registry.registerComponent("securitySchemes", "DevBearerAuth", {
  type: "http",
  scheme: "bearer",
});

openapi.registry.registerComponent("securitySchemes", "AdminBearerAuth", {
  type: "http",
  scheme: "bearer",
});

openapi.registry.registerComponent("securitySchemes", "PublicBearerAuth", {
  type: "http",
  scheme: "bearer",
});

openapi.registry.registerComponent("securitySchemes", "GameBearerAuth", {
  type: "http",
  scheme: "bearer",
});

// Register OpenAPI endpoints
openapi.get("/api/admin/users", MemberList);
openapi.post("/api/admin/users/refresh", MemberRefresh);
openapi.post("/api/admin/users", MemberCreate);

openapi.post("api/game/analytics/event", EventCreate);
openapi.get("/api/game/analytics/event", EventList);

app.get(
  "/api/public/transmission",
  cache({
    cacheName: "transmissionRuntime",
    cacheControl: "max-age=3600",
  })
);
openapi.get("/api/public/transmission", TransmissionRuntime);
openapi.post("/api/public/transmission/button", TransmissionButtons);

// Export the Hono app
export default app;
