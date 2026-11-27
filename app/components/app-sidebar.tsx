import { Link, useLocation } from "react-router";
import { AuthStatus } from "~/components/auth-status";
import { CountrySelect } from "~/components/country-select";
import { ThemeToggle } from "~/components/theme-toggle";
import type { Theme } from "~/lib/theme";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useProfile } from "~/components/profile-provider";
import type { ProviderRow } from "~/server/queries.server";

export function AppSidebar({
  providers,
  theme,
}: {
  providers: readonly ProviderRow[];
  theme: Theme;
}) {
  const { state } = useProfile();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const kind = params.get("kind");
  const pathname = location.pathname;

  const selectedServices = state.services
    .map((id) => providers.find((provider) => provider.id === id))
    .filter((provider): provider is ProviderRow => provider !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name));
  const servicesQuery =
    selectedServices.length > 0
      ? "/?providers=" +
        selectedServices.map((provider) => provider.id).join(",")
      : "/";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Country</SidebarGroupLabel>
          <div className="px-2 py-1">
            <CountrySelect />
          </div>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Catalogue</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={
                    pathname === "/" && kind !== "movie" && kind !== "series"
                  }
                  render={<Link to="/" />}
                >
                  All titles
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/" && kind === "movie"}
                  render={<Link to="/?kind=movie" />}
                >
                  Films
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/" && kind === "series"}
                  render={<Link to="/?kind=series" />}
                >
                  Series
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Your library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/library/watched"}
                  render={<Link to="/library/watched" />}
                >
                  Watched
                  <SidebarMenuBadge>{state.watched.length}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/library/want"}
                  render={<Link to="/library/want" />}
                >
                  Want to watch
                  <SidebarMenuBadge>{state.want.length}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Your services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {selectedServices.length > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link to={servicesQuery} />}>
                    Browse my services
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/services" />}>
                  {selectedServices.length > 0
                    ? "Manage services"
                    : "Choose services"}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Saved views</SidebarGroupLabel>
          <SidebarGroupContent>
            {state.saved.length > 0 ? (
              <SidebarMenu>
                {state.saved.slice(0, 5).map((filter) => (
                  <SidebarMenuItem key={filter.id}>
                    <SidebarMenuButton
                      render={<Link to={"/" + filter.query} />}
                    >
                      <span className="truncate">{filter.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link to="/profile#saved" />}>
                    Manage views
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Save views from the catalogue filters.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/profile"}
              render={<Link to="/profile" />}
            >
              My profile
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={pathname === "/about"}
              render={<Link to="/about" />}
            >
              About
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <AuthStatus />
        <div className="flex items-center justify-between gap-2 border-t px-2 pt-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            Theme
          </span>
          <ThemeToggle initial={theme} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
