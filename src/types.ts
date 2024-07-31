import { Arr, Email, Str } from "chanfana";
import { z } from "zod";

export const Member = z.object({
  // info
  nickname: Str(),
  credits_name: Str().nullish(),
  legal_name: Str().nullish(),
  timezone: Str().nullish(),
  member_status: Str(),
  // team info
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
