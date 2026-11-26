import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("title/:id", "routes/title.tsx"),
] satisfies RouteConfig;
