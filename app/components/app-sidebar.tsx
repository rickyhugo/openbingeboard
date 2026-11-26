import { Link, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
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
  const { state, hydrated, toggleService, hasService } = useProfile();
  const location = useLocation();
  const pathname = location.pathname;
  const servicesQuery =
    state.services.length > 0 ? "/?providers=" + state.services.join(",") : "/";

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Browse</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/"}
                  render={<Link to="/" />}
                >
                  Catalogue
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/profile"}
                  render={<Link to="/profile" />}
                >
                  My profile
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>My services</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {providers.slice(0, 12).map((provider) => (
                <SidebarMenuItem key={provider.id}>
                  <SidebarMenuButton
                    isActive={hydrated && hasService(provider.id)}
                    onClick={() => toggleService(provider.id)}
                  >
                    <span className="truncate">{provider.name}</span>
                    {hydrated && hasService(provider.id) ? (
                      <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                        ON
                      </span>
                    ) : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarMenu className="mt-1">
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to={servicesQuery} />}>
                  Browse my services
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/profile#services" />}>
                  Configure all services
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
                {state.saved.slice(0, 6).map((filter) => (
                  <SidebarMenuItem key={filter.id}>
                    <SidebarMenuButton
                      render={<Link to={"/" + filter.query} />}
                    >
                      <span className="truncate">{filter.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1.5 text-[11px] text-muted-foreground">
                Save a view from the catalogue filters.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <p className="px-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          {state.watched.length} watched / {state.want.length} to watch
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
