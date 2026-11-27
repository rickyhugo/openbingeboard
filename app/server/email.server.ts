import { env } from "cloudflare:workers";

interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

type EmailEnv = Env & {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
};

const emailEnv = env as EmailEnv;
const from =
  emailEnv.EMAIL_FROM ?? "OpenBingeBoard <noreply@openbingeboard.com>";

export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!emailEnv.RESEND_API_KEY) {
    console.log(
      "[email:dev]",
      message.to,
      message.subject,
      message.text ?? message.html,
    );
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + emailEnv.RESEND_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  });

  if (!response.ok) {
    throw new Error("Email send failed: " + response.status);
  }
}
