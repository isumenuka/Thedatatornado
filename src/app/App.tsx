import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import { DataTornado } from "./components/data-tornado";
import { LoadingTornado } from "./components/loading-tornado";
import BirthDaySharePage from "./components/birth-day-share-page";

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("share");
    if (id) {
      setShareId(id);
      setShowDashboard(true);
    }
  }, []);

  const exitShare = () => {
    setShareId(null);
    const url = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, "", url);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#05050A]">
      <DataTornado isReady={showDashboard} />
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
