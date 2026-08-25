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
import { hrefForOnboarding } from "./app/routes";
import { useProgress, useReducedMotion } from "./app/hooks";
import { TabSkeleton } from "./app/ui/Skeleton";

const Onboarding = lazy(() => import("./onboarding/Onboarding"));

const params = new URLSearchParams(window.location.search);
/** The measurement scripts need the canvas with no onboarding in front of it. */
const MEASURING = params.get("auto") === "1" || params.get("stats") === "1" || params.get("targets") === "1";

export default function App() {
  const route = useHashRoute();
  const snapshot = useProgress();
  const reducedMotion = useReducedMotion();

  const needsOnboarding = !snapshot.onboardingDone && !MEASURING;
  useEffect(() => {
    if (needsOnboarding && route.kind !== "onboarding") navigate(hrefForOnboarding("welcome"));
  }, [needsOnboarding, route.kind]);

  if (route.kind === "onboarding") {
    return (
      <Suspense fallback={<TabSkeleton label="the placement quiz" />}>
        <Onboarding step={route.step} reducedMotion={reducedMotion} />
      </Suspense>
    );
  }

  if (needsOnboarding) return <TabSkeleton label="Blueberry" />;

  return <Shell route={route} />;
}
