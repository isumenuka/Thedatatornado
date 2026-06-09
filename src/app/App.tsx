import { useState, useEffect } from "react";
import { DataTornado } from "./components/data-tornado";
import { LoadingTornado } from "./components/loading-tornado";
import { projectId, publicAnonKey } from "/utils/supabase/info";

const SERVER_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7b7572b4`;

export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);
  const [defaultYear, setDefaultYear] = useState<
    number | undefined
  >(undefined);

  useEffect(() => {
    const shareId = new URLSearchParams(
      window.location.search,
    ).get("share");
    if (!shareId) return;

    // Deep link: skip loading animation and jump to the shared year
    setShowDashboard(true);
    fetch(`${SERVER_URL}/share/${shareId}`, {
      headers: { Authorization: `Bearer ${publicAnonKey}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.birth_year) setDefaultYear(data.birth_year);
        else
          console.log(
            `Share lookup error: ${JSON.stringify(data)}`,
          );
      })
      .catch((err) =>
        console.log(`Share deep-link fetch error: ${err}`),
      );
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#05050A]">
      <DataTornado
        isReady={showDashboard}
        defaultYear={defaultYear}
      />
      {!showDashboard && (
        <LoadingTornado
          onComplete={() => setShowDashboard(true)}
        />
      )}
    </div>
  );
}