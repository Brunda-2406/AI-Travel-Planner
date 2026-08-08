export interface User {
  id: number;
  email: string;
}

export interface Activity {
  name: string;
  category: string;
  description?: string;
  coordinates: { lat: number; lng: number };
  estimateddurationminutes?: number;
  estimatedcost?: number;
  currency?: string;
  openinghours?: string;
  bookingnotes?: string;
  timeslot?: string;
  traveltonext?: {
    mode: string;
    durationminutes: number;
    distancekm: number;
  };
}

export interface TripDay {
  day: number;
  date: string;
  theme?: string;
  estimatedcost: number;
  weather?: {
    condition: string;
    temphighc: number;
    templowc: number;
    precipitationchance: number;
  };
  route?: Array<{ lat: number; lng: number; label: string }>;
  route_geometry?: Array<{ lat: number; lng: number }>;
  route_alternative?: Array<{ lat: number; lng: number }>;
  route_distance_km?: number;
  route_duration_min?: number;
  activities: Activity[];
}

export interface BudgetInfo {
  score: number;
  comfortlevel: string;
  totalbudget?: number;
  dailybudget: number;
  dailybudgetperperson?: number;
  currency: string;
  allocation: {
    accommodation: number;
    food: number;
    transportation: number;
    activities: number;
    emergencybuffer: number;
  };
  warnings: string[];
  destinationcostestimate?: number;
  suggesteddailybudget?: number;
  suggestedtotalbudget?: number;
}

export interface RouteSummary {
  total_distance_km: number;
  optimized: boolean;
  routing_method: string;
}

export interface Trip {
  tripid: number | null;
  destination: string;
  country: string;
  startdate: string;
  enddate: string;
  travelercount: number;
  travelertype: string;
  interests: string[];
  days: TripDay[];
  budget?: BudgetInfo;
}

export interface GenerateResponse {
  status: "success" | "needsmoreinfo" | "error";
  intent?: string;
  question?: string;
  missingfields?: string[];
  planningstate?: any;
  sessionid?: string;
  tripid?: number | null;
  trip?: Trip;
  budget?: BudgetInfo;
  routesummary?: RouteSummary;
  answer?: string;
}
