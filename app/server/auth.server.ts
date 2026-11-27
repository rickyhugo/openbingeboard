import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { D1Dialect } from "kysely-d1";
import { sendEmail } from "~/server/email.server";

type AuthEnv = Env & {
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  RESEND_API_KEY?: string;
  EMAIL_DEV?: string;
};

const authEnv = env as AuthEnv;
const baseURL =
  authEnv.BETTER_AUTH_URL ?? "https://openbingeboard.hugoplanet.se";

export const emailEnabled =
  Boolean(authEnv.RESEND_API_KEY) || authEnv.EMAIL_DEV === "1";
export const emailVerificationRequired = emailEnabled;

export const auth = betterAuth({
  database: new D1Dialect({ database: authEnv.DB }),
  secret: authEnv.BETTER_AUTH_SECRET,
  baseURL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: emailVerificationRequired,
    sendResetPassword: async ({ user, url }) => {
      const link = url.replace(/&/g, "&amp;");
      await sendEmail({
        to: user.email,
        subject: "Reset your OpenBingeBoard password",
        text: "Reset your password: " + url,
        html:
          "<p>Reset your OpenBingeBoard password.</p>" +
          '<p><a href="' +
          link +
          '">Choose a new password</a></p>' +
          "<p>If you did not request this, ignore this email.</p>",
      });
    },
  },
  emailVerification: {
    sendOnSignUp: emailVerificationRequired,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const link = url.replace(/&/g, "&amp;");
      await sendEmail({
        to: user.email,
        subject: "Verify your OpenBingeBoard email",
        text: "Verify your email: " + url,
        html:
          "<p>Confirm your email for OpenBingeBoard.</p>" +
          '<p><a href="' +
          link +
          '">Verify email</a></p>',
      });
    },
  },
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["cf-connecting-ip"],
    },
  },
  trustedOrigins: Array.from(new Set([baseURL, "http://localhost:5173"])),
});
