import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("profile", "routes/profile.tsx"),
  route("title/:id", "routes/title.tsx"),
  route("api/titles", "routes/api.titles.ts"),
] satisfies RouteConfig;
