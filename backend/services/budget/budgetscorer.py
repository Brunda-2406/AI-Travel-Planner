from typing import Dict, Any, List
import logging
from ..currency import to_usd_sync, from_usd_sync

logger = logging.getLogger("budget_scorer")

BUDGETALLOCATIONRATIOS = {
    "accommodation": 0.35,
    "food": 0.20,
    "transportation": 0.15,
    "activities": 0.20,
    "emergencybuffer": 0.10
}

# Average daily cost estimate per destination in USD
DESTINATION_COST_ESTIMATES = {
    "tokyo": 180.0,
    "paris": 220.0,
    "london": 230.0,
    "new york": 250.0,
    "goa": 70.0,
    "bali": 80.0,
    "rome": 170.0,
    "dubai": 210.0,
    "sydney": 190.0,
    "switzerland": 260.0
}

class BudgetScorer:
    @staticmethod
    def _daily_cost_estimate(destination: str) -> float:
        """Typical per-person daily cost (USD) for a destination; falls back to a generic estimate."""
        dest_key = destination.lower().strip()
        for k, v in DESTINATION_COST_ESTIMATES.items():
            if k in dest_key:
                return v
        return 120.0  # Default fallback

    @staticmethod
    def suggest(destination: str, days: int, travelers: int, currency: str) -> Dict[str, Any]:
        """Suggested comfortable budget (per day + overall trip) for the whole group,
        based on the destination's typical daily cost, converted into the user's currency."""
        total_days = max(1, days)
        total_travelers = max(1, travelers)
        daily_cost_estimate = BudgetScorer._daily_cost_estimate(destination)
        suggested_daily_usd = daily_cost_estimate * total_travelers
        suggested_daily = from_usd_sync(suggested_daily_usd, currency)
        return {
            "destinationcostestimate": daily_cost_estimate,
            "suggesteddailybudget": round(suggested_daily, 2),
            "suggestedtotalbudget": round(suggested_daily * total_days, 2),
        }

    @staticmethod
    def score(budget: float, currency: str, days: int, travelers: int, destination: str) -> Dict[str, Any]:
        daily_cost_estimate = BudgetScorer._daily_cost_estimate(destination)

        total_days = max(1, days)
        total_travelers = max(1, travelers)
        daily_budget = budget / total_days
        daily_budget_per_person = daily_budget / total_travelers

        # Convert daily budget per person to USD for accurate scoring (ANY currency)
        daily_budget_per_person_usd = to_usd_sync(daily_budget_per_person, currency)

        # Score calculation: 1.0 ratio = 5.0 score, 2.0 ratio = 10.0 score
        base_score = (daily_budget_per_person_usd / daily_cost_estimate) * 5.0
        score = round(min(10.0, max(0.1, base_score)), 1)

        # Comfort level
        if score >= 8.0:
            comfort_level = "Comfortable"
        elif score >= 5.0:
            comfort_level = "Moderate"
        elif score >= 3.0:
            comfort_level = "Budget"
        else:
            comfort_level = "Very Tight"

        # Allocation
        allocations = {}
        for key, ratio in BUDGETALLOCATIONRATIOS.items():
            allocations[key] = round(budget * ratio, 2)

        # Warnings
        warnings = []
        if comfort_level == "Very Tight":
            warnings.append(f"Your daily budget ({currency} {daily_budget_per_person:.2f}) is very tight for {destination}. Consider increasing your budget.")
        elif comfort_level == "Budget":
            warnings.append(f"Budget accommodation and dining choices will be necessary for this trip in {destination}.")
        
        if daily_budget_per_person < (daily_cost_estimate * 0.4):
            warnings.append("Accommodation budget may be tight for central hotels.")

        suggestion = BudgetScorer.suggest(destination, total_days, total_travelers, currency)

        return {
            "score": score,
            "comfortlevel": comfort_level,
            "totalbudget": budget,
            "dailybudget": round(daily_budget, 2),
            "dailybudgetperperson": round(daily_budget_per_person, 2),
            "currency": currency,
            "tripdurationdays": total_days,
            "allocation": allocations,
            "warnings": warnings,
            "destinationcostestimate": suggestion["destinationcostestimate"],
            "suggesteddailybudget": suggestion["suggesteddailybudget"],
            "suggestedtotalbudget": suggestion["suggestedtotalbudget"]
        }
