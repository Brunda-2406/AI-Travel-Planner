import { usePlanningStore } from "../state/planningStore";

export const usePlanning = () => {
  const store = usePlanningStore();
  return {
    messages: store.messages,
    sessionid: store.sessionid,
    planningstate: store.planningstate,
    missingfields: store.missingfields,
    currentQuestion: store.currentQuestion,
    tripData: store.tripData,
    loading: store.loading,
    error: store.error,
    recommendations: store.recommendations,
    recommendationsLoading: store.recommendationsLoading,
    sendMessage: store.sendMessage,
    editTrip: store.editTrip,
    updateDayActivities: store.updateDayActivities,
    setTripData: store.setTripData,
    resetPlanning: store.resetPlanning,
    fetchRecommendations: store.fetchRecommendations,
    addPlace: store.addPlace,
    lockedCurrency: store.lockedCurrency,
    lockCurrency: store.lockCurrency,
    planTrip: store.planTrip
  };
};
