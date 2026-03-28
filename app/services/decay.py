from app.models.schemas import DecayPoint


def simulate_decay() -> list[DecayPoint]:
    return [
        DecayPoint(year=2026, level=100),
        DecayPoint(year=2030, level=70),
        DecayPoint(year=2034, level=50),
    ]
