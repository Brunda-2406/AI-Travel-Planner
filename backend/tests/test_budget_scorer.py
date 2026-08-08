from backend.services.budget.budgetscorer import BudgetScorer

def test_budget_scorer():
    res = BudgetScorer.score(
        budget=1000.0,
        currency="USD",
        days=5,
        travelers=2,
        destination="Tokyo"
    )
    assert res["tripdurationdays"] == 5
    assert res["dailybudget"] == 200.0
    assert res["totalbudget"] == 1000.0
    assert res["dailybudgetperperson"] == 100.0
    assert "allocation" in res
    assert "warnings" in res
    assert "comfortlevel" in res
    assert res["destinationcostestimate"] == 180.0  # Tokyo
    assert res["suggesteddailybudget"] == 360.0     # 180 USD/day * 2 travelers
    assert res["suggestedtotalbudget"] == 1800.0    # * 5 days
