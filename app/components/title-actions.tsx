import { Button } from "~/components/ui/button";
import { useProfile } from "~/components/profile-provider";

export function TitleActions({ titleId }: { titleId: string }) {
  const { hydrated, isWatched, isWant, toggleWatched, toggleWant } =
    useProfile();
  const watched = hydrated && isWatched(titleId);
  const want = hydrated && isWant(titleId);

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button
        variant={watched ? "default" : "outline"}
        size="sm"
        disabled={!hydrated}
        onClick={() => toggleWatched(titleId)}
      >
        {watched ? "Watched" : "Mark watched"}
      </Button>
      <Button
        variant={want ? "default" : "outline"}
        size="sm"
        disabled={!hydrated}
        onClick={() => toggleWant(titleId)}
      >
        {want ? "Want to watch" : "Add to watchlist"}
      </Button>
    </div>
  );
}
