import { Arr, Bool, DateTime, Email, Str } from "chanfana";
import { z } from "zod";

export const Member = z.object({
  // info
  credits_name: Str().optional(),
  legal_name: Str().optional(),
  timezone: Str().optional(),
  // team info
  teams: Arr(Str()),
  privileges: Arr(Str()),
  // accounts
  github: Str(),
  discord: Str(),
  google: Email(),
  reddit: Str().optional(),
  email: Email(),
  steamworks: Email(),
  steamid: Str(),
  // documents
  va: Bool({ required: false }).default(false),
  nda: Bool({ required: false }).default(false),
  cla: Bool({ required: false }).default(false),
  scenefusion: Bool({ required: false }).default(false),
  // start/end
  start: DateTime(),
  end: DateTime().optional(),
  end_reason: Str({ required: false }),
});
