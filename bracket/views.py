import json
from pathlib import Path

from django.shortcuts import render


def _load_teams():
    path = Path(__file__).resolve().parent / "data" / "teams.json"
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def index(request):
    teams = _load_teams()
    return render(
        request,
        "bracket/index.html",
        {
            "teams_json": json.dumps(teams),
        },
    )
