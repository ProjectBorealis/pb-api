import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Event } from "../types";

export class EventList extends OpenAPIRoute {
  schema = {
    tags: ["Analytics"],
    summary: "List Events",
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
        AdminBearerAuth: [],
      },
    ],
    responses: {
      "200": {
        description: "Returns all events",
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

    // Query all events from the database
    const events = await db.prepare(
        `SELECT session_id, user_id, build_info, event_name, attributes FROM events`
    ).all();

    // return the new member
    return {
      success: true,
      result: {
        events: events.results.map(event => ({
            sessionId: event.session_id,
            userId: event.user_id,
            buildInfo: event.build_info,
            eventName: event.event_name,
            attributes: JSON.parse(event.attributes)
        }))
      }
    };
  }
}
