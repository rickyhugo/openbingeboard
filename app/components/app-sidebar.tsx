import { Link, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark02Icon,
  CheckmarkCircle02Icon,
  Film01Icon,
  GithubIcon,
  Grid02Icon,
  Logout03Icon,
  PlayCircleIcon,
  Settings02Icon,
  SparklesIcon,
  Tv01Icon,
} from "@hugeicons/core-free-icons";
import { Button, buttonVariants } from "~/components/ui/button";
import { authClient } from "~/lib/auth-client";
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

export function AppSidebar({
  providers,
  theme,
}: {
  providers: readonly ProviderRow[];
  theme: Theme;
}) {
  const { state, user, reset } = useProfile();
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

  const authNext = encodeURIComponent(
    pathname === "/" || pathname === "/login"
      ? "/profile"
      : location.pathname + location.search,
  );
  const initial = user
    ? (user.name || user.email || "?").slice(0, 1).toUpperCase()
    : "";

  async function signOut() {
    await authClient.signOut().catch(() => {});
    reset();
    window.location.assign("/");
  }

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="px-4 pt-5 pb-2">
        <Brand />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup className="p-2">
          <SidebarGroupLabel>Region</SidebarGroupLabel>
          <div className=" border border-sidebar-border bg-card/50 p-2">
            <CountrySelect />
          </div>
        </SidebarGroup>

        <SidebarGroup className="p-2">
          <SidebarGroupLabel>Catalogue</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
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
                  isActive={pathname === "/" && kind === "movie"}
                  render={<Link to="/?kind=movie" />}
                >
                  <HugeiconsIcon icon={Film01Icon} strokeWidth={2} />
                  Films
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={pathname === "/" && kind === "series"}
                  render={<Link to="/?kind=series" />}
                >
                  <HugeiconsIcon icon={Tv01Icon} strokeWidth={2} />
                  Series
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
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
          <SidebarGroupLabel>Your library</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              <SidebarMenuItem>
                <SidebarMenuButton
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
          <SidebarGroupLabel>Your services</SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-1 px-2">
                {selectedServices.slice(0, 4).map((provider) => (
                  <Link
                    key={provider.id}
                    to={"/?providers=" + provider.id}
                    className=" border border-sidebar-border bg-card/60 px-2 py-1 text-[10px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                  >
                    {provider.name}
                  </Link>
                ))}
                {selectedServices.length > 4 ? (
                  <span className=" border border-sidebar-border px-2 py-1 text-[10px] text-muted-foreground">
                    +{selectedServices.length - 4}
                  </span>
                ) : null}
              </div>
            ) : null}
            <SidebarMenu className="gap-0.5">
              {selectedServices.length > 0 ? (
                <SidebarMenuItem>
                  <SidebarMenuButton render={<Link to={servicesQuery} />}>
                    <HugeiconsIcon icon={PlayCircleIcon} strokeWidth={2} />
                    Browse my services
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ) : null}
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link to="/services" />}>
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
          <SidebarGroupLabel>Saved views</SidebarGroupLabel>
          <SidebarGroupContent>
            {state.saved.length > 0 ? (
              <SidebarMenu className="gap-0.5">
                {state.saved.slice(0, 4).map((filter) => (
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
              <p className="px-2 py-1.5 text-[11px] leading-5 text-muted-foreground">
                Save views from the catalogue filters.
              </p>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        {user ? (
          <div className="flex items-center gap-1">
            <Link
              to="/profile"
              className="flex min-w-0 flex-1 items-center gap-2 rounded-none p-1.5 text-left transition-colors hover:bg-sidebar-accent"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {initial}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium">
                  {user.name || "My profile"}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
            >
              <HugeiconsIcon icon={Logout03Icon} strokeWidth={2} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 p-1.5">
            <span className="text-xs text-muted-foreground">Guest</span>
            <div className="flex items-center gap-1.5">
              <Link
                to={"/login?mode=signin&next=" + authNext}
                className={buttonVariants({ variant: "outline", size: "xs" })}
              >
                Log in
              </Link>
              <Link
                to={"/login?mode=signup&next=" + authNext}
                className={buttonVariants({ size: "xs" })}
              >
                Sign up
              </Link>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-sidebar-border px-1 pb-0.5 pt-1">
          <Link
            to="/about"
            className="px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <div className="flex items-center">
            <a
              href="https://github.com/rickyhugo/openbingeboard"
              target="_blank"
              rel="noreferrer"
              aria-label="View source on GitHub"
              title="View source on GitHub"
              className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
            >
              <HugeiconsIcon icon={GithubIcon} strokeWidth={2} />
            </a>
            <ThemeToggle initial={theme} />
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
