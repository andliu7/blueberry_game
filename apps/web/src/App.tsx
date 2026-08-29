/**
 * The root. Reads the hash route once, and either runs onboarding or renders
 * the shell around the current tab.
 *
 * Onboarding is lazy for the same reason the tabs are: a returning student
 * never downloads it. A first visit with no stored progress is redirected into
 * it; skipping is always available inside and leads to the trainer, not to a
 * wall, per BUILD-PROMPT.md Phase 5.
 *
 * The URL flags the Phase 4 measurement scripts rely on (?auto=1, ?stats=1,
 * ?renderer=3d) are read by the trainer tab, which is where the canvas lives,
 * so `measure:headless` and `measure:device` keep working against the default
 * route.
 */

import { lazy, Suspense, useEffect } from "react";
import { Shell } from "./app/Shell";
import { useHashRoute, navigate } from "./app/useHashRoute";
import { hrefForTab, hrefForOnboarding } from "./app/routes";
import { useProgress, useReducedMotion } from "./app/hooks";
import { TabSkeleton } from "./app/ui/Skeleton";

const Onboarding = lazy(() => import("./onboarding/Onboarding"));
const BeatRunner = lazy(() => import("./beats/BeatRunner").then((m) => ({ default: m.BeatRunner })));

/**
 * The mascot gallery, a development surface at #/gallery/berry.
 *
 * Lazy for the same reason everything else here is, and for one more: it
 * imports every state, every costume and a control panel, none of which a
 * student ever sees. React.lazy puts the whole subtree in its own chunk, so
 * the game route's initial payload does not reach it and the budget gate in
 * packages/validators keeps measuring the app rather than the workbench.
 */
const BerryGallery = lazy(() => import("./mascot/BerryGallery"));

/**
 * The review hub, lazy for the same reason: it pulls in the card store, the
 * scheduler and the deck import/export path, none of which the game route
 * needs. See src/review/ReviewRoute.tsx for why it is a route and not a tab.
 */
const ReviewRoute = lazy(() => import("./review/ReviewRoute"));

const params = new URLSearchParams(window.location.search);
/** The measurement scripts need the canvas with no onboarding in front of it. */
const MEASURING = params.get("auto") === "1" || params.get("stats") === "1" || params.get("targets") === "1";

export default function App() {
  const route = useHashRoute();
  const snapshot = useProgress();
  const reducedMotion = useReducedMotion();

  // The gallery is exempt from the onboarding redirect: it is a development
  // surface whose audience is a critic with a fresh profile, and a workbench
  // that first demands a placement quiz is a workbench nobody reaches.
  const needsOnboarding = !snapshot.onboardingDone && !MEASURING && route.kind !== "gallery";
  useEffect(() => {
    if (needsOnboarding && route.kind !== "onboarding") navigate(hrefForOnboarding("welcome"));
  }, [needsOnboarding, route.kind]);

  if (route.kind === "gallery") {
    return (
      <Suspense fallback={<TabSkeleton label="the mascot gallery" />}>
        <BerryGallery reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (route.kind === "onboarding") {
    return (
      <Suspense fallback={<TabSkeleton label="the placement quiz" />}>
        <Onboarding step={route.step} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (route.kind === "review") {
    return (
      <Suspense fallback={<TabSkeleton label="your review deck" />}>
        <ReviewRoute onExit={() => navigate(hrefForTab("pathway"))} />
      </Suspense>
    );
  }

  if (route.kind === "lesson") {
    return (
      <Suspense fallback={<TabSkeleton label="the lesson" />}>
        <BeatRunner
          node={route.node}
          reducedMotion={reducedMotion}
          onExit={() => navigate(hrefForTab("pathway"))}
        />
      </Suspense>
    );
  }

  if (needsOnboarding) return <TabSkeleton label="Blueberry" />;

  return <Shell route={route} />;
}
