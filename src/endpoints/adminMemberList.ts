import { Bool, Num, OpenAPIRoute } from "chanfana";
import { Context } from "hono";
import { Member, MemberType, MemberTypeDb } from "types";
import { z } from "zod";

async function findAllMembers(db: D1Database): Promise<MemberTypeDb[]> {
  const query = `
    SELECT roster.*, teams.team_name
    FROM roster
    INNER JOIN team_roster ON roster.member_id = team_roster.member_id
    INNER JOIN teams ON team_roster.team_id = teams.team_id
    ;
  `;
  const { results } = await db.prepare(query).all();
  const members = results as unknown as MemberTypeDb[];
  return members;
}

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
    security: [
      {
        AdminBearerAuth: [],
      },
    ],
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

  async handle(c: Context) {
    // Get validated data
    const data = await this.getValidatedData<typeof this.schema>();

    // Retrieve the validated parameters
    const { page } = data.query;

    if (page >= 1) {
      return {
        success: false,
        members: [],
      };
    }

    const allMembers = await findAllMembers(c.env.DB_ROSTER);
    const members: Record<number, MemberType> = {};
    for (const member of allMembers) {
      const curMember = members[member.member_id];
      if (!curMember) {
        const { team_name, ...baseMember } = member;
        const newMember = { ...baseMember, teams: [team_name] };
        members[member.member_id] = Member.parse(newMember);
      } else {
        curMember.teams.push(member.team_name);
      }
    }

    return {
      success: true,
      members: Object.values(members),
    };
  }
}
