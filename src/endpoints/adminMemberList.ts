import { Bool, Num, OpenAPIRoute } from "chanfana";
import { Member } from "types";
import { z } from "zod";

export class MemberList extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "List Members",
    request: {
      query: z.object({
        page: Num({
          description: "Page number",
          default: 0,
        }),
      }),
    },
    responses: {
      "200": {
        description: "Returns a list of members",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  members: Member.array(),
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

    // Retrieve the validated parameters
    const { page } = data.query;

    return {
      success: true,
      members: [],
    };
  }
}
