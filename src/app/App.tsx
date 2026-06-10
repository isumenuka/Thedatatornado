import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { DataTornado } from "./components/data-tornado";
import { LoadingTornado } from "./components/loading-tornado";
import BirthDaySharePage from "./components/birth-day-share-page";

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [initialYear, setInitialYear] = useState<number | undefined>(undefined);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("share");
    const yearParam = params.get("year");
    if (id) {
      setShareId(id);
      setShowDashboard(true);
      return;
    }
    if (yearParam) {
      const y = parseInt(yearParam, 10);
      if (Number.isFinite(y)) {
        setInitialYear(y);
        setShowDashboard(true);
      }
    }
  }, []);

  const exitShare = () => {
    setShareId(null);
    const url = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, "", url);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05050A]">
      <DataTornado isReady={showDashboard} defaultYear={initialYear} />
      {!showDashboard && (
        <LoadingTornado onComplete={() => setShowDashboard(true)} />
      )}
      <AnimatePresence>
        {shareId && (
          <BirthDaySharePage key="share" shareId={shareId} onExit={exitShare} />
        )}
      </AnimatePresence>
    </div>
  );
}
