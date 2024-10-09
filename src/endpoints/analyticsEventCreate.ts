import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Event } from "../types";
import { authenticate } from "../utils"; // Importing authentication utility

export class EventCreate extends OpenAPIRoute {
  schema = {
    tags: ["Analytics"],
    summary: "Create a new Event",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Event,
          },
        },
      },
    },
    security: [
      {
        GameBearerAuth: [],
      },
    ],
    responses: {
      "200": {
        description: "Returns the created member",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  event: Event,
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c) {
    const db = c.env.DB_ROSTER;

    // Retrieve the HMAC from headers
    const hmacHeader = c.req.header("X-HMAC-Signature");
    const secretKey = c.env.SECRET_KEY; // Assuming the secret key is stored in the environment

    // Validate HMAC
    if (!authenticate(hmacHeader, secretKey)) {
      return c.json({ success: false, error: "Invalid HMAC signature" }, 401);
    }

    // Get validated data
    const data = await this.getValidatedData<typeof this.schema>();

    // Retrieve the validated request body
    const eventToCreate = data.body;

    // Check if 'gameEvents' table exists
    const tableCheck = await db
      .prepare(
        `SELECT name from sqlite_master WHERE type='table' and name='gameEvents';`
      )
      .first();

    if (!tableCheck) {
      await db
        .prepare(
          `CREATE TABLE gameEvents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        user_id TEXT,
        build_info TEXT,
        event_name TEXT,
        attributes TEXT
        );`
        )
        .run();
    }

    // Object insertion
    for (const event of eventToCreate.events) {
      await db
        .prepare(
          `INSERT INTO gameEvents (session_id, user_id, build_info, event_name, attributes)
          VALUES(?, ?, ?, ?, ?);`
        )
        .bind(
          eventToCreate.sessionId,
          eventToCreate.userId,
          eventToCreate.buildInfo,
          event.eventName,
          JSON.stringify(event.attributes || [])
        )
        .run();
    }

    // return the new member
    return c.json({
      success: true,
      event: {},
    });
  }
}
