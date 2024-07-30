import { Bool, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { Member } from "../types";

export class MemberCreate extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Create a new Member",
    request: {
      body: {
        content: {
          "application/json": {
            schema: Member,
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
        description: "Returns the created member",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  member: Member,
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c) {
    // Get validated data
    const data = await this.getValidatedData<typeof this.schema>();

    // Retrieve the validated request body
    const memberToCreate = data.body;

    // Object insertion

    // return the new member
    return {
      success: true,
      member: {},
    };
  }
}
