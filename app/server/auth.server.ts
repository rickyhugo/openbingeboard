import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";

type AuthEnv = Env & {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
};

const authEnv = env as AuthEnv;
const baseURL =
  authEnv.BETTER_AUTH_URL ?? "https://openbingeboard.hugoplanet.se";

export const auth = betterAuth({
  database: new D1Dialect({ database: authEnv.DB }),
  secret: authEnv.BETTER_AUTH_SECRET,
  baseURL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  trustedOrigins: Array.from(new Set([baseURL, "http://localhost:5173"])),
});
