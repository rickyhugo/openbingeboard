import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("profile", "routes/profile.tsx"),
  route("library/:mode", "routes/library.tsx"),
  route("services", "routes/services.tsx"),
  route("login", "routes/login.tsx"),
  route("reset-password", "routes/reset-password.tsx"),
  route("about", "routes/about.tsx"),
  route("title/:id", "routes/title.tsx"),
  route("api/titles", "routes/api.titles.ts"),
  route("api/search/semantic", "routes/api.search.semantic.ts"),
  route("api/auth/*", "routes/api.auth.ts"),
  route("api/profile", "routes/api.profile.ts"),
] satisfies RouteConfig;
