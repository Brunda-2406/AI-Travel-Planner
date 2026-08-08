import asyncio
import pytest
from backend.services.itinerary.editor import ItineraryEditor


def _sample_itinerary():
    return {
        "destination": "Goa",
        "country": "India",
        "startdate": "2026-11-01",
        "enddate": "2026-11-03",
        "travelercount": 2,
        "travelertype": "couple",
        "interests": ["food"],
        "budget": {
            "score": 5.0,
            "comfortlevel": "Moderate",
            "totalbudget": 50000.0,
            "dailybudget": 16666.67,
            "dailybudgetperperson": 8333.33,
            "currency": "INR",
            "allocation": {},
            "warnings": []
        },
        "days": [
            {
                "day": 1, "date": "2026-11-01", "theme": "Beaches",
                "activities": [
                    {"name": "Baga Beach", "timeslot": "morning", "estimatedcost": 100.0,
                     "coordinates": {"lat": 15.55, "lng": 73.75}, "currency": "INR"},
                    {"name": "Fort Aguada", "timeslot": "afternoon", "estimatedcost": 200.0,
                     "coordinates": {"lat": 15.49, "lng": 73.77}, "currency": "INR"}
                ]
            },
            {
                "day": 2, "date": "2026-11-02", "theme": "Old Goa",
                "activities": [
                    {"name": "Basilica of Bom Jesus", "timeslot": "morning", "estimatedcost": 0.0,
                     "coordinates": {"lat": 15.5, "lng": 73.91}, "currency": "INR"},
                    {"name": "Anjuna Flea Market", "timeslot": "afternoon", "estimatedcost": 300.0,
                     "coordinates": {"lat": 15.57, "lng": 73.74}, "currency": "INR"}
                ]
            }
        ]
    }


@pytest.fixture(autouse=True)
def _no_osrm(monkeypatch):
    """Keep tests offline: skip the real OSRM road-routing network call."""

    async def fake_enrich(day):
        return day

    monkeypatch.setattr("backend.services.maps.routing.RoutingService.enrich_day_route", fake_enrich)


def _run(coro):
    return asyncio.run(coro)


def test_update_budget():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {"operation": "updatebudget", "budget": 80000}))
    assert res["budget"]["totalbudget"] == 80000.0
    assert "Budget updated to INR 80,000.00" in res["_edit_summary"][0]


def test_update_currency_converts_prices():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {"operation": "updatecurrency", "currency": "USD"}))
    assert res["budget"]["currency"] == "USD"
    # 50000 INR ~= 50000/83.5 ~= 599 USD
    assert 500 < res["budget"]["totalbudget"] < 700
    # per-activity costs converted too (100 INR -> ~1.2 USD)
    assert res["days"][0]["activities"][0]["estimatedcost"] < 10
    assert "converted" in res["_edit_summary"][0].lower()


def test_update_dates_shifts_days():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "updatedates",
        "startdate": "2026-12-10",
        "enddate": "2026-12-14"
    }))
    assert res["startdate"] == "2026-12-10"
    assert res["enddate"] == "2026-12-14"
    assert res["days"][0]["date"] == "2026-12-10"
    assert res["days"][1]["date"] == "2026-12-11"


def test_update_dates_extends_trip_to_new_span():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "updatedates",
        "startdate": "2026-11-01",
        "enddate": "2026-11-05"
    }))
    assert len(res["days"]) == 5  # 2 -> 5 days
    assert res["days"][2]["day"] == 3
    assert res["days"][4]["date"] == "2026-11-05"
    assert res["days"][2]["activities"]  # new day has real activities
    assert any("Added 3 new day(s)" in s for s in res["_edit_summary"])
    # budget re-split across 5 days: 50000 / 5 = 10000
    assert res["budget"]["dailybudget"] == pytest.approx(10000.0, abs=1)


def test_update_dates_trims_trip():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "updatedates",
        "startdate": "2026-11-01",
        "enddate": "2026-11-01"
    }))
    assert len(res["days"]) == 1
    assert res["days"][0]["day"] == 1
    assert res["days"][0]["date"] == "2026-11-01"
    assert any("Removed 1 day(s)" in s for s in res["_edit_summary"])
    # budget re-split across 1 day
    assert res["budget"]["dailybudget"] == pytest.approx(50000.0, abs=1)


def test_update_days_count_derives_end_date():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "updatedates",
        "startdate": "2026-11-01",
        "days": 4
    }))
    assert res["enddate"] == "2026-11-04"
    assert len(res["days"]) == 4


def test_update_travelers_rescores():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {"operation": "updatetravelers", "travelercount": 4}))
    assert res["travelercount"] == 4
    assert res["budget"]["dailybudgetperperson"] == pytest.approx(6250.0, abs=1)  # 50000 / 2 days / 4


def test_remove_day_renumbers():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {"operation": "removeday", "day": 2}))
    assert len(res["days"]) == 1
    assert res["days"][0]["day"] == 1
    assert "Removed Day 2" in res["_edit_summary"][0]


def test_remove_activity_by_name():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "removeactivity", "day": 1, "target": "Aguada"
    }))
    names = [a["name"] for a in res["days"][0]["activities"]]
    assert "Fort Aguada" not in names
    assert "Baga Beach" in names


def test_move_activity_between_days():
    it = _sample_itinerary()
    res = _run(ItineraryEditor.apply_edit(it, {
        "operation": "moveactivity", "fromday": 1, "day": 2,
        "target": "Fort Aguada", "timeslot": "evening"
    }))
    day1_names = [a["name"] for a in res["days"][0]["activities"]]
    day2_names = [a["name"] for a in res["days"][1]["activities"]]
    assert "Fort Aguada" not in day1_names
    assert "Fort Aguada" in day2_names
    assert "Moved Fort Aguada" in res["_edit_summary"][0]


def test_rule_based_parse():
    assert ItineraryEditor._rule_based_parse("increase the budget to 5000") == {
        "operation": "updatebudget", "budget": 5000.0
    }
    assert ItineraryEditor._rule_based_parse("remove day 3") == {"operation": "removeday", "day": 3}
    assert ItineraryEditor._rule_based_parse("change the currency to usd") == {
        "operation": "updatecurrency", "currency": "USD"
    }
    assert ItineraryEditor._rule_based_parse("change the dates to 2026-09-10 to 2026-09-14") == {
        "operation": "updatedates", "startdate": "2026-09-10", "enddate": "2026-09-14"
    }
    assert ItineraryEditor._rule_based_parse("make it 4 travelers")["operation"] == "updatetravelers"
    assert ItineraryEditor._rule_based_parse("change the days to 8 days") == {
        "operation": "updatedates", "days": 8
    }
    assert ItineraryEditor._rule_based_parse("make the trip 7 days")["operation"] == "updatedates"
    assert ItineraryEditor._rule_based_parse("8 days") == {"operation": "updatedates", "days": 8}
    assert ItineraryEditor._rule_based_parse("remove the fort aguada")["operation"] == "removeactivity"
    assert ItineraryEditor._rule_based_parse("change the destination to bali") == {
        "operation": "updatedestination", "destination": "Bali"
    }
