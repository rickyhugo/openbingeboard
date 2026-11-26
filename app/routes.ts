import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("profile", "routes/profile.tsx"),
  route("login", "routes/login.tsx"),
  route("title/:id", "routes/title.tsx"),
  route("api/titles", "routes/api.titles.ts"),
  route("api/auth/*", "routes/api.auth.ts"),
  route("api/profile", "routes/api.profile.ts"),
] satisfies RouteConfig;
