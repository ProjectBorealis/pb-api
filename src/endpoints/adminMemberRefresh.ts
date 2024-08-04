import { Bool, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import {
  constructTeamChecker,
  GAME_PROGRAMMING_TEAMS,
  isAdmin,
  MemberType,
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

    const members = member_list["result"]["members"] as Array<MemberType>;
    const github_ids = [];
    const github_admins = new Set();
    const github_team = new Set();

    const by_github = {};

    const github_to_node = {};

    const github_usernames = {};

    const GITHUB_REST_API_HEADERS = {
      Authorization: `Bearer ${c.env.API_GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Project Borealis API",
    };

    const githubMemberStatus = new Set(["Active"]);

    // Collect info about our members
    async function handleMembers(member: MemberType) {
      const github = member.github;
      if (github && !github.startsWith("/") && !Number.isNaN(Number(github))) {
        // We go through all github IDs...
        github_ids.push(github);
        // and filter by the active people
        if (githubMemberStatus.has(member.member_status)) {
          github_team.add(github);
        }
        // Just an easy lookup for the member info
        by_github[github] = member;
        // Add some lookups from GitHub user info, like username and node ID
        const user_resp = await fetch(`https://api.github.com/user/${github}`, {
          headers: GITHUB_REST_API_HEADERS,
        }).then((resp) => resp.json());
        results.push(user_resp);
        github_to_node[github] = user_resp["node_id"];
        github_usernames[github] = user_resp["login"];
        // Check if GitHub admin.
        const team_set = new Set(member.teams) as Set<string>;
        if (isAdmin(team_set)) {
          github_admins.add(github);
        }
      }
    }

    const memberJobs = [];
    for (const member of members) {
      memberJobs.push(handleMembers(member));
    }
    await Promise.all(memberJobs);

    // The private repos and their permissions
    const repos = {
      pb: () => true,
      "pb-public-site": constructTeamChecker(WEB_TEAMS),
      UnrealEngine: constructTeamChecker(GAME_PROGRAMMING_TEAMS),
      RestrictedPlugins: constructTeamChecker(GAME_PROGRAMMING_TEAMS),
      "icebreaker-industries-site": constructTeamChecker(WEB_TEAMS),
      applications: isAdmin,
    };

    const repoSets = {} as Record<string, Record<string, string>>;

    async function handleRepo(repo) {
      repoSets[repo] = {};
      // TODO: pagination
      const repoMembers = (await fetch(
        `https://api.github.com/repos/ProjectBorealisTeam/${repo}/collaborators?per_page=100`
      ).then((resp) => resp.json())) as Array<any>;
      for (const member of repoMembers) {
        const github = member["id"].toString();
        repoSets[repo][github] = member["role_name"];
      }
    }

    const repoJobs = [];
    // Collect collaborators on the private repos, so we can check against expected perms below
    for (const repo of Object.keys(repos)) {
      repoJobs.push(handleRepo(repo));
    }
    await Promise.all(repoJobs);

    // TODO: handle cancelling invites
    /*
    const invitationsResponse = (await fetch(
      `https://api.github.com/orgs/ProjectBorealis/invitations`,
      {
        headers: GITHUB_REST_API_HEADERS,
      }
    ).then((resp) => resp.json())) as Array<any>;
    */

    const orgMembersResponse = (await fetch(
      `https://api.github.com/orgs/ProjectBorealis/members`,
      {
        headers: GITHUB_REST_API_HEADERS,
      }
    ).then((resp) => resp.json())) as Array<any>;

    const on_github_team = new Set();

    for (const member of orgMembersResponse) {
      const github = member["id"].toString();
      on_github_team.add(github);
    }

    async function handleGithubMember(github) {
      const member = by_github[github];
      const username = github_usernames[github];
      const team_set = new Set(member.teams) as Set<string>;
      // First, let's handle the private repos.
      for (const [repo, perm] of Object.entries(repos)) {
        // If not in team, either because they're not a member at all, or they don't have perms...
        if (!github_team.has(github) || !perm(team_set)) {
          // Check to see if they DO have perms we need to remove
          if (repoSets[repo][github]) {
            const collab_resp = await fetch(
              `https://api.github.com/repos/ProjectBorealisTeam/${repo}/collaborators/${username}`,
              {
                method: "DELETE",
                headers: GITHUB_REST_API_HEADERS,
              }
            ).then((resp) => resp.text());
            if (collab_resp) {
              results.push(JSON.parse(collab_resp));
            }
          }
          return;
        }
        const permission = github_admins.has(github) ? "admin" : "write";
        // Check if we need to add/update perms
        if (permission !== repoSets[repo][github]) {
          const collab_resp = await fetch(
            `https://api.github.com/repos/ProjectBorealisTeam/${repo}/collaborators/${username}`,
            {
              method: "PUT",
              headers: GITHUB_REST_API_HEADERS,
              body: JSON.stringify({
                permission,
              }),
            }
          ).then((resp) => resp.text());
          if (collab_resp) {
            results.push(JSON.parse(collab_resp));
          }
        }
      }
      // Now, let's handle team membership.
      // If we're supposed to be on the GitHub team, let's check if we are.
      if (github_team.has(github)) {
        // TODO: handle team changes (including for invitations)
        // Just check if we're on the team for now. This will work for moving new people into the org, but
        // we will have to query each team's membership to check if people are on the right team.
        if (!on_github_team.has(github)) {
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
        // If we're on the GitHub team, we have nothing to do until we handle team movement.
      } else if (on_github_team.has(github)) {
        // TODO: handle cancelling invites
        // If we're not supposed to be on the team, but we are in the org, then remove.
        // This will also remove all team memberships, because outsiders cannot be on a team.
        const membership_resp = await fetch(
          `https://api.github.com/orgs/ProjectBorealis/members/${username}`,
          {
            method: "DELETE",
            headers: GITHUB_REST_API_HEADERS,
          }
        ).then((resp) => resp.text());
        if (membership_resp) {
          results.push(JSON.parse(membership_resp));
        }
      }
    }

    const githubMemberJobs = [];
    for (const github of github_ids) {
      githubMemberJobs.push(handleGithubMember(github));
    }
    await Promise.all(githubMemberJobs);

    // Build graphQL for collaborators
    function buildCollaborators(
      githubIds: Array<string>,
      adminOnly: boolean
    ): string {
      let collaborators = "[";
      let isFirst = true;
      for (const github of githubIds) {
        if (isFirst) {
          isFirst = false;
        } else {
          collaborators += ",";
        }
        collaborators += "{";
        let role = "NONE";
        if (github_team.has(github)) {
          if (github_admins.has(github)) {
            role = "ADMIN";
          } else if (!adminOnly) {
            role = "WRITER";
          }
        }
        collaborators += `role: ${role} `;
        const nodeId = github_to_node[github];
        collaborators += `userId: \"${nodeId}\"`;
        collaborators += "}";
      }
      collaborators += "]";
      return collaborators;
    }

    async function handleProjectsV2(projectId: string, collaborators: string) {
      const query = JSON.stringify({
        query: `
        mutation {
          updateProjectV2Collaborators(input: {
            collaborators: ${collaborators}
            projectId: \"${projectId}\"
          }) {
            collaborators {
              totalCount
            }
          }
        }
      `,
      });

      const projectResp = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `token ${c.env.API_GITHUB_TOKEN}`,
          "User-Agent": "Project Borealis API",
        },
        body: query,
      }).then((resp) => resp.json());
      results.push(projectResp);
    }

    const gameCollaborators = buildCollaborators(github_ids, false);
    await handleProjectsV2(c.env.API_GAME_PROJECT, gameCollaborators);

    const applicationsCollaborators = buildCollaborators(github_ids, true);
    await handleProjectsV2(
      c.env.API_APPLICATIONS_PROJECT,
      applicationsCollaborators
    );

    return {
      success,
      result: { responses: results },
    };
  }
}
