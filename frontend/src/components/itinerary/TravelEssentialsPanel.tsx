import React, { useState } from "react";

interface TravelEssentialsPanelProps {
  destination: string;
  country?: string;
  startdate?: string;
  enddate?: string;
  travelers?: number;
}

const openLink = (url: string) => window.open(url, "_blank", "noopener,noreferrer");

export const TravelEssentialsPanel: React.FC<TravelEssentialsPanelProps> = ({
  destination,
  country,
  startdate,
  enddate,
  travelers = 2,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const q = encodeURIComponent(`${destination}${country ? `, ${country}` : ""}`);

  const links: Array<{
    icon: string;
    title: string;
    desc: string;
    url: string;
    bg: string;
    badge?: string;
  }> = [
    {
      icon: "🏨",
      title: "Book hotels",
      desc: "Compare hotels, guesthouses & resorts near your route",
      url: `https://www.booking.com/searchresults.html?ss=${q}&checkin=${startdate || ""}&checkout=${enddate || ""}&group_adults=${travelers}&no_rooms=1`,
      bg: "from-sky-500 to-blue-600",
      badge: "Booking.com",
    },
    {
      icon: "🏡",
      title: "Airbnb stays",
      desc: "Apartments, villas & unique local homes",
      url: `https://www.airbnb.com/s/${encodeURIComponent(destination).replace(/%20/g, "-")}/homes?checkin=${startdate || ""}&checkout=${enddate || ""}&adults=${travelers}`,
      bg: "from-rose-500 to-red-500",
      badge: "Airbnb",
    },
    {
      icon: "🚗",
      title: "Rent a car",
      desc: "Self-drive with pickup at the airport or city",
      url: `https://www.rentalcars.com/Search?pickup=${encodeURIComponent(destination)}&dropoff=${encodeURIComponent(destination)}&driverage=${travelers >= 1 ? 30 : 30}`,
      bg: "from-amber-500 to-orange-600",
      badge: "Rentalcars",
    },
    {
      icon: "🚕",
      title: "Local rides",
      desc: "On-demand taxis & ride-hailing in the city",
      url: `https://www.uber.com/global/en/ride/?pickup=${encodeURIComponent(destination)}`,
      bg: "from-slate-600 to-slate-800",
      badge: "Uber",
    },
    {
      icon: "🛵",
      title: "Scooters & bikes",
      desc: "Two-wheelers for quick city hopping",
      url: `https://www.kayak.com/?a=${encodeURIComponent(destination)}`,
      bg: "from-emerald-500 to-teal-600",
      badge: "Kayak",
    },
    {
      icon: "🚆",
      title: "Trains & buses",
      desc: "Intercity rail and coach connections",
      url: `https://www.rome2rio.com/s/${encodeURIComponent(destination)}`,
      bg: "from-violet-500 to-purple-600",
      badge: "Rome2Rio",
    },
    {
      icon: "🧳",
      title: "Tours & activities",
      desc: "Skip-the-line tickets, guided tours & day trips",
      url: `https://www.getyourguide.com/s/?q=${q}&searchSource=1`,
      bg: "from-fuchsia-500 to-pink-600",
      badge: "GetYourGuide",
    },
    {
      icon: "✈️",
      title: "Book flights",
      desc: "Compare fares & times from nearby airports",
      url: `https://www.skyscanner.net/transport/flights/anywhere/${encodeURIComponent(destination).replace(/%20/g, "-")}/?adultsv2=${travelers}`,
      bg: "from-indigo-500 to-blue-700",
      badge: "Skyscanner",
    },
    {
      icon: "🛏️",
      title: "Hostels & budget stays",
      desc: "Bunk dorms, private rooms & social hostels",
      url: `https://www.hostelworld.com/s?q=${q}`,
      bg: "from-cyan-500 to-sky-600",
      badge: "Hostelworld",
    },
    {
      icon: "🛡️",
      title: "Travel insurance",
      desc: "Medical cover, trip protection & baggage cover",
      url: `https://safetywing.com/nomad-insurance?location=${encodeURIComponent(destination)}`,
      bg: "from-teal-500 to-emerald-600",
      badge: "SafetyWing",
    },
    {
      icon: "🍽️",
      title: "Restaurants & food",
      desc: "Top-rated places to eat near your route",
      url: `https://www.tripadvisor.com/Search?q=${q}`,
      bg: "from-orange-500 to-red-600",
      badge: "TripAdvisor",
    },
    {
      icon: "📶",
      title: "Local SIM & eSIM",
      desc: "Instant data plans so you're online on arrival",
      url: `https://www.airalo.com/search?q=${encodeURIComponent(destination)}`,
      bg: "from-lime-500 to-green-600",
      badge: "Airalo",
    },
    {
      icon: "🎟️",
      title: "Sightseeing passes",
      desc: "City passes & bundled attraction deals",
      url: `https://www.klook.com/search/?query=${encodeURIComponent(destination)}`,
      bg: "from-yellow-500 to-amber-600",
      badge: "Klook",
    },
    {
      icon: "🛂",
      title: "Visa & entry docs",
      desc: "Check requirements & apply for e-visas",
      url: `https://www.ivisa.com/search?query=${encodeURIComponent(destination)}`,
      bg: "from-slate-500 to-slate-700",
      badge: "iVisa",
    },
  ];

  return (
    <div className="card rounded-3xl overflow-hidden animate-fade-in-up">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 bg-gradient-to-r from-ink via-slate-800 to-brand-900 text-white flex items-center justify-between gap-3 text-left hover:opacity-95 transition-opacity cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-lg shrink-0">
            🧰
          </span>
          <div className="min-w-0">
            <h4 className="font-display text-sm font-extrabold tracking-tight">Travel essentials · {destination}</h4>
            <p className="text-[11px] text-white/60 font-semibold truncate">
              Hotels, homes, wheels & tours — one tap away
            </p>
          </div>
        </div>
        <span className={`shrink-0 w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-xs transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="p-5 bg-gradient-to-b from-slate-50/70 to-white animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {links.map((l) => (
              <button
                key={l.title}
                onClick={() => openLink(l.url)}
                className="group text-left bg-white rounded-2xl border border-slate-100 hover:border-transparent p-4 transition-all duration-200 hover:shadow-lift hover:-translate-y-0.5 cursor-pointer overflow-hidden relative"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${l.bg}`} />
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${l.bg} text-white flex items-center justify-center text-lg shrink-0 shadow-soft group-hover:scale-110 transition-transform`}>
                    {l.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-extrabold text-ink flex items-center gap-1.5">
                      {l.title}
                      {l.badge && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-400 rounded-md px-1.5 py-0.5">
                          {l.badge}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5 leading-relaxed">{l.desc}</p>
                  </div>
                  <span className="shrink-0 self-center text-slate-300 group-hover:text-brand-500 transition-colors text-xs">↗</span>
                </div>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-slate-400 font-semibold text-center">
            Links open in a new tab · availability & prices vary by date
          </p>
        </div>
      )}
    </div>
  );
};
