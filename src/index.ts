import { fromHono } from "chanfana";
import { Context, Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { authenticate } from "utils";
import { TaskCreate } from "./endpoints/taskCreate";
import { TaskDelete } from "./endpoints/taskDelete";
import { TaskFetch } from "./endpoints/taskFetch";
import { TaskList } from "./endpoints/taskList";

// Start a Hono app
const app = new Hono();

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

openapi.registry.registerComponent("securitySchemes", "BearerAuth", {
  type: "http",
  scheme: "bearer",
});

// Register OpenAPI endpoints
openapi.get("/api/admin", TaskList);
openapi.post("/api/tasks", TaskCreate);
openapi.get("/api/tasks/:taskSlug", TaskFetch);
openapi.delete("/api/tasks/:taskSlug", TaskDelete);

// Export the Hono app
export default app;
