import { Link, useLocation } from "react-router";
import { AuthStatus } from "~/components/auth-status";
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
}: {
  providers: readonly ProviderRow[];
}) {
  const { state, hydrated, toggleService } = useProfile();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const kind = params.get("kind");
  const pathname = location.pathname;
  const servicesQuery =
    state.services.length > 0 ? "/?providers=" + state.services.join(",") : "/";

  const selectedServices = state.services
    .map((id) => providers.find((provider) => provider.id === id))
    .filter((provider): provider is ProviderRow => provider !== undefined);

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
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
              {hydrated && selectedServices.length > 0 ? (
                selectedServices.slice(0, 6).map((provider) => (
                  <SidebarMenuItem key={provider.id}>
                    <div className="flex h-8 items-center gap-1 px-2 text-xs">
                      <Link
                        to={"/?providers=" + provider.id}
                        className="min-w-0 flex-1 truncate hover:text-foreground hover:underline"
                        title={"Browse " + provider.name}
                      >
                        {provider.name}
                      </Link>
                      <button
                        type="button"
                        aria-label={"Remove " + provider.name}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleService(provider.id)}
                      >
                        ×
                      </button>
                    </div>
                  </SidebarMenuItem>
                ))
              ) : (
                <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                  No services selected.
                </p>
              )}
              {selectedServices.length > 6 ? (
                <p className="px-2 py-1 text-[10px] text-muted-foreground">
                  +{selectedServices.length - 6} more
                </p>
              ) : null}
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
      </SidebarFooter>
    </Sidebar>
  );
}
