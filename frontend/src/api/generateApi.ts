import apiClient from "./client";
import { GenerateResponse, Trip } from "./types";

export async function generate(
  message: string,
  sessionid?: string,
  planningstate?: any,
  history?: any[],
  itinerary?: any,
  tripid?: number | null,
  currency?: string
): Promise<GenerateResponse> {
  const res = await apiClient.post<GenerateResponse>("/generate", {
    message,
    sessionid,
    planningstate,
    history,
    itinerary,
    tripid,
    currency
  });
  return res.data;
}

export async function chatEdit(tripid: number, message: string): Promise<any> {
  const res = await apiClient.post("/chat-edit", { tripid, message });
  return res.data;
}

export interface RecommendedPlace {
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  openinghours?: string | null;
  description?: string;
  estimatedcost?: number;
  estimateddurationminutes?: number;
}

export async function recommendPlaces(
  destination: string,
  interests: string[] = [],
  count: number = 30,
  currency: string = "USD"
): Promise<{ status: string; places: RecommendedPlace[]; currency?: string }> {
  const res = await apiClient.post("/recommend", { destination, interests, count, currency });
  return res.data;
}

export async function addPlaceToTrip(payload: {
  tripid?: number | null;
  itinerary?: any;
  day: number;
  place: RecommendedPlace;
}): Promise<any> {
  const res = await apiClient.post("/add-place", payload);
  return res.data;
}

export async function updateDay(
  tripid: number,
  day: number,
  activities: any[]
): Promise<{ status: string; trip: Trip }> {
  const res = await apiClient.post("/update-day", { tripid, day, activities });
  return res.data;
}
