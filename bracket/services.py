"""Bracket feeder map and winner propagation."""

from django.core.exceptions import ValidationError

from .models import Match, Team

FEEDERS = {}

for i in range(8):
    FEEDERS[f"r16-{i}"] = {"home": f"r32-{i * 2}", "away": f"r32-{i * 2 + 1}"}

for i in range(4):
    FEEDERS[f"qf-{i}"] = {"home": f"r16-{i * 2}", "away": f"r16-{i * 2 + 1}"}

FEEDERS["sf-0"] = {"home": "qf-0", "away": "qf-1"}
FEEDERS["sf-1"] = {"home": "qf-2", "away": "qf-3"}
FEEDERS["final"] = {"home": "sf-0", "away": "sf-1"}

SLOTS_BY_SOURCE = {}
for target_id, sources in FEEDERS.items():
    for slot, source_id in sources.items():
        SLOTS_BY_SOURCE.setdefault(source_id, []).append((target_id, slot))

ROUND_COUNTS = {"r32": 16, "r16": 8, "qf": 4, "sf": 2, "final": 1}


def all_match_ids():
    ids = []
    for round_key, count in ROUND_COUNTS.items():
        for i in range(count):
            ids.append("final" if round_key == "final" else f"{round_key}-{i}")
    return ids


def bracket_payload(is_staff=False):
    payload = {
        "matches": {
            match.match_id: match.to_dict()
            for match in Match.objects.select_related("home", "away", "winner")
        },
        "is_staff": is_staff,
    }
    if is_staff:
        payload["teams"] = [team.to_dict() for team in Team.objects.all()]
    return payload


def update_match_slot(match, field, team_code):
    team = None
    if team_code:
        team = Team.objects.get(code=team_code)

    if field in {"home", "away"}:
        if match.round != Match.ROUND_R32:
            raise ValidationError("Teams can only be assigned in Round of 32.")
        setattr(match, field, team)
        if match.winner and match.winner not in (match.home, match.away):
            match.winner = None
    elif field == "winner":
        if team and team not in (match.home, match.away):
            raise ValidationError("Winner must be the home or away team.")
        if not match.home or not match.away:
            raise ValidationError("Both teams must be set before picking a winner.")
        match.winner = None if match.winner == team else team

    match.save()


def propagate_winner(match):
    """Push a match winner into downstream home/away slots."""
    updates = SLOTS_BY_SOURCE.get(match.match_id, [])
    for target_id, slot in updates:
        try:
            target = Match.objects.get(match_id=target_id)
        except Match.DoesNotExist:
            continue

        new_team = match.winner
        current = getattr(target, slot)
        if current == new_team:
            continue

        setattr(target, slot, new_team)
        if target.winner and target.winner not in (target.home, target.away):
            target.winner = None
        target.save()
