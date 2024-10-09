import { OpenAPIRoute } from "chanfana";
import { z } from "zod";

export class AnalyticsResultsDownload extends OpenAPIRoute {
  schema = {
    tags: ["Analytics"],
    summary: "Download analytics results",
    security: [
      {
        AdminBearerAuth: [],
      },
    ],
    query: z.object({
        sessionId: z.string().optional(),
        userId: z.string().optional(),
        eventName: z.string().optional(),
      }),
      responses: {
        "200": {
          description: "Returns analytics data in JSON format",
          content: {
            "application/json": {
              schema: z.array(
                z.object({
                  id: z.number(),
                  session_id: z.string(),
                  user_id: z.string(),
                  build_info: z.string(),
                  event_name: z.string(),
                  attributes: z.string(),
                })
              ),
            },
          },
        },
      },
    };
  
    async handle(c) {
      const db = c.env.DB_ROSTER;
  
      // Get query parameters and validate against schema
      const query = z.object({
        sessionId: z.string().optional(),
        userId: z.string().optional(),
        eventName: z.string().optional(),
      }).parse(c.req.query());
  
      // Build the base SQL query
      let sql = "SELECT * FROM gameEvents WHERE 1=1";
      const params: Array<string | undefined> = [];
  
      // Add optional filters if they are present in the query
      if (query.sessionId) {
        sql += " AND session_id = ?";
        params.push(query.sessionId);
      }
  
      if (query.userId) {
        sql += " AND user_id = ?";
        params.push(query.userId);
      }
  
      if (query.eventName) {
        sql += " AND event_name = ?";
        params.push(query.eventName);
      }
  
      const results = await db.prepare(sql).bind(...params).all();
  
      // Return the results as JSON
      return {
        success: true,
        results: results.results || [],
      };
    }
  }