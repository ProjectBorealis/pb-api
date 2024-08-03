import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { isAdmin } from "types";
import { z } from "zod";

export class MemberRefresh extends OpenAPIRoute {
  schema = {
    tags: ["Members"],
    summary: "Refresh Members",
    security: [
      {
        AdminBearerAuth: [],
      },
    ],
    responses: {
      "200": {
        description: "Returns true on refresh success",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({}),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: Context) {
    const member_list = await fetch(`${c.env.API_URL}/api/admin/users`, {
      headers: {
        Authorization: `Bearer ${c.env.API_ADMIN_TOKEN}`,
      },
    }).then((res) => res.json());

    if (!member_list["success"]) {
      return {
        success: false,
        result: {},
      };
    }

    const members = member_list["result"]["members"];
    const github_ids = [];
    const github_admins = new Set();

    for (const member of members) {
      if (member.member_status === "Active") {
        const github = member.github;
        if (
          github &&
          !github.startsWith("/") &&
          !Number.isNaN(Number(github))
        ) {
          github_ids.push(github);
          const team_set = new Set(member.teams) as Set<string>;
          if (isAdmin(team_set)) {
            github_admins.add(github);
          }
        }
      }
    }

    let collaborators = "[";
    let isFirst = true;
    for (const github of github_ids) {
      if (isFirst) {
        isFirst = false;
      } else {
        collaborators += ",";
      }
      collaborators += "{";
      collaborators += `role: ${
        github_admins.has(github) ? "ADMIN" : "WRITER"
      } `;
      const nodeId = btoa(`04:User${github}`);
      collaborators += `userId: \"${nodeId}\"`;
      collaborators += "}";
    }
    collaborators += "]";

    const query = JSON.stringify({
      query: `
        mutation {
          updateProjectV2Collaborators(input: {
            collaborators: ${collaborators}
            projectId: \"${c.env.API_GAME_PROJECT}\"
          }) {
            collaborators {
              totalCount
            }
          }
        }
      `,
    });

    const resp = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `token ${c.env.API_GITHUB_TOKEN}`,
        "User-Agent": "Project Borealis API",
      },
      body: query,
    }).then((resp) => resp.text());

    return {
      success: true,
      result: resp,
    };
  }
}
