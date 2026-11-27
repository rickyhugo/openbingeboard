import { Link, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  Film01Icon,
  Grid02Icon,
  InformationCircleIcon,
  PlayCircleIcon,
  Settings02Icon,
  SparklesIcon,
  Tv01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { AuthActions } from "~/components/auth-actions";
import { Brand } from "~/components/brand";
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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { useProfile } from "~/components/profile-provider";
import type { ProviderRow } from "~/server/queries.server";

const navLink =
  "data-active:bg-primary/10 data-active:font-semibold data-active:text-primary";

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
      <SidebarHeader className="px-4 pt-5 pb-2">
        <Brand />
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          What to watch, sorted.
        </p>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="eyebrow h-6 px-2">
            Region
          </SidebarGroupLabel>
          <div className="rounded-lg border border-sidebar-border bg-card/50 p-2">
            <CountrySelect />
          </div>
        </SidebarGroup>

        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="eyebrow h-6 px-2">
            Catalogue
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={
                    pathname === "/" && kind !== "movie" && kind !== "series"
                  }
                  render={<Link to="/" />}
                >
                  <HugeiconsIcon icon={Grid02Icon} strokeWidth={2} />
                  All titles
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={pathname === "/" && kind === "movie"}
                  render={<Link to="/?kind=movie" />}
                >
                  <HugeiconsIcon icon={Film01Icon} strokeWidth={2} />
                  Films
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={pathname === "/" && kind === "series"}
                  render={<Link to="/?kind=series" />}
                >
                  <HugeiconsIcon icon={Tv01Icon} strokeWidth={2} />
                  Series
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={pathname === "/ask"}
                  render={<Link to="/ask" />}
                >
                  <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} />
                  Ask
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="eyebrow h-6 px-2">
            Your library
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={pathname === "/library/watched"}
                  render={<Link to="/library/watched" />}
                >
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
                  Watched
                  <SidebarMenuBadge>{state.watched.length}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  isActive={pathname === "/library/want"}
                  render={<Link to="/library/want" />}
                >
                  <HugeiconsIcon icon={Bookmark02Icon} strokeWidth={2} />
                  Want to watch
                  <SidebarMenuBadge>{state.want.length}</SidebarMenuBadge>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="eyebrow h-6 px-2">
            Your services
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-1 px-2">
                {selectedServices.slice(0, 4).map((provider) => (
                  <Link
                    key={provider.id}
                    to={"/?providers=" + provider.id}
                    className="rounded-full border border-sidebar-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                  >
                    {provider.name}
                  </Link>
                ))}
                {selectedServices.length > 4 ? (
                  <span className="rounded-full border border-sidebar-border px-2 py-1 text-[10px] text-muted-foreground">
                    +{selectedServices.length - 4}
                  </span>
                ) : null}
              </div>
            ) : null}
            <SidebarMenu className="gap-0.5">
              {selectedServices.length > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={navLink}
                    render={<Link to={servicesQuery} />}
                  >
                    <HugeiconsIcon icon={PlayCircleIcon} strokeWidth={2} />
                    Browse my services
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton
                  className={navLink}
                  render={<Link to="/services" />}
                >
                  <HugeiconsIcon icon={Settings02Icon} strokeWidth={2} />
                  {selectedServices.length > 0
                    ? "Manage services"
                    : "Choose services"}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="p-2">
          <SidebarGroupLabel className="eyebrow h-6 px-2">
            Saved views
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {state.saved.length > 0 ? (
              <SidebarMenu className="gap-0.5">
                {state.saved.slice(0, 4).map((filter) => (
                  <SidebarMenuItem key={filter.id}>
                    <SidebarMenuButton
                      className={navLink}
                      render={<Link to={"/" + filter.query} />}
                    >
                      <span className="truncate">{filter.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={navLink}
                    render={<Link to="/profile#saved" />}
                  >
                    Manage views
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <p className="px-2 py-1.5 text-[11px] leading-5 text-muted-foreground">
                Save views from the catalogue filters.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              className={navLink}
              isActive={pathname === "/profile"}
              render={<Link to="/profile" />}
            >
              <HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} />
              My profile
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              className={navLink}
              isActive={pathname === "/about"}
              render={<Link to="/about" />}
            >
              <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} />
              About
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <AuthActions compact />
        <div className="flex items-center justify-between gap-2 px-2 pt-1">
          <span className="eyebrow">Theme</span>
          <ThemeToggle initial={theme} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
