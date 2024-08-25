import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export async function getTransmissionRuntime(c: Context) {
  return {
    success: true,
    result: {
      runtime: [],
      mode: "TWN",
    },
  };
}

export class TransmissionRuntime extends OpenAPIRoute {
  schema = {
    tags: ["Transmission"],
    summary: "List script runtime",
    responses: {
      "200": {
        description: "Returns a list of tranmission runtime",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  runtime: z.string().array(),
                  mode: z.string(),
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    return await getTransmissionRuntime(c);
  }
}
