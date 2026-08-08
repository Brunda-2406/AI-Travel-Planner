import React from "react";
import { Trip, TripDay } from "../../api/types";
import { BudgetSummary } from "./BudgetSummary";
import { formatCurrency } from "../../utils/currency";

const getFlagEmoji = (countryName: string) => {
  const mapping: { [key: string]: string } = {
    india: "🇮🇳",
    france: "🇫🇷",
    japan: "🇯🇵",
    "united kingdom": "🇬🇧",
    uk: "🇬🇧",
    "united states": "🇺🇸",
    usa: "🇺🇸",
    us: "🇺🇸",
    italy: "🇮🇹",
    spain: "🇪🇸",
    switzerland: "🇨🇭",
    australia: "🇦🇺",
    indonesia: "🇮🇩",
    bali: "🇮🇩",
    thailand: "🇹🇭",
    singapore: "🇸🇬",
    "united arab emirates": "🇦🇪",
    uae: "🇦🇪",
    "u.a.e": "🇦🇪",
    germany: "🇩🇪",
    netherlands: "🇳🇱",
    portugal: "🇵🇹",
    greece: "🇬🇷",
    turkey: "🇹🇷",
    vietnam: "🇻🇳",
    "south korea": "🇰🇷",
    mexico: "🇲🇽",
    brazil: "🇧🇷",
    egypt: "🇪🇬",
    morocco: "🇲🇦",
    "new zealand": "🇳🇿",
    canada: "🇨🇦",
    china: "🇨🇳",
    "sri lanka": "🇱🇰",
    nepal: "🇳🇵",
    malaysia: "🇲🇾",
    philippines: "🇵🇭",
    cambodia: "🇰🇭",
    laos: "🇱🇦",
    oman: "🇴🇲",
    qatar: "🇶🇦",
    bahrain: "🇧🇭",
    kuwait: "🇰🇼",
    saudi: "🇸🇦",
    "saudi arabia": "🇸🇦",
    jordan: "🇯🇴",
    israel: "🇮🇱",
    russia: "🇷🇺",
    "south africa": "🇿🇦",
    kenya: "🇰🇪",
    tanzania: "🇹🇿",
    argentina: "🇦🇷",
    chile: "🇨🇱",
    peru: "🇵🇪",
    colombia: "🇨🇴",
    "costa rica": "🇨🇷",
    iceland: "🇮🇸",
    norway: "🇳🇴",
    sweden: "🇸🇪",
    denmark: "🇩🇰",
    finland: "🇫🇮",
    poland: "🇵🇱",
    "czech republic": "🇨🇿",
    austria: "🇦🇹",
    belgium: "🇧🇪",
    ireland: "🇮🇪",
    taiwan: "🇹🇼",
    hongkong: "🇭🇰",
    "hong kong": "🇭🇰",
    fiji: "🇫🇯",
    maldives: "🇲🇻",
    mauritius: "🇲🇺",
    bangladesh: "🇧🇩",
    pakistan: "🇵🇰",
    afghanistan: "🇦🇫",
    kazakhstan: "🇰🇿",
    uzbekistan: "🇺🇿",
    georgia: "🇬🇪",
    azerbaijan: "🇦🇿",
    armenia: "🇦🇲",
    ukraine: "🇺🇦",
    romania: "🇷🇴",
    hungary: "🇭🇺",
    bulgaria: "🇧🇬",
    croatia: "🇭🇷",
    "bosnia and herzegovina": "🇧🇦",
    serbia: "🇷🇸",
    montenegro: "🇲🇪",
    albania: "🇦🇱",
    "north macedonia": "🇲🇰",
    malta: "🇲🇹",
    cyprus: "🇨🇾",
  };
  const key = countryName.toLowerCase().trim();
  return mapping[key] || mapping[key.replace(/[^a-z ]/g, "")] || "🏳️";
};

const WEATHER_EMOJI: Record<string, string> = {
  sunny: "☀️",
  clear: "☀️",
  partlycloudy: "⛅",
  cloudy: "☁️",
  overcast: "☁️",
  rain: "🌧️",
  lightrain: "🌦️",
  showers: "🌦️",
  thunderstorm: "⛈️",
  snow: "❄️",
  fog: "🌫️",
  mist: "🌫️",
  humid: "🌤️",
  hot: "🔥",
};

interface CountryGuideEntry {
  customs: string;
  safety: string;
  visa: string;
  transport: string;
  currency: string;
  besttime: string;
  food: string;
  language: string;
  emergency: string;
  tipping: string;
}

const GUIDE_DATA: { [key: string]: CountryGuideEntry } = {
  india: {
    customs: "Respect local traditions by removing shoes at temples. Dress modestly at religious sites. Head-nods can mean yes. Bargaining is normal in markets.",
    safety: "Drink only bottled/purified water. Avoid tap water and street ice. Keep a note of local emergency numbers (112).",
    visa: "Most travelers require an e-Tourist Visa (e-TV) before arrival. Passport must be valid for at least 6 months.",
    transport: "Use pre-paid taxis or ride-hailing apps like Uber or Ola. Auto-rickshaws are great for short city rides. Trains need advance booking.",
    currency: "Indian Rupee (₹ / INR). ATMs are everywhere; carry small notes for tips and markets.",
    besttime: "October to March — cool, dry and pleasant. Avoid the monsoon (June–September) and peak summer (April–June).",
    food: "Try regional specialities — dosa, thali, biryani, chaat. Eat at busy restaurants; street food is tasty but pick busy stalls.",
    language: "Hindi and English are widely spoken; each state has its own language too. A few words of Hindi go a long way.",
    emergency: "Police 112 · Ambulance 108 · Fire 101. Travel insurance with medical cover is strongly advised.",
    tipping: "10% at sit-down restaurants is appreciated. Small tips for porters, drivers and guides are customary."
  },
  france: {
    customs: "Always greet with 'Bonjour' or 'Bonsoir' before asking anything. Tipping is not required (service included), but rounding up is appreciated.",
    safety: "Be alert for pickpockets in tourist hotspots, train stations, and metro corridors.",
    visa: "Schengen rules apply. Citizens from US, UK, Canada, Australia can visit visa-free for up to 90 days.",
    transport: "Metro and RER train lines are highly efficient in cities. High-speed TGV connects major regions. Book train tickets early for discounts.",
    currency: "Euro (€ / EUR). Cards accepted nearly everywhere; keep some cash for small markets.",
    besttime: "April–June and September–October — mild weather and fewer crowds. July–August is peak tourist season.",
    food: "Baguettes, croissants, cheese, wine and bistros. Lunch menus (formule) are great value. Water is free if you ask for 'une carafe'.",
    language: "French. English works in tourist areas, but a polite 'Parlez-vous anglais?' is appreciated.",
    emergency: "Police 17 · Ambulance (SAMU) 15 · Fire 18 · EU-wide 112. Pharmacies have a green cross sign.",
    tipping: "Service is included; leave small change or round up for good service — 5–10% at most."
  },
  japan: {
    customs: "Bow slightly to greet. Tipping is considered offensive; good service is standard. Avoid eating or drinking while walking. Remove shoes indoors.",
    safety: "Very high safety standards. Tap water is safe. Keep an eye out for earthquake evacuation signs and know your hotel exit.",
    visa: "Visa waiver agreement applies to many countries for up to 90 days. Check official rules before flight.",
    transport: "Incredibly punctual trains and Shinkansen (bullet trains). Get a Suica/Pasmo card for easy bus and local subway travel.",
    currency: "Japanese Yen (¥ / JPY). Cash is still king in smaller shops, temples and ryokans.",
    besttime: "Spring (late March–April) for cherry blossoms; autumn (Oct–Nov) for foliage. Summer is hot and humid.",
    food: "Sushi, ramen, tempura, okonomiyaki and izakayas. Conveyor-belt sushi is fun and cheap. Slurping noodles is a compliment.",
    language: "Japanese. English signage is common in cities; a translation app is your best friend.",
    emergency: "Police 110 · Ambulance/Fire 119. Japan has excellent healthcare; travel insurance is still recommended.",
    tipping: "No tipping — ever. It can cause confusion. Just say 'Arigato' with a smile."
  },
  italy: {
    customs: "Greet with 'Buongiorno'/'Buonasera'. Dress modestly in churches (cover shoulders and knees). Cappuccino is a morning drink only.",
    safety: "Watch for pickpockets in crowded piazzas and on public transport. Keep bags zipped and in front.",
    visa: "Schengen rules apply — US, UK, Canada, Australia citizens can visit visa-free for up to 90 days.",
    transport: "Trains (Frecciarossa) link major cities. Local buses and metros in big cities. Driving in historic centres is restricted (ZTL zones).",
    currency: "Euro (€ / EUR). Cards widely accepted; keep cash for small trattorias and gelaterias.",
    besttime: "April–June and September–October for pleasant weather. August is hot and many locals holiday.",
    food: "Pizza, pasta, gelato, espresso and regional wines. Look for places with locals, not photos of food.",
    language: "Italian. English works in tourist hubs; learn 'Per favore' and 'Grazie'.",
    emergency: "Police 112 · Ambulance 118 · Fire 115 · EU-wide 112.",
    tipping: "Coperto (cover charge) is normal. Leave small change or round up — 5–10% for great service."
  },
  spain: {
    customs: "Dinner is late — restaurants fill up from 9pm. Greet with 'Hola'/'Buenos días'. Afternoon siesta still happens in smaller towns.",
    safety: "Watch belongings in crowded areas (La Rambla, metros). Petty theft is the main risk.",
    visa: "Schengen rules apply — visa-free for US, UK, Canada, Australia citizens up to 90 days.",
    transport: "Excellent high-speed AVE trains, metro in Madrid/Barcelona, and affordable intercity buses (ALSA).",
    currency: "Euro (€ / EUR). Cards accepted almost everywhere; cash for small bars.",
    besttime: "Spring (Apr–May) and autumn (Sep–Oct) are ideal. Coastal south is scorching in July–August.",
    food: "Tapas, paella, jamón, churros and fresh seafood. Tapas are often free with a drink in the south.",
    language: "Spanish (Castilian); Catalan in Barcelona, Basque in the north. English in tourist areas.",
    emergency: "112 is the single emergency number across Spain.",
    tipping: "Not expected — leave small change or round up. 5–10% in touristy spots is fine."
  },
  thailand: {
    customs: "Never touch anyone's head; never point feet at people or Buddha images. Remove shoes before temples and homes. The King is deeply revered.",
    safety: "Rent scooters only with a license and helmet. Beware of taxi scams — insist on the meter. Drink bottled water.",
    visa: "Most nationalities get 30–60 day visa exemptions on arrival. Check your country's specific rules.",
    transport: "BTS Skytrain and MRT in Bangkok, Grab for rides, ferries and long-tail boats in the islands. Domestic flights are cheap.",
    currency: "Thai Baht (฿ / THB). Cash is essential in markets and small islands.",
    besttime: "November–February — cool, dry and sunny. March–May is hot; June–October is monsoon on the west coast.",
    food: "Pad thai, tom yum, green curry, mango sticky rice and street-food heaven. 'Phet' = spicy, 'mai phet' = not spicy.",
    language: "Thai. English is limited outside tourist hubs — the smiling 'sawasdee' greeting opens doors.",
    emergency: "Police 191 · Tourist Police 1155 (English-speaking) · Ambulance 1669.",
    tipping: "Not expected but appreciated — round up taxis, leave loose change at street stalls, 10% at nicer restaurants."
  },
  "united states": {
    customs: "Tipping is expected: 15–20% at restaurants, $1–2 per drink, $1–2 per bag for porters. Greet with a smile; small talk is normal.",
    safety: "Generally safe, but research neighbourhoods in big cities. 911 works everywhere. Tap water is safe.",
    visa: "ESTA (visa waiver) for eligible countries — apply at least 72 hours before travel. Others need a B1/B2 visa.",
    transport: "Rental cars rule outside cities. Uber/Lyft everywhere. Amtrak and domestic flights for long distances. Public transit varies by city.",
    currency: "US Dollar ($ / USD). Cards are accepted everywhere; cash rarely needed.",
    besttime: "Spring (Apr–May) and autumn (Sep–Oct) for mild weather. Winter is great for skiing, summer for national parks.",
    food: "Huge portion sizes, burgers, BBQ, diners, food trucks and regional specialities from every cuisine in the world.",
    language: "English. Spanish is common in the south and west. No language barrier for most travelers.",
    emergency: "Emergency 911 (police, fire, ambulance) — one number for everything.",
    tipping: "15–20% at restaurants and for taxis/Uber drivers. Bartenders $1–2 a drink. Tipping culture is strong."
  },
  "united kingdom": {
    customs: "Queue politely — cutting in line is a big faux pas. Say 'sorry' and 'please' liberally. Drive on the left!",
    safety: "Generally safe. 999 for emergencies. Be mindful in crowded tourist spots in London.",
    visa: "Most visitors get 6 months visa-free. Check the UK ETA requirement — many nationalities now need an online ETA.",
    transport: "Oyster card or contactless for London tubes/buses. National Rail for intercity. Coach (National Express) is budget-friendly.",
    currency: "Pound Sterling (£ / GBP). Cards widely accepted, contactless everywhere.",
    besttime: "May–September for the best weather. It rains year-round — always pack a layer.",
    food: "Fish & chips, Sunday roast, full English breakfast, afternoon tea and curries (Birmingham & London are famous for them).",
    language: "English. Regional accents vary; everyone will understand you.",
    emergency: "999 (police, fire, ambulance) or 112.",
    tipping: "Optional — service charge often added. Round up or leave 10% at restaurants; £1–2 for drinks."
  },
  bali: {
    customs: "Respect Hindu temples — wear a sarong and sash to enter. Don't touch offerings on the ground (canang sari). Greet with palms together.",
    safety: "Rent scooters carefully — roads are chaotic. Beware monkey thefts at Uluwatu. Drink bottled water; carry hand sanitizer.",
    visa: "Most nationalities get 30 days on arrival (VOA) or visa-free in some cases. Extensions are possible at immigration.",
    transport: "Grab/Gojek motorbike taxis are the fastest way around. Rent a scooter (~$5/day) or hire a driver for day trips.",
    currency: "Indonesian Rupiah (Rp / IDR). Big numbers — carry cash; ATMs are common.",
    besttime: "April–October (dry season) is best. November–March is wetter but greener and quieter.",
    food: "Nasi goreng, mie goreng, satay, babi guling (pork) and fresh tropical fruit. Warungs are cheap local eateries.",
    language: "Indonesian (Bahasa) plus Balinese. English is widely spoken in tourist areas.",
    emergency: "Police 110 · Ambulance 118 · Tourist Police in Kuta & Ubud.",
    tipping: "10% service often included. Leave small tips for drivers, masseuses and guides — very appreciated."
  },
  singapore: {
    customs: "Chewing gum is banned (except medicinal). Fines for littering, jaywalking and eating on public transport. Respect the law — it's strictly enforced.",
    safety: "One of the safest cities in the world. Tap water is safe. Note: drug offenses carry severe penalties.",
    visa: "Most visitors get 30–90 day visa-free entry. Check your nationality before booking.",
    transport: "MRT is clean, cheap and efficient. Grab taxis are affordable. Singapore is very walkable.",
    currency: "Singapore Dollar (S$ / SGD). Cards and contactless accepted almost everywhere.",
    besttime: "Year-round tropical. February–April is slightly drier; avoid the Nov–Jan monsoon peaks.",
    food: "Hawker centres (Michelin-starred street food!) — chilli crab, laksa, chicken rice, satay. Cheap, delicious, everywhere.",
    language: "English is the lingua franca, plus Mandarin, Malay and Tamil.",
    emergency: "Police 999 · Ambulance/Fire 995 · Non-emergency 1777.",
    tipping: "Not expected — 10% service charge is usually added at restaurants. No tipping at hawker centres."
  },
  switzerland: {
    customs: "Greet with 'Grüezi' (Swiss German). Be punctual — Swiss value precision. Recycle diligently; littering is heavily fined.",
    safety: "Very safe. Mountains need proper gear and weather checks. Tap water is excellent.",
    visa: "Schengen rules — visa-free for US, UK, Canada, Australia citizens up to 90 days.",
    transport: "The Swiss Travel Pass covers trains, boats and buses — the rail network is world-class and scenic.",
    currency: "Swiss Franc (CHF). Cards accepted nearly everywhere; keep some cash for mountain huts.",
    besttime: "June–September for hiking, December–March for skiing. Spring/autumn are quieter.",
    food: "Fondue, raclette, rösti, chocolate and cheese. Mountain restaurants serve hearty alpine classics.",
    language: "German, French, Italian and Romansh — all official. English is widely spoken.",
    emergency: "Police 117 · Ambulance 144 · Fire 118 · Rega helicopter rescue 1414.",
    tipping: "Service included — just round up. A small tip for guides and porters is appreciated."
  },
  "united arab emirates": {
    customs: "Dress modestly in public (shoulders and knees covered in malls). Respect Ramadan — no eating/drinking in public during daylight. Public displays of affection are discouraged.",
    safety: "Extremely safe and well-policed. Respect local laws strictly — even minor offenses carry heavy penalties.",
    visa: "Many nationalities get visa-free or visa-on-arrival entry. Check the latest UAE rules before flying.",
    transport: "Metro in Dubai is excellent and cheap. Careem/Uber for rides. Rent a car to explore beyond the cities.",
    currency: "UAE Dirham (AED). Cards everywhere; ATMs abundant.",
    besttime: "November–March — pleasant 20–30°C. Summer (Jun–Sep) is brutally hot (40°C+).",
    food: "Shawarma, hummus, machboos, luqaimat and incredible international dining. Friday brunches are legendary.",
    language: "Arabic and English — English is universal in business and tourism.",
    emergency: "Police 999 · Ambulance 998 · Fire 997.",
    tipping: "10–15% service often added. Leave extra for great service — it's appreciated."
  },
  australia: {
    customs: "Friendly and informal. Tipping is not expected (except good service at restaurants). Watch out for extreme sun — slip, slop, slap.",
    safety: "Beaches: swim between the red-and-yellow flags — rips are dangerous. Wildlife: keep distance from kangaroos and don't feed them.",
    visa: "Most visitors need an eVisitor or ETA visa before arrival — apply online in advance.",
    transport: "Flights between cities are common. Trains and buses in cities; rent a car for the coast. Drive on the left.",
    currency: "Australian Dollar (A$ / AUD). Cards widely accepted; some rural areas are cash-only.",
    besttime: "September–November and March–May (spring/autumn) for mild weather. Summer (Dec–Feb) for beaches, winter (Jun–Aug) for the outback.",
    food: "Vegemite toast, meat pies, lamingtons, fresh seafood, brunch culture and world-class coffee.",
    language: "English with a colorful local slang — 'G'day', 'mate', 'arvo'.",
    emergency: "Emergency 000 (police, fire, ambulance).",
    tipping: "Not mandatory — round up or leave 10% for great restaurant service. Cafes often have a tip jar."
  }
};

const DEFAULT_GUIDE: CountryGuideEntry = {
  customs: "Respect local dress codes and cultural norms. Research customs and tipping traditions before you arrive.",
  safety: "Keep valuables secure. Always have local emergency numbers and travel insurance details handy.",
  visa: "Ensure passport has at least 6 months validity. Verify entry visa requirements before booking travel.",
  transport: "Prefer registered taxis or official ride-sharing apps. Learn local driving rules and public transport layouts.",
  currency: "Check the local currency before you go — use a travel card or check exchange rates in advance.",
  besttime: "Research the destination's peak and off seasons — weather and crowds can change your plan completely.",
  food: "Try local specialities at busy, well-reviewed spots — they're usually the freshest and most authentic.",
  language: "Learn a few basic phrases — 'hello', 'please' and 'thank you' open doors everywhere.",
  emergency: "Note the local emergency numbers and your country's embassy/consulate contact before departure.",
  tipping: "Check local tipping norms — some countries include service, others expect 15–20%."
};

const CountryGuide: React.FC<{ country: string }> = ({ country }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const countryKey = country.toLowerCase().trim();
  const flag = getFlagEmoji(country);
  const data = GUIDE_DATA[countryKey] || DEFAULT_GUIDE;

  const sections = [
    { icon: "🤝", title: "Customs & Etiquette", text: data.customs, color: "text-brand-700", bg: "bg-brand-50" },
    { icon: "🛡️", title: "Safety & Health", text: data.safety, color: "text-red-700", bg: "bg-red-50" },
    { icon: "🛂", title: "Visa & Entry", text: data.visa, color: "text-blue-700", bg: "bg-blue-50" },
    { icon: "💱", title: "Currency & Money", text: data.currency, color: "text-emerald-700", bg: "bg-emerald-50" },
    { icon: "🌤️", title: "Best Time to Visit", text: data.besttime, color: "text-sunset-700", bg: "bg-sunset-50" },
    { icon: "🍜", title: "Food & Drink", text: data.food, color: "text-orange-700", bg: "bg-orange-50" },
    { icon: "🗣️", title: "Language", text: data.language, color: "text-indigo-700", bg: "bg-indigo-50" },
    { icon: "🚗", title: "Transportation", text: data.transport, color: "text-amber-700", bg: "bg-amber-50" },
    { icon: "🚨", title: "Emergency Numbers", text: data.emergency, color: "text-rose-700", bg: "bg-rose-50" },
    { icon: "💝", title: "Tipping Guide", text: data.tipping, color: "text-fuchsia-700", bg: "bg-fuchsia-50" }
  ];

  return (
    <div className="card rounded-3xl overflow-hidden animate-fade-in-up">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50/60 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ocean-50 to-brand-50 border border-ocean-100 flex items-center justify-center text-2xl">
            {flag}
          </span>
          <div>
            <h4 className="font-display text-base font-extrabold text-ink">Essential guide to {country}</h4>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              {GUIDE_DATA[countryKey] ? "Customs, money, food, safety & more" : "Visa, safety, transport and etiquette"}
            </p>
          </div>
        </div>
        <span
          className={`w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center text-xs transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="p-5 sm:p-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
          {sections.map((s) => (
            <div key={s.title} className="bg-slate-50/70 rounded-2xl p-4 border border-slate-100">
              <h5 className={`font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 ${s.color}`}>
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-sm ${s.bg}`}>
                  {s.icon}
                </span>
                {s.title}
              </h5>
              <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface ItineraryViewProps {
  trip: Trip;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
}

const SLOT_STYLES: Record<string, string> = {
  morning: "bg-sunset-50 text-sunset-700 border-sunset-200",
  afternoon: "bg-blue-50 text-blue-700 border-blue-200",
  evening: "bg-purple-50 text-purple-700 border-purple-200",
  lunch: "bg-ocean-50 text-ocean-700 border-ocean-200"
};

const weatherIcon = (day: TripDay): string => {
  const cond = (day.weather?.condition || "").toLowerCase().replace(/[^a-z]/g, "");
  return WEATHER_EMOJI[cond] || "🌤️";
};

export const ItineraryView: React.FC<ItineraryViewProps> = ({ trip, selectedDay, onSelectDay }) => {
  const totalCost = trip.days.reduce((acc, d) => acc + d.estimatedcost, 0);
  const budgetLimit = trip.budget?.dailybudget ? trip.budget.dailybudget * trip.days.length : 1000;

  const activeDayNumber = selectedDay || 1;
  const activeDay = trip.days.find((d) => d.day === activeDayNumber) || trip.days[0];

  return (
    <div className="space-y-5">
      {/* Trip Overview */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-slate-800 to-brand-900 text-white p-6 sm:p-8 animate-fade-in-up">
        <div className="absolute -right-16 -top-20 w-72 h-72 rounded-full bg-brand-500/25 blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-56 h-56 rounded-full bg-ocean-500/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-white/50 mb-2">
                Your journey
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span>{getFlagEmoji(trip.country || "")}</span>
                {trip.destination}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { icon: "🗓️", label: `${trip.startdate} → ${trip.enddate}` },
                  { icon: "🧍", label: `${trip.travelercount} traveler${trip.travelercount > 1 ? "s" : ""} · ${trip.travelertype}` },
                ].map((chip) => (
                  <span key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 border border-white/10 text-xs font-bold">
                    <span>{chip.icon}</span>
                    {chip.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-white/50">Est. total</p>
              <p className="font-display text-2xl font-extrabold text-ocean-300">
                {formatCurrency(totalCost, trip.budget?.currency)}
              </p>
            </div>
          </div>
          {trip.interests && trip.interests.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-white/40 mr-1 self-center">
                Interests
              </span>
              {trip.interests.map((interest) => (
                <span key={interest} className="px-2.5 py-1 rounded-full bg-gradient-to-r from-brand-500/40 to-ocean-500/40 border border-white/10 text-[11px] font-bold text-white/90">
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Budget Summary */}
      {trip.budget && (
        <BudgetSummary
          budget={trip.budget}
          totalLimit={budgetLimit}
          totalCost={totalCost}
          currency={trip.budget.currency || trip.days[0]?.activities[0]?.currency || "USD"}
          destination={trip.destination}
        />
      )}

      {/* Country Guide */}
      {trip.country && <CountryGuide country={trip.country} />}

      {/* Day selector */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {trip.days.map((day) => {
          const isActive = day.day === activeDayNumber;
          return (
            <button
              key={day.day}
              onClick={() => onSelectDay(day.day)}
              className={`shrink-0 px-4 py-3 rounded-2xl font-bold transition-all duration-200 whitespace-nowrap cursor-pointer flex flex-col items-center min-w-[104px] border ${
                isActive
                  ? "bg-gradient-to-br from-brand-600 to-brand-500 text-white border-transparent shadow-glow scale-[1.02]"
                  : "card hover:border-brand-200 text-slate-600 hover:text-brand-700 border-slate-200"
              }`}
            >
              <span className="text-sm">Day {day.day}</span>
              {day.weather && (
                <span className={`text-[11px] font-semibold mt-0.5 ${isActive ? "text-white/80" : "text-slate-400"}`}>
                  {weatherIcon(day)} {Math.round(day.weather.temphighc || 0)}°C
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active day header */}
      {activeDay && (
        <div className="card rounded-3xl p-5 sm:p-6 animate-fade-in-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-400">
                Day {activeDay.day} · {activeDay.date}
              </p>
              <h3 className="font-display text-xl font-extrabold text-ink capitalize mt-1">
                {activeDay.theme || `${activeDay.day === 1 ? "Arrival" : "Exploration"} & Highlights`}
              </h3>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-extrabold text-ocean-600">
                {formatCurrency(activeDay.estimatedcost, trip.budget?.currency)}
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Day estimate</p>
            </div>
          </div>

          {activeDay.weather && (
            <div className="mt-4 flex items-center gap-3 bg-gradient-to-r from-ocean-50 to-brand-50 p-3.5 rounded-2xl border border-ocean-100 text-ocean-800 text-xs">
              <span className="text-xl">{weatherIcon(activeDay)}</span>
              <div className="font-semibold">
                <span className="font-extrabold capitalize">{activeDay.weather.condition}</span>
                <span className="mx-2 opacity-50">|</span>
                <span>
                  {Math.round(activeDay.weather.templowc || 0)}°C – {Math.round(activeDay.weather.temphighc || 0)}°C
                  {activeDay.weather.precipitationchance ? ` · ${activeDay.weather.precipitationchance}% rain` : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {activeDay && activeDay.activities && activeDay.activities.length > 0 ? (
        <div className="relative pl-10 space-y-4">
          <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-brand-300 via-brand-200 to-ocean-200 rounded-full" />
          {activeDay.activities.map((act, idx) => {
            const slot = (act.timeslot || "").toLowerCase();
            const badgeStyle = SLOT_STYLES[slot] || SLOT_STYLES.morning;
            return (
              <div key={idx} className="relative group animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                <div className="absolute -left-10 top-4 flex items-center justify-center bg-gradient-to-br from-brand-600 to-brand-500 border-4 border-white text-white font-extrabold text-xs rounded-full w-9 h-9 shadow-soft group-hover:scale-110 transition-transform">
                  {idx + 1}
                </div>
                <div className="card card-hover rounded-2xl p-4 sm:p-5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${badgeStyle}`}>
                      {act.timeslot || `Stop ${idx + 1}`}
                    </span>
                    <div className="flex gap-2 text-[11px] text-slate-500 font-semibold">
                      {act.estimateddurationminutes ? (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100">⏳ {act.estimateddurationminutes} min</span>
                      ) : null}
                      <span className="px-2 py-0.5 rounded-lg bg-slate-100">
                        💰 {act.estimatedcost ? formatCurrency(act.estimatedcost, trip.budget?.currency) : "Free"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-display text-[15px] font-extrabold text-ink group-hover:text-brand-600 transition-colors">
                      {act.name}
                    </h4>
                    {act.category && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                        {act.category}
                      </span>
                    )}
                    {act.description && (
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{act.description}</p>
                    )}
                  </div>
                  {act.openinghours && (
                    <p className="text-[11px] text-slate-400 font-semibold">🕒 {act.openinghours}</p>
                  )}
                  {act.traveltonext && act.traveltonext.distancekm > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold pt-2.5 border-t border-slate-100">
                      <span className="w-6 h-6 rounded-lg bg-ocean-50 text-ocean-600 flex items-center justify-center text-xs">
                        {act.traveltonext.mode === "walk" ? "🚶" : "🚗"}
                      </span>
                      <span className="capitalize">{act.traveltonext.mode}</span> {act.traveltonext.distancekm} km ·{" "}
                      {act.traveltonext.durationminutes} min to next stop
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card rounded-3xl p-8 text-center text-sm text-slate-400 font-semibold">
          No activities planned for this day yet — ask the assistant to fill it in.
        </div>
      )}

      {/* Stepper */}
      <div className="flex justify-between items-center pt-3">
        <button
          disabled={activeDayNumber <= 1}
          onClick={() => onSelectDay(activeDayNumber - 1)}
          className="px-4 py-2.5 rounded-xl card hover:border-brand-300 text-slate-600 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1.5 cursor-pointer"
        >
          ← Prev Day
        </button>
        <div className="flex items-center gap-1.5">
          {trip.days.map((d) => (
            <span
              key={d.day}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                d.day === activeDayNumber ? "w-5 bg-brand-500" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
        <button
          disabled={activeDayNumber >= trip.days.length}
          onClick={() => onSelectDay(activeDayNumber + 1)}
          className="px-4 py-2.5 rounded-xl card hover:border-brand-300 text-slate-600 font-bold transition-all disabled:opacity-40 disabled:pointer-events-none text-xs flex items-center gap-1.5 cursor-pointer"
        >
          Next Day →
        </button>
      </div>
    </div>
  );
};
