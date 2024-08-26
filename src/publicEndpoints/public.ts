import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { z } from "zod";

export async function getTransmissionRuntime(c: Context) {
  return {
    success: true,
    result: {
      runtime: (await c.env.TRANSMISSION.get("runtime"))?.split(",") ?? [],
      mode: (await c.env.TRANSMISSION.get("mode")) ?? "TWN",
    },
  };
}

export class TransmissionRuntime extends OpenAPIRoute {
  schema = {
    tags: ["Transmission"],
    summary: "List script runtime",
    security: [
      {
        PublicBearerAuth: [],
      },
    ],
    responses: {
      "200": {
        description: "Returns a list of transmission runtime",
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

export class TransmissionButtons extends OpenAPIRoute {
  schema = {
    tags: ["Transmission"],
    summary: "Process buttons for transmission",
    security: [
      {
        PublicBearerAuth: [],
      },
    ],
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              buttons: z.string().array(),
            }),
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Returns a button result",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  runtime: z.string(),
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    const data = await this.getValidatedData<typeof this.schema>();
    const buttonCombos = await c.env.TRANSMISSION.get("buttons", {
      type: "json",
    });
    if (!buttonCombos) {
      return {
        success: false,
        result: {
          runtime: null,
        },
      };
    }
    const buttons = data.body.buttons?.join("+") ?? "";
    const comboResponse = buttonCombos[buttons];
    if (comboResponse) {
      return {
        success: true,
        result: {
          runtime: comboResponse,
        },
      };
    }
    return {
      success: false,
      result: {
        runtime: null,
      },
    };
  }
}
