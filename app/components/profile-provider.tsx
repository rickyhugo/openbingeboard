import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface SavedFilter {
  id: string;
  name: string;
  query: string;
}

export interface ProfileState {
  services: number[];
  watched: string[];
  want: string[];
  saved: SavedFilter[];
}

interface ProfileContextValue {
  state: ProfileState;
  hydrated: boolean;
  toggleService: (id: number) => void;
  hasService: (id: number) => boolean;
  toggleWatched: (id: string) => void;
  toggleWant: (id: string) => void;
  isWatched: (id: string) => boolean;
  isWant: (id: string) => boolean;
  saveFilter: (name: string, query: string) => void;
  removeFilter: (id: string) => void;
}

const STORAGE_KEY = "openbingeboard.profile.v1";

const EMPTY: ProfileState = {
  services: [],
  watched: [],
  want: [],
  saved: [],
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function unique<T>(value: T[]): T[] {
  return [...new Set(value)];
}

function parseState(raw: string | null): ProfileState {
  if (!raw) return EMPTY;
  try {
    const value = JSON.parse(raw) as Partial<ProfileState>;
    return {
      services: Array.isArray(value.services)
        ? unique(value.services.filter((id) => Number.isInteger(id)))
        : [],
      watched: Array.isArray(value.watched)
        ? unique(value.watched.filter((id) => typeof id === "string"))
        : [],
      want: Array.isArray(value.want)
        ? unique(value.want.filter((id) => typeof id === "string"))
        : [],
      saved: Array.isArray(value.saved)
        ? value.saved
            .filter(
              (item) =>
                item &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                typeof item.query === "string",
            )
            .slice(0, 20)
        : [],
    };
  } catch {
    return EMPTY;
  }
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProfileState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(parseState(window.localStorage.getItem(STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

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

  const value = useMemo<ProfileContextValue>(
    () => ({
      state,
      hydrated,
      toggleService,
      hasService: (id) => state.services.includes(id),
      toggleWatched,
      toggleWant,
      isWatched: (id) => state.watched.includes(id),
      isWant: (id) => state.want.includes(id),
      saveFilter,
      removeFilter,
    }),
    [
      state,
      hydrated,
      toggleService,
      toggleWatched,
      toggleWant,
      saveFilter,
      removeFilter,
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
