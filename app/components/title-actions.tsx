import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "~/components/ui/button";
import { useProfile } from "~/components/profile-provider";

export function TitleActions({ titleId }: { titleId: string }) {
  const { hydrated, isWatched, isWant, toggleWatched, toggleWant } =
    useProfile();
  const watched = hydrated && isWatched(titleId);
  const want = hydrated && isWant(titleId);

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button
        variant={watched ? "default" : "outline"}
        disabled={!hydrated}
        onClick={() => toggleWatched(titleId)}
      >
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} />
        {watched ? "Watched" : "Mark watched"}
      </Button>
      <Button
        variant={want ? "default" : "outline"}
        disabled={!hydrated}
        onClick={() => toggleWant(titleId)}
      >
        <HugeiconsIcon icon={Bookmark02Icon} strokeWidth={2} />
        {want ? "On your watchlist" : "Add to watchlist"}
      </Button>
    </div>
  );
}
