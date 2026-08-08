import apiClient from "./client";
import { Trip } from "./types";

export async function listTrips(): Promise<any[]> {
  const res = await apiClient.get("/trips");
  return res.data;
}

export async function createTrip(trip: Trip): Promise<{ id: number }> {
  const res = await apiClient.post("/trips", trip);
  return res.data;
}

export async function getTrip(tripid: number): Promise<Trip> {
  const res = await apiClient.get(`/trips/${tripid}`);
  return res.data;
}

export async function deleteTrip(tripid: number): Promise<void> {
  await apiClient.delete(`/trips/${tripid}`);
}

export function getExportPdfUrl(tripid: number): string {
  const token = localStorage.getItem("token") || "";
  return `/api/trips/${tripid}/export/pdf?token=${encodeURIComponent(token)}`;
}
