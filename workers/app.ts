import { createRequestHandler } from "react-router";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE,
);

const CANONICAL_HOST = "openbingeboard.com";

/** Send www and plain HTTP to the canonical HTTPS origin. */
function canonicalRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const isProductionHost =
    url.hostname === CANONICAL_HOST || url.hostname === `www.${CANONICAL_HOST}`;

  if (!isProductionHost) return null;
  if (url.protocol === "https:" && url.hostname === CANONICAL_HOST) return null;

  url.protocol = "https:";
  url.hostname = CANONICAL_HOST;
  return Response.redirect(url.toString(), 308);
}

export default {
  async fetch(request) {
    return canonicalRedirect(request) ?? requestHandler(request);
  },
} satisfies ExportedHandler<Env>;
