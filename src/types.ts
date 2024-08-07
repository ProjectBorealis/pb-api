import { Arr, Email, Str } from "chanfana";
import { z } from "zod";

export const Member = z.object({
  // info
  nickname: Str(),
  credits_name: Str().nullish(),
  legal_name: Str().nullish(),
  timezone: Str().nullish(),
  // team info
  member_status: Str(),
  title: Str().nullish(),
  teams: Arr(Str()),
  // accounts
  github: Str().nullish(),
  discord: Str(),
  google: Email().nullish(),
  reddit: Str().nullish(),
  email: Email().nullish(),
  steamworks: Email().nullish(),
  steamid: Str().nullish(),
  // documents
  va: z.coerce.boolean().nullish().default(false),
  nda: z.coerce.boolean().nullish().default(false),
  cla: z.coerce.boolean().nullish().default(false),
  scenefusion: z.coerce.boolean().nullish().default(false),
  // join/end
  join_date: z.string().date(),
  end_date: z.string().date().nullish(),
  end_reason: Str().nullish(),
});

export type MemberType = z.infer<typeof Member>;

export type MemberTypeDb = Omit<MemberType, "teams"> & { member_id: number } & {
  team_name: string;
};

export const ADMIN_TEAMS = [
  "Directors",
  "Production",
  "Team Leads",
  "Managers",
];
export const GAME_CREATIVE_TEAMS = [
  "3D Art",
  "Animation",
  "Texture Art",
  "VFX",
  "Music Composers",
  "Design",
  "Game Design",
  "Sound Design",
];
export const CONTENT_TEAMS = [
  "Public Relations",
  "Concept Art",
  "Voice Acting",
  "Writing",
  "Graphic Design",
];
export const GAME_PROGRAMMING_TEAMS = ["Programming", "DevOps"];

export const GAME_TEAMS = GAME_CREATIVE_TEAMS.concat(
  CONTENT_TEAMS,
  GAME_PROGRAMMING_TEAMS
);

export const WEB_TEAMS = ["Public Relations", "IT", "DevOps"];

export const constructTeamChecker = (teams: Array<string>) => {
  return (user_teams: Set<string>) => {
    return (
      teams.some((team) => user_teams.has(team)) ||
      ADMIN_TEAMS.some((team) => user_teams.has(team))
    );
  };
};

export const isAdmin = (teams: Set<string>) => {
  return ADMIN_TEAMS.some((team) => teams.has(team));
};
