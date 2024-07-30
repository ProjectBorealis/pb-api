import { fromHono } from "chanfana";
import { Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { authenticate } from "utils";
import { MemberCreate } from "./endpoints/adminMemberCreate";
import { MemberList } from "./endpoints/adminMemberList";

type Bindings = {
  DB_ROSTER: D1Database;
};

// Start a Hono app
const app = new Hono<{ Bindings: Bindings }>();

const allowedOrigins = new Set([
  "https://projectborealis.com",
  "https://admin.projectborealis.com",
  "https://dev.projectborealis.com",
  "http://localhost:4321",
  "http://127.0.0.1:4321",
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
    maxAge: 600,
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
  "/api/public/*",
  bearerAuth({
    verifyToken: async (token, c) => {
      return authenticate(token, c.env.API_PUBLIC_TOKEN);
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
openapi.post("/api/admin/users", MemberCreate);

// Export the Hono app
export default app;
