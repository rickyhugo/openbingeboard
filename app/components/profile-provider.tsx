import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRevalidator } from "react-router";
import { writeCountryCookie, type CountryCode } from "~/lib/countries";
import {
  EMPTY_PROFILE,
  mergeProfiles,
  parseProfile,
  type ProfileState,
  type ProfileUser,
} from "~/lib/profile";

interface ProfileContextValue {
  state: ProfileState;
  user: ProfileUser | null;
  hydrated: boolean;
  setCountry: (country: CountryCode) => void;
  toggleService: (id: number) => void;
  hasService: (id: number) => boolean;
  toggleWatched: (id: string) => void;
  toggleWant: (id: string) => void;
  isWatched: (id: string) => boolean;
  isWant: (id: string) => boolean;
  saveFilter: (name: string, query: string) => void;
  removeFilter: (id: string) => void;
  reset: () => void;
}

const STORAGE_KEY = "openbingeboard.profile.v1";
const LAST_USER_KEY = "openbingeboard.profile.user";

const ProfileContext = createContext<ProfileContextValue | null>(null);

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function ProfileProvider({
  user,
  country,
  children,
}: {
  user: ProfileUser | null;
  country: CountryCode;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProfileState>(EMPTY_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  const timer = useRef<number | null>(null);
  const revalidator = useRevalidator();
  const countrySynced = useRef(country);

  useEffect(() => {
    setState(parseProfile(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (state.country === country) {
      countrySynced.current = country;
      return;
    }
    if (countrySynced.current === state.country) return;

    countrySynced.current = state.country;
    writeCountryCookie(state.country);
    void revalidator.revalidate();
  }, [hydrated, state.country, country, revalidator]);

  useEffect(() => {
    if (!hydrated || !user) return;
    let cancelled = false;

    fetch("/api/profile")
      .then(async (response) =>
        response.ok ? parseProfile(await response.json()) : null,
      )
      .then((server) => {
        if (cancelled || !server) return;
        const local = parseProfile(window.localStorage.getItem(STORAGE_KEY));
        const firstSync =
          window.localStorage.getItem(LAST_USER_KEY) !== user.id;
        setState(firstSync ? mergeProfiles(server, local) : server);
        window.localStorage.setItem(LAST_USER_KEY, user.id);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hydrated, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (!user) return;

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }).catch(() => {});
    }, 400);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state, hydrated, user?.id]);

  const setCountry = useCallback(
    (next: CountryCode) => {
      countrySynced.current = next;
      setState((current) => ({ ...current, country: next }));
      writeCountryCookie(next);
      void revalidator.revalidate();
    },
    [revalidator],
  );

  const toggleService = useCallback((id: number) => {
    setState((current) => ({
      ...current,
      services: toggleValue(current.services, id),
    }));
  }, []);

  const toggleWatched = useCallback((id: string) => {
    setState((current) => {
      const watched = current.watched.includes(id);
      return {
        ...current,
        watched: watched
          ? current.watched.filter((item) => item !== id)
          : [...current.watched, id],
        want: watched
          ? current.want
          : current.want.filter((item) => item !== id),
      };
    });
  }, []);

  const toggleWant = useCallback((id: string) => {
    setState((current) => {
      const want = current.want.includes(id);
      return {
        ...current,
        want: want
          ? current.want.filter((item) => item !== id)
          : [...current.want, id],
        watched: want
          ? current.watched
          : current.watched.filter((item) => item !== id),
      };
    });
  }, []);

  const saveFilter = useCallback((name: string, query: string) => {
    setState((current) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now());
      return {
        ...current,
        saved: [
          {
            id,
            name: name.trim() || "Untitled view",
            query,
          },
          ...current.saved,
        ].slice(0, 20),
      };
    });
  }, []);

  const removeFilter = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      saved: current.saved.filter((item) => item.id !== id),
    }));
  }, []);

  const reset = useCallback(() => {
    setState((current) => {
      const next = { ...EMPTY_PROFILE, country: current.country };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    window.localStorage.removeItem(LAST_USER_KEY);
  }, []);

  const value = useMemo<ProfileContextValue>(
    () => ({
      state,
      user,
      hydrated,
      setCountry,
      toggleService,
      hasService: (id) => state.services.includes(id),
      toggleWatched,
      toggleWant,
      isWatched: (id) => state.watched.includes(id),
      isWant: (id) => state.want.includes(id),
      saveFilter,
      removeFilter,
      reset,
    }),
    [
      state,
      user,
      hydrated,
      setCountry,
      toggleService,
      toggleWatched,
      toggleWant,
      saveFilter,
      removeFilter,
      reset,
    ],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error("useProfile must be used within ProfileProvider");
  }
  return context;
}
