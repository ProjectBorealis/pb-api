import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { getIp, randomSelectForUser } from "utils";
import { z } from "zod";

let runtime = null;
let mode = null;

export async function getTransmissionRuntime(c: Context) {
  if (runtime === null) {
    runtime =
      (
        await c.env.TRANSMISSION.get("runtime", {
          cacheTtl: 39600,
        })
      )?.split(",") ?? [];
  }
  if (mode === null) {
    mode =
      (await c.env.TRANSMISSION.get("mode", {
        cacheTtl: 39600,
      })) ?? "TWN";
  }
  return {
    success: true,
    result: {
      runtime,
      mode,
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

let buttonCombos: Record<string, string[]> | null = null;

const buttonReject = {
  success: false,
  result: {
    runtime: null,
  },
};

const validButtons = new Set([
  "button-1",
  "button-left",
  "button-right",
  "button-2",
]);

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
    const buttonsList = data.body.buttons;
    if (!buttonsList || buttonsList.length < 2 || buttonsList.length > 11) {
      return buttonReject;
    }
    for (const button of buttonsList) {
      if (!validButtons.has(button)) {
        return buttonReject;
      }
    }
    const buttons = data.body.buttons.join("+");
    if (buttonCombos === null) {
      buttonCombos = await c.env.TRANSMISSION.get("buttons", {
        cacheTtl: 39600,
        type: "json",
      });
    }
    if (!buttonCombos) {
      return buttonReject;
    }
    const comboResponse = buttonCombos[buttons];
    if (comboResponse && comboResponse.length > 0) {
      let runtime = comboResponse[0];
      const len = comboResponse.length;
      if (len > 1) {
        runtime = comboResponse[randomSelectForUser(getIp(c.req), len)];
      }
      return {
        success: true,
        result: {
          runtime,
        },
      };
    }
    return buttonReject;
  }
}
