import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import {
  constructTeamChecker,
  GAME_PROGRAMMING_TEAMS,
  isAdmin,
  WEB_TEAMS,
} from "types";
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
                result: z.object({
                  responses: z.array(z.object({})).nullish(),
                }),
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

    let success = true;
    const results = [];

    const members = member_list["result"]["members"];
    const github_ids = [];
    const github_admins = new Set();

    const by_github = {};

    const github_to_node = {};

    const github_usernames = {};

    const GITHUB_REST_API_HEADERS = {
      Authorization: `Bearer ${c.env.API_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Project Borealis API",
    };

    for (const member of members) {
      if (member.member_status === "Active") {
        const github = member.github;
        if (
          github &&
          !github.startsWith("/") &&
          !Number.isNaN(Number(github))
        ) {
          github_ids.push(github);
          by_github[github] = member;
          const team_set = new Set(member.teams) as Set<string>;
          const user_resp = await fetch(
            `https://api.github.com/user/${github}`,
            {
              headers: GITHUB_REST_API_HEADERS,
            }
          ).then((resp) => resp.json());
          github_to_node[github] = user_resp["node_id"];
          results.push(user_resp);
          const username = user_resp["login"];
          github_usernames[github] = username;
          if (isAdmin(team_set)) {
            github_admins.add(github);
          }
        }
      }
    }

    const repos = {
      pb: () => true,
      "pb-public-site": constructTeamChecker(WEB_TEAMS),
      UnrealEngine: constructTeamChecker(GAME_PROGRAMMING_TEAMS),
      RestrictedPlugins: constructTeamChecker(GAME_PROGRAMMING_TEAMS),
      "icebreaker-industries-site": constructTeamChecker(WEB_TEAMS),
      applications: isAdmin,
    };

    for (const github of github_ids) {
      const member = by_github[github];
      const username = github_usernames[github];
      const team_set = new Set(member.teams) as Set<string>;
      for (const [repo, perm] of Object.entries(repos)) {
        if (!perm(team_set)) {
          continue;
        }
        const collab_resp = await fetch(
          `https://api.github.com/repos/ProjectBorealisTeam/${repo}/collaborators/${username}`,
          {
            method: "PUT",
            headers: GITHUB_REST_API_HEADERS,
            body: JSON.stringify({
              permission: github_admins.has(github) ? "admin" : "write",
            }),
          }
        ).then((resp) => resp.text());
        if (collab_resp) {
          results.push(JSON.parse(collab_resp));
        }
      }
      for (const team of member.teams) {
        const slug = team.toLowerCase().replace(" ", "-");
        const team_resp = await fetch(
          `https://api.github.com/orgs/ProjectBorealis/teams/${slug}/memberships/${username}`,
          {
            method: "PUT",
            headers: GITHUB_REST_API_HEADERS,
            body: JSON.stringify({
              role: github_admins.has(github) ? "maintainer" : "member",
            }),
          }
        ).then((resp) => resp.text());
        if (team_resp) {
          results.push(JSON.parse(team_resp));
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
      const nodeId = github_to_node[github];
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

    const gameProjectResp = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `token ${c.env.API_GITHUB_TOKEN}`,
        "User-Agent": "Project Borealis API",
      },
      body: query,
    }).then((resp) => resp.json());
    results.push(gameProjectResp);

    return {
      success: true,
      result: { responses: results },
    };
  }
}
