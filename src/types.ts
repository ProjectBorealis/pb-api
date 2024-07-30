import { Arr, Email, Str } from "chanfana";
import { z } from "zod";

export const Member = z.object({
  // info
  nickname: Str(),
  credits_name: Str({ required: false }).nullable(),
  legal_name: Str({ required: false }).nullable(),
  timezone: Str({ required: false }).nullable(),
  member_status: Str(),
  // team info
  teams: Arr(Str()),
  // accounts
  github: Str(),
  discord: Str(),
  google: Email(),
  reddit: Str({ required: false }).nullable(),
  email: Email(),
  steamworks: Email(),
  steamid: Str(),
  // documents
  va: z.coerce.boolean().nullish().default(false),
  nda: z.coerce.boolean().nullish().default(false),
  cla: z.coerce.boolean().nullish().default(false),
  scenefusion: z.coerce.boolean().nullish().default(false),
  // join/end
  join_date: z.string().date(),
  end_date: z.string().date().nullish(),
  end_reason: Str({ required: false }).nullable(),
});

export type MemberType = z.infer<typeof Member>;

export type MemberTypeDb = Omit<MemberType, "teams"> & { member_id: number } & {
  team_name: string;
};
