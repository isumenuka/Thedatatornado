import { useState, useEffect } from "react";
import { Wind, Radio, AlertCircle, Crosshair, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";


interface NewsItem {
  id: string;
  sourceName: string;
  title: string;
  location: string;
  year: number;
  description: string;
  efScale?: string;
  windSpeed?: string;
  imageUrl: string;
  category: "vortex" | "damage" | "land" | "people";
}

const DISASTER_DATASET: NewsItem[] = [
  { id:"v1", sourceName:"NOAA Storm Data", title:"Violent Multi-Vortex Tornado, Oklahoma", location:"Oklahoma, USA", year:2024, description:"A monstrous multi-vortex EF4 tornado tears through farmland. Dust and debris turn the condensation funnel pitch black as it scours the topsoil at unimaginable speeds.", efScale:"EF4", windSpeed:"185 mph", imageUrl:"https://images.unsplash.com/photo-1695605117915-b4d45bd528fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"vortex" },
  { id:"v2", sourceName:"Storm Prediction Center", title:"Supercell Wall Cloud Rotation — Nebraska", location:"Nebraska, USA", year:2021, description:"A massive low-hanging mesocyclone wall cloud with extreme updrafts and rapid rotation. Tornado formation imminent within minutes of this photograph.", efScale:"EF2 Potential", windSpeed:"Mesocyclone", imageUrl:"https://images.unsplash.com/photo-1527482797697-8795b05a13fd?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"v3", sourceName:"NWS Lubbock", title:"Twin Supercell Vortex — Texas Panhandle", location:"Texas, USA", year:2020, description:"Splitting storm fronts generated twin large wedge tornadoes simultaneously. An extremely rare configuration representing severe convective instability.", efScale:"EF3", windSpeed:"150 mph", imageUrl:"https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"v4", sourceName:"Weather Underground", title:"Stovepipe Tornado Touches Down — Kansas", location:"Kansas, USA", year:2022, description:"A narrow high-contrast stovepipe tornado cuts through open plains against an ominous green-tinted sky. Debris cloud at base confirms ground contact.", efScale:"EF3", windSpeed:"155 mph", imageUrl:"https://images.unsplash.com/photo-1504608524841-42584120d833?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"v5", sourceName:"AccuWeather Research", title:"Moore EF5 Wedge Tornado Engulfs Horizon", location:"Moore, Oklahoma, USA", year:2013, description:"The historic 2013 Moore EF5 tornado — over a mile wide — one of the most destructive ever recorded in US history. Peak winds exceeded 210 mph.", efScale:"EF5", windSpeed:"210 mph", imageUrl:"https://images.unsplash.com/photo-1523772354-049f6f6c2d79?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"v6", sourceName:"SPC Mesoanalysis", title:"Rotating Supercell Storm Tower", location:"South Dakota, USA", year:2023, description:"A sculpted supercell storm tower with pronounced anvil and dramatic inflow bands. The rotating base wall cloud signals extreme convective instability.", efScale:"EF1 Potential", windSpeed:"Inflow 65 mph", imageUrl:"https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"v7", sourceName:"NWS Storm Spotter", title:"Storm Chasers Monitor Wedge Rotation", location:"Kansas, USA", year:2024, description:"Meteorologists and storm spotters track a large wedge rotation, relaying real-time telemetry to the national weather center for emergency broadcasts.", efScale:"Supercell Track", windSpeed:"Inflow 50 mph", imageUrl:"https://images.unsplash.com/photo-1561470508-fd4df1ed90b2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"vortex" },
  { id:"v8", sourceName:"Chaser Network", title:"Elephant Trunk Tornado — Nebraska Plains", location:"Nebraska, USA", year:2022, description:"A classic elephant trunk tornado descends from a rotating wall cloud. The narrow condensation funnel widens dramatically as it contacts the ground surface.", efScale:"EF2", windSpeed:"130 mph", imageUrl:"https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"d1", sourceName:"NWS Survey Team", title:"Residential Foundations Swept Clean — Kentucky", location:"Mayfield, Kentucky, USA", year:2021, description:"The 2021 Western Kentucky EF4 outbreak swept hundreds of homes clean off their foundations. Only concrete slabs remained after the 160-mile destruction track.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1737674913154-ba7f49b6096e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"damage" },
  { id:"d2", sourceName:"Associated Press", title:"Rolling Fork Catastrophic EF4 Destruction", location:"Rolling Fork, Mississippi", year:2023, description:"A violent EF4 obliterated much of Rolling Fork. Brick structures collapsed, steel frames buckled, and vehicles were thrown hundreds of yards. 17 lives lost.", efScale:"EF4", windSpeed:"195 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d3", sourceName:"FEMA Damage Assessment", title:"Suburban Wreckage Corridor — Alabama", location:"Alabama, USA", year:2022, description:"Aerial sweep of a suburban neighborhood obliterated by EF3 winds. Framing timbers disintegrated, vehicles impaled on utility poles, debris scattered miles.", efScale:"EF3", windSpeed:"160 mph", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d4", sourceName:"Industrial Safety Board", title:"Industrial Warehouse Complex Collapse", location:"Iowa, USA", year:2019, description:"Steel warehouse structures crumpled as EF3 winds peeled off roof cladding. Heavy machinery was displaced hundreds of feet from original positions.", efScale:"EF3", windSpeed:"145 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d5", sourceName:"Barnsdall Dispatch", title:"Barnsdall EF4 — Total Neighborhood Destruction", location:"Barnsdall, Oklahoma", year:2024, description:"Houses swept from foundations, cars thrown over 100 yards, and entire blocks rendered unrecognizable. One of the most violent Oklahoma tornadoes of 2024.", efScale:"EF4", windSpeed:"180 mph", imageUrl:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d6", sourceName:"Storm Damage Archive", title:"Heavy Vehicle Displacement on Tornado Path", location:"Nebraska, USA", year:2020, description:"Semi-trucks and farm equipment overturned and thrown hundreds of feet. Large vehicles serve as key EF-scale benchmarks during post-storm field surveys.", efScale:"EF4", windSpeed:"175 mph", imageUrl:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"l1", sourceName:"USFS Damage Report", title:"Forest Defoliation Corridor — Minnesota", location:"Minnesota, USA", year:2022, description:"A corridor of trees snapped and stripped of bark at precisely uniform angles. Bare trunks and debris fields exposed across miles of national forest.", efScale:"EF2", windSpeed:"130 mph", imageUrl:"https://images.unsplash.com/photo-1599740831146-2713e2d6b38c?q=80&w=1600&auto=format&fit=crop", category:"land" },
  { id:"l2", sourceName:"USDA Field Survey", title:"Topsoil Scouring Leaves Deep Trenches", location:"South Dakota, USA", year:2023, description:"EF5 contact velocity stripped 4+ inches of topsoil from crop fields. Trenches up to 2 feet deep carved into the earth, destroying harvests and farm equipment.", efScale:"EF5", windSpeed:"215 mph", imageUrl:"https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?q=80&w=1600&auto=format&fit=crop", category:"land" },
  { id:"l3", sourceName:"Colorado Emergency Management", title:"Post-Vortex Flash Flood Outflow", location:"Colorado, USA", year:2021, description:"A tornado-associated convective system produced extreme rainfall and flash flooding. Farmland inundated, bridges washed out, and erosion channels carved.", efScale:"EF1", windSpeed:"105 mph", imageUrl:"https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=1600&auto=format&fit=crop", category:"land" },
  { id:"l4", sourceName:"Climate Science Journal", title:"Severe Storm Plains Devastation", location:"Wyoming, USA", year:2023, description:"Wide-area cyclonic wind damage devastated vast stretches of open rangeland. Fencing ripped from ground, cattle displaced, windbreak tree-rows leveled.", efScale:"EF2", windSpeed:"135 mph", imageUrl:"https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=1600&auto=format&fit=crop", category:"land" },
  { id:"p1", sourceName:"FEMA Field Operations", title:"Emergency Search & Rescue Sweep", location:"Mississippi, USA", year:2023, description:"FEMA and local emergency services deploy structural-check teams to clear debris and rescue trapped survivors in the first 72 hours following the EF4 strike.", efScale:"Rescue Ops", windSpeed:"Post-EF4", imageUrl:"https://images.unsplash.com/photo-1606613817011-84d20b0959ca?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"people" },
  { id:"p2", sourceName:"Red Cross Disaster Response", title:"Community Recovery & Aid Distribution", location:"Arkansas, USA", year:2025, description:"Volunteer networks establishing aid stations, clean water distribution, and mobile medical units. Communities begin the long rebuild following tornado outbreaks.", efScale:"Recovery Phase", windSpeed:"N/A", imageUrl:"https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"people" },
  { id:"p3", sourceName:"National Storm Survey Division", title:"EF-Scale Damage Telemetry Survey", location:"Indiana, USA", year:2022, description:"Surveyors examine damage paths, structural indicators, and uprooted vegetation to officially rate and classify the Fujita intensity of a tornado event.", efScale:"Survey Ops", windSpeed:"Post-Storm", imageUrl:"https://images.unsplash.com/photo-1508962914676-134849a727f0?q=80&w=1600&auto=format&fit=crop", category:"people" },
  { id:"p4", sourceName:"National Guard Operations", title:"Emergency Water Logistics Deployment", location:"Tennessee, USA", year:2023, description:"National Guard deploying emergency water tankers and power generators to areas where infrastructure was severed by tornado impact and severe flooding.", efScale:"Disaster Logistics", windSpeed:"N/A", imageUrl:"https://images.unsplash.com/photo-1464207687583-a82f6e1d2c6e?q=80&w=1600&auto=format&fit=crop", category:"people" },
  { id:"p5", sourceName:"Storm Observer Network", title:"Doppler Radar Mobile Unit On-Site", location:"Nebraska, USA", year:2023, description:"Mobile Doppler radar units deployed to track supercell evolution in real time. Data feeds directly to NWS tornado warning systems for emergency broadcasts.", efScale:"Scientific Deploy", windSpeed:"Tracking Active", imageUrl:"https://images.unsplash.com/photo-1518391846015-55a9cc003b25?q=80&w=1600&auto=format&fit=crop", category:"people" },
  { id:"p6", sourceName:"AP Breaking News", title:"Tornado Survivors at Emergency Shelter", location:"Kansas, USA", year:2022, description:"Displaced residents receive medical check-ups and registration at a community emergency shelter. Many lost all possessions and require extended long-term housing.", efScale:"Shelter Ops", windSpeed:"N/A", imageUrl:"https://images.unsplash.com/photo-1531983412531-1f49a365ffed?q=80&w=1600&auto=format&fit=crop", category:"people" },

  // ── Historical Disaster Archive (added from tornado-damage-summary) ──
  { id:"d7", sourceName:"NWS Survey Team", title:"Medical Center Structure Destroyed — Missouri", location:"Joplin, Missouri, USA", year:2011, description:"The devastating Joplin EF5 carved a mile-wide path directly through the city, heavily damaging St. John's Regional Medical Center and leveling over 7,000 homes in minutes.", efScale:"EF5", windSpeed:"200+ mph", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d8", sourceName:"NWS Survey Team", title:"Town Center Obliterated — Iowa", location:"Greenfield, Iowa, USA", year:2024, description:"An extremely fast-moving EF4 tornado produced catastrophic damage in Greenfield, Iowa. Massive wind turbines were snapped in half and numerous homes were reduced to splinters.", efScale:"EF4", windSpeed:"185 mph", imageUrl:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d9", sourceName:"NWS Survey Team", title:"Historic Downtown Leveled — Oklahoma", location:"Sulphur, Oklahoma, USA", year:2024, description:"A massive EF3 tornado moved through downtown Sulphur late at night, tearing the roofs and walls off historic brick buildings and tossing heavy vehicles into structures.", efScale:"EF3", windSpeed:"165 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"v9", sourceName:"DOW Mobile Radar Team", title:"Highest Recorded Winds — Oklahoma", location:"Bridge Creek, Oklahoma, USA", year:1999, description:"This historic F5 tornado produced the highest wind speeds ever recorded on Earth by mobile Doppler radar, deeply scouring the ground and wiping well-built homes off the map.", efScale:"F5", windSpeed:"301 mph (Radar Est.)", imageUrl:"https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"d10", sourceName:"NWS Survey Team", title:"Major City Corridor Devastated — Alabama", location:"Tuscaloosa, Alabama, USA", year:2011, description:"A massive multi-vortex EF4 tornado tracked straight through Tuscaloosa, utterly destroying commercial corridors, student housing, and critical infrastructure along an 80-mile path.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d11", sourceName:"NWS Survey Team", title:"Rural Communities Wiped Out — Alabama", location:"Hackleburg, Alabama, USA", year:2011, description:"One of the most violent tornadoes in the Super Outbreak completely leveled the town of Hackleburg, throwing vehicles hundreds of yards and causing profound ground scouring.", efScale:"EF5", windSpeed:"210 mph", imageUrl:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"v10", sourceName:"NWS & DOW Radar Team", title:"Widest Tornado in History — Oklahoma", location:"El Reno, Oklahoma, USA", year:2013, description:"Breaking records with a maximum width of 2.6 miles, this erratic, rapidly expanding multiple-vortex tornado caught veteran storm chasers off guard.", efScale:"EF3", windSpeed:"295 mph (Radar Est.)", imageUrl:"https://images.unsplash.com/photo-1461511669078-d46bf351cd6e?q=80&w=1600&auto=format&fit=crop", category:"vortex" },
  { id:"p7", sourceName:"NWS Survey Team", title:"Green Rebuild After Total Loss — Kansas", location:"Greensburg, Kansas, USA", year:2007, description:"A massive 1.7-mile-wide EF5 wedge tornado destroyed 95% of Greensburg. The town famously rebuilt as one of the most environmentally sustainable communities in the country.", efScale:"EF5", windSpeed:"205 mph", imageUrl:"https://images.unsplash.com/photo-1560220604-1985ebfe28b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"people" },
  { id:"d12", sourceName:"NWS Survey Team", title:"Violent Supercell Outbreak — Iowa", location:"Parkersburg, Iowa, USA", year:2008, description:"In a matter of seconds, an EF5 tornado sheared well-built homes down to the subfloor and completely debarked trees, leaving behind an unrecognizable landscape.", efScale:"EF5", windSpeed:"205 mph", imageUrl:"https://images.unsplash.com/photo-1737674913154-ba7f49b6096e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080", category:"damage" },
  { id:"d13", sourceName:"Historical Survey Data", title:"Super Outbreak Devastation — Ohio", location:"Xenia, Ohio, USA", year:1974, description:"One of the most infamous tornadoes of the 1974 Super Outbreak, the Xenia F5 flattened entire subdivisions and tossed entire freight trains entirely off their tracks.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d14", sourceName:"Historical Survey Data", title:"Air Force Base in Path — Kansas", location:"Andover, Kansas, USA", year:1991, description:"A highly visible F5 tornado famously filmed by residents swept through the Golden Spur Mobile Home Park, completely erasing it and narrowly missing a fleet of B-1 bombers.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1590071089561-2480ec4b2ef0?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d15", sourceName:"Historical Survey Data", title:"Extreme Asphalt Scouring — Texas", location:"Jarrell, Texas, USA", year:1997, description:"Moving at a slow, creeping pace, this monstrous F5 tornado completely pulverized the Double Creek subdivision, scouring asphalt from roads and leaving absolutely nothing behind.", efScale:"F5", windSpeed:"260 mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1534067783941-51c9c23eccfd?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d16", sourceName:"NWS Survey Team", title:"Double Tornado Strike — Arkansas", location:"Vilonia, Arkansas, USA", year:2014, description:"Striking a town that had just rebuilt from a 2011 tornado, this high-end EF4 leveled new subdivisions and completely destroyed the local intermediate school.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d17", sourceName:"NWS Survey Team", title:"Twin Wedge Tornadoes — Mississippi", location:"Bassfield, Mississippi, USA", year:2020, description:"Part of a rare twin tornado event, this massive EF4 gouged deep trenches into the earth, shredded dense pine forests, and wiped sturdy homes completely off the map.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1599740831146-2713e2d6b38c?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d18", sourceName:"NWS Survey Team", title:"Tiny Hamlet Obliterated — Illinois", location:"Fairdale, Illinois, USA", year:2015, description:"A violently rotating EF4 swept through the small, tight-knit community of Fairdale, taking homes entirely off their foundations and tossing vehicles miles away.", efScale:"EF4", windSpeed:"200 mph", imageUrl:"https://images.unsplash.com/photo-1580687761972-e4c7a0ff9b52?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d19", sourceName:"NWS Survey Team", title:"Suburban Tracts Destroyed — Illinois", location:"Washington, Illinois, USA", year:2013, description:"Occurring unusually late in the year, this powerful November EF4 leveled hundreds of homes in Washington, Illinois, tossing cars into living rooms and scattering debris for miles.", efScale:"EF4", windSpeed:"190 mph", imageUrl:"https://images.unsplash.com/photo-1509822929464-92b5d5578b94?q=80&w=1600&auto=format&fit=crop", category:"damage" },
  { id:"d20", sourceName:"Historical Survey Data", title:"Palm Sunday Outbreak — Indiana", location:"Midway, Indiana, USA", year:1965, description:"The infamous double-funneled tornado of the 1965 Palm Sunday Outbreak left profound destruction across mobile home parks, changing severe weather warning systems forever.", efScale:"F4", windSpeed:"200+ mph (Est.)", imageUrl:"https://images.unsplash.com/photo-1542382156909-9ae37b3f56fd?q=80&w=1600&auto=format&fit=crop", category:"damage" },
];

const CATEGORY_COLORS: Record<string, string> = {
  vortex: "#4FC3F7",
  damage: "#E53935",
  land: "#81C784",
  people: "#FFB74D",
};

interface DebrisItem {
  uuid: string;
  newsItem: NewsItem;
  top: number;
  width: number;
  height: number;
  spawnTime: number;
}

export default function DisasterWitnessGallery() {
  const [activeDebris, setActiveDebris] = useState<DebrisItem[]>([]);
  const [hoveredItem, setHoveredItem] = useState<NewsItem | null>(null);
  const [feedSource, setFeedSource] = useState<string>("Historical Database");
  const [liveFeed, setLiveFeed] = useState<NewsItem[]>(DISASTER_DATASET);
  const [debrisCount, setDebrisCount] = useState(0);

  // Attempt live feeds
  useEffect(() => {
    const tryLive = async () => {
      const key = import.meta.env.VITE_NEWS_API_KEY;
      if (key) {
        try {
          const res = await fetch(`https://newsapi.org/v2/everything?q=tornado+disaster&sortBy=publishedAt&pageSize=15&language=en&apiKey=${key}`);
          if (res.ok) {
            const { articles } = await res.json();
            if (articles?.length) {
              const extra: NewsItem[] = articles.map((a: any, i: number) => {
                const text = ((a.title || "") + " " + (a.description || "")).toLowerCase();
                let category: NewsItem["category"] = "people";
                if (text.includes("funnel") || text.includes("vortex") || text.includes("rotation")) category = "vortex";
                else if (text.includes("damage") || text.includes("destroyed")) category = "damage";
                else if (text.includes("land") || text.includes("forest")) category = "land";
                const pool = DISASTER_DATASET.filter(d => d.category === category);
                return {
                  id: `na-${i}`, sourceName: a.source?.name || "NewsAPI",
                  title: a.title || "Tornado Event", location: "Global", year: new Date(a.publishedAt).getFullYear(),
                  description: a.description || "Tornado event reported.", efScale: "Est. EF2+", windSpeed: "Severe",
                  imageUrl: a.urlToImage || pool[Math.floor(Math.random() * pool.length)]?.imageUrl || "https://images.unsplash.com/photo-1695605117915-b4d45bd528fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
                  category,
                };
              });
              setLiveFeed([...extra, ...DISASTER_DATASET]);
              setFeedSource("NewsAPI Live Feed");
              return;
            }
          }
        } catch {}
      }
      try {
        const res = await fetch("https://api.weather.gov/alerts/active?event=Tornado%20Warning,Tornado%20Watch", { headers: { "User-Agent": "TheDataTornado/1.0" } });
        if (res.ok) {
          const { features } = await res.json();
          if (features?.length) {
            const alerts: NewsItem[] = features.map((f: any, i: number) => {
              const p = f.properties;
              const pool = DISASTER_DATASET.filter(d => d.category === "vortex");
              return {
                id: `nws-${i}`, sourceName: p.senderName || "NWS",
                title: p.headline || p.event, location: (p.areaDesc || "USA").split(";")[0],
                year: new Date(p.sent).getFullYear(), description: p.description || "Active tornado alert.",
                efScale: p.severity === "Extreme" ? "EF4+ Alert" : "EF2 Alert", windSpeed: p.severity === "Extreme" ? ">165 mph" : "Severe",
                imageUrl: pool[Math.floor(Math.random() * pool.length)]?.imageUrl || "https://images.unsplash.com/photo-1695605117915-b4d45bd528fd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
                category: "vortex",
              };
            });
            setLiveFeed([...alerts, ...DISASTER_DATASET]);
            setFeedSource("NWS Live Alerts");
          }
        }
      } catch {}
    };
    tryLive();
  }, []);

  // Spawner — large images every 1 second
  useEffect(() => {
    if (!liveFeed.length) return;
    const id = setInterval(() => {
      const item = liveFeed[Math.floor(Math.random() * liveFeed.length)];
      const uuid = Math.random().toString(36).slice(2);
      const vh = window.innerHeight;
      const width  = Math.floor(Math.random() * 180) + 520;  // 520–700px
      const height = Math.floor(width * 0.62);
      const maxTop = Math.max(0, vh - height - 90);
      const top = Math.floor(Math.random() * maxTop);
      setDebrisCount(c => c + 1);
      setActiveDebris(prev => {
        const now = Date.now();
        return [...prev.filter(d => now - d.spawnTime < 6500), { uuid, newsItem: item, top, width, height, spawnTime: now }];
      });
    }, 1000);
    return () => clearInterval(id);
  }, [liveFeed]);

  const catColor = hoveredItem ? CATEGORY_COLORS[hoveredItem.category] ?? "#E53935" : "#E53935";

  return (
    <section
      className="relative w-full overflow-hidden bg-[#05050A] border-t border-white/10"
      style={{ height: "100vh" }}
    >
      {/* ── CSS ── */}
      <style>{`
        @keyframes vortexFly {
          0%   { transform: perspective(900px) translateX(-100px) scale(0.88) rotateY(-10deg); opacity: 0; filter: brightness(0.4); }
          12%  { opacity: 1; filter: brightness(1); }
          80%  { opacity: 1; }
          100% { transform: perspective(900px) translateX(110vw) scale(1.08) rotateY(28deg); opacity: 0; filter: brightness(0.35); }
        }
        .vortex-debris {
          position: absolute;
          background-size: cover;
          background-position: center;
          border-radius: 10px;
          border: 2px solid rgba(255,255,255,0.07);
          box-shadow: 0 24px 70px -10px rgba(0,0,0,0.95), inset 0 0 30px rgba(0,0,0,0.5);
          animation: vortexFly 6s cubic-bezier(0.2,0.6,0.8,0.4) forwards;
          cursor: crosshair;
          overflow: hidden;
          will-change: transform, opacity;
          transition: border-color 0.18s, box-shadow 0.18s;
        }
        .vortex-debris:hover {
          border-color: #E53935;
          box-shadow: 0 0 50px rgba(229,57,53,0.65), 0 30px 80px -10px rgba(0,0,0,1);
          animation-play-state: paused;
          z-index: 80 !important;
        }
        .scanlines {
          background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.2) 3px,rgba(0,0,0,0.2) 4px);
        }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* BG grid */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.011) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.011) 1px,transparent 1px)", backgroundSize:"55px 55px" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background:"radial-gradient(ellipse 70% 70% at 50% 50%,rgba(229,57,53,0.035) 0%,transparent 100%)" }} />
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none z-10" />

      {/* ── LEFT PANEL (0%–46%) ── */}
      <div className="absolute top-0 left-0 bottom-0 flex flex-col justify-between p-10 pointer-events-none z-30"
        style={{ width: "46%" }}>

        {/* Top title block */}
        <div className="flex flex-col gap-3">
          {/* Section label */}
          <motion.div
            initial={{ opacity:0, y:16 }}
            whileInView={{ opacity:1, y:0 }}
            viewport={{ once:true }}
            transition={{ duration:0.7 }}
            className="flex items-center gap-4 font-mono text-[10px] tracking-[0.3em] uppercase"
          >
            <span style={{ color:"#E53935" }}>06</span>
            <span className="h-px w-16 bg-[#E53935]/35" />
            <span className="text-[#888897]">Disaster Witness Gallery</span>
          </motion.div>

          <h2 className="font-orbitron font-black text-4xl md:text-[3.6rem] tracking-tight leading-[0.9] uppercase text-white">
            VORTEX<br/>DEBRIS<br/>
            <span style={{ color:"#E53935", textShadow:"0 0 28px rgba(229,57,53,0.5)" }}>FLOW</span>
          </h2>

          <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em] text-[#888897] uppercase mt-1">
            <Radio size={9} className="text-[#E53935] animate-pulse" />
            {feedSource}
          </div>
        </div>

        {/* ── TELEMETRY PANEL — appears on hover ── */}
        <div className="flex-1 flex flex-col justify-center mt-8">
          <AnimatePresence mode="wait">
            {hoveredItem ? (
              <motion.div
                key={hoveredItem.id}
                initial={{ opacity:0, x:-24, filter:"blur(4px)" }}
                animate={{ opacity:1, x:0, filter:"blur(0px)" }}
                exit={{ opacity:0, x:-16, filter:"blur(3px)" }}
                transition={{ duration:0.22, ease:"easeOut" }}
                className="flex flex-col gap-4"
              >
                {/* Category + EF badges */}
                <div className="flex items-center gap-3">
                  <div className="font-mono text-[10px] tracking-widest uppercase bg-white/5 border border-white/10 text-white/80 px-2.5 py-1 rounded">
                    CATEGORY: <span style={{ color: catColor }}>{hoveredItem.category}</span>
                  </div>
                  {hoveredItem.efScale && (
                    <div className="font-orbitron font-black text-[11px] px-2.5 py-1 rounded border"
                      style={{ background:`${catColor}18`, borderColor:`${catColor}44`, color:catColor, textShadow:`0 0 10px ${catColor}88` }}>
                      {hoveredItem.efScale}
                    </div>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h3 className="font-orbitron font-black text-white text-[15px] leading-snug tracking-wide uppercase">
                    {hoveredItem.title}
                  </h3>
                  <div className="flex justify-between items-center font-mono text-[9px] text-[#888897] mt-2 pt-2 border-t border-white/[0.06]">
                    <span>📍 {hoveredItem.location}</span>
                    <span>🗓 {hoveredItem.year}</span>
                  </div>
                </div>

                {/* Wind speed */}
                {hoveredItem.windSpeed && hoveredItem.windSpeed !== "N/A" && (
                  <div className="flex items-center gap-2 font-mono font-bold text-[11px]"
                    style={{ color: catColor }}>
                    <Wind size={12} />
                    PEAK WINDS: {hoveredItem.windSpeed}
                  </div>
                )}

                {/* Divider */}
                <div className="h-px" style={{ background:`linear-gradient(to right, ${catColor}55, transparent)` }} />

                {/* Description */}
                <p className="font-mono text-[10px] leading-[1.75] text-white/80">
                  {hoveredItem.description}
                </p>

                {/* Source */}
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-widest uppercase pt-1 border-t border-white/[0.06]"
                  style={{ color: catColor }}>
                  <AlertCircle size={9} />
                  SOURCE: {hoveredItem.sourceName.toUpperCase()}
                </div>
              </motion.div>
            ) : (
              /* Idle state */
              <motion.div
                key="idle"
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                exit={{ opacity:0 }}
                transition={{ duration:0.3 }}
                className="flex flex-col items-start gap-4"
              >
                {/* Scanning animation */}
                <div className="flex items-center gap-3">
                  <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border border-[#E53935]/30 animate-ping" style={{ animationDuration:"2s" }} />
                    <Crosshair size={18} className="text-[#E53935]/60" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-mono text-[10px] tracking-[0.25em] text-white/50 uppercase">Awaiting Target</span>
                    <span className="font-mono text-[8px] tracking-widest text-[#888897] uppercase">// hover any debris image →</span>
                  </div>
                </div>

                {/* Fake scanning bars */}
                <div className="flex flex-col gap-2 w-full max-w-[260px]">
                  {["TITLE", "LOCATION", "EF SCALE", "WIND SPEED", "DESCRIPTION"].map((label) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase w-20 shrink-0">{label}</span>
                      <div className="h-px flex-1 bg-white/[0.06]" />
                      <span className="font-mono text-[7px] tracking-wider text-white/15">---</span>
                    </div>
                  ))}
                </div>

                {/* Activity icon */}
                <div className="flex items-center gap-2 mt-2">
                  <Activity size={12} className="text-[#E53935]/40" />
                  <span className="font-mono text-[8px] tracking-widest text-white/20 uppercase">
                    {debrisCount} DEBRIS OBJECTS LOGGED
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Fujita legend */}
        <div className="flex flex-col gap-1.5 items-start">
          {[["EF5","#9C27B0"],["EF4","#E53935"],["EF3","#FF7043"],["EF2","#FFB74D"],["EF1","#4FC3F7"],["EF0","#81C784"]].map(([ef,color]) => (
            <div key={ef} className="flex items-center gap-2 font-mono text-[8px] tracking-widest uppercase">
              <span style={{ width:28, height:1, background:color, display:"inline-block" }} />
              <span style={{ color }}>{ef}</span>
            </div>
          ))}
          <span className="font-mono text-[7px] tracking-widest text-white/15 uppercase mt-1">FUJITA SCALE REF</span>
        </div>
      </div>

      {/* ── DEBRIS FIELD (right 75%) ── */}
      <div className="absolute top-0 bottom-0 right-0 overflow-hidden" style={{ left:"25%", zIndex:0 }}>

        {/* Radar rings */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 pointer-events-none opacity-10">
          {[500,320,160].map((r,i) => (
            <div key={r} className="absolute rounded-full border border-white/[0.06]"
              style={{ width:r, height:r, top:"50%", left:0, marginTop:-r/2, marginLeft:-r/2,
                animation:`spin ${(i+1)*6}s linear infinite ${i%2===1?"reverse":""}` }} />
          ))}
          <div className="absolute w-3 h-3 rounded-full bg-[#E53935] top-1/2 -translate-y-1/2 animate-ping opacity-60" />
        </div>

        {/* Flying debris */}
        {activeDebris.map(item => (
          <div
            key={item.uuid}
            className="vortex-debris"
            style={{
              top: item.top,
              left: 0,          // spawn from left edge of this sub-container (= 50% of full screen)
              width: item.width,
              height: item.height,
              backgroundImage: `url(${item.newsItem.imageUrl})`,
              zIndex: 5,
            }}
            onMouseEnter={() => setHoveredItem(item.newsItem)}
            onMouseLeave={() => setHoveredItem(null)}
          />
        ))}
      </div>

      {/* ── Bottom bar ── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none px-10 py-4 border-t border-white/[0.05] flex items-center justify-between select-none"
        style={{ background:"linear-gradient(to top,rgba(5,5,10,0.92),transparent)" }}>
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-widest text-[#888897] uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] animate-ping" />
          VORTEX CHAMBER ACTIVE — {liveFeed.length} EVENTS LOADED
        </div>
        <div className="font-mono text-[9px] tracking-widest text-white/25 uppercase">
          ACTIVE DEBRIS: {activeDebris.length} &nbsp;|&nbsp; TOTAL LOGGED: {debrisCount}
        </div>
      </div>
    </section>
  );
}
