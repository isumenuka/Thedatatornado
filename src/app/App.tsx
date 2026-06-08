import { useState } from "react";
import { DataTornado } from "./components/data-tornado";
import { LoadingTornado } from "./components/loading-tornado";

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-[#05050A]">
      <DataTornado isReady={showDashboard} />
      {!showDashboard && (
        <LoadingTornado onComplete={() => setShowDashboard(true)} />
      )}
    </div>
  );
}
