import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { RewardMoment } from "./lesson/RewardMoment";
import "./theme.css";

const FeedTab = lazy(() => import("./tabs/feed/FeedTab"));

const receipt = {
  xp: [
    { label: "Lesson cleared", amount: 30 },
    { label: "Flawless", amount: 8 },
    { label: "Daily goal", amount: 4 },
  ],
  diamonds: [{ label: "Unit gate", amount: 15 }],
  charge: { delta: -2 },
  streak: { counted: true, current: 14, milestone: 14 },
  mastery: { visibleBefore: 12, visibleAfter: 15, rankUp: null },
} as const;

const which = new URLSearchParams(location.search).get("s") ?? "reward";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {which === "feed" ? (
      <Suspense fallback={<div>loading</div>}>
        <FeedTab />
      </Suspense>
    ) : (
      <RewardMoment
        receipt={receipt as never}
        diamondBalance={1290}
        firstDiamond={false}
        correct={7}
        attempted={8}
        reducedMotion
        onContinue={() => {}}
      />
    )}
  </StrictMode>,
);
