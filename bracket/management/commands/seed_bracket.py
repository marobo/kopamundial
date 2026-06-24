import json
from pathlib import Path

from django.core.management.base import BaseCommand

from bracket.models import Match, Team
from bracket.services import ROUND_COUNTS, all_match_ids


class Command(BaseCommand):
    help = "Load teams from teams.json and create empty knockout matches."

    def handle(self, *args, **options):
        teams_path = Path(__file__).resolve().parents[2] / "data" / "teams.json"
        with teams_path.open(encoding="utf-8") as handle:
            teams_data = json.load(handle)

        for entry in teams_data:
            Team.objects.update_or_create(
                code=entry["code"],
                defaults={"name": entry["name"]},
            )

        for match_id in all_match_ids():
            if match_id == "final":
                round_key = Match.ROUND_FINAL
                slot = 0
            else:
                round_key, slot = match_id.split("-", 1)
                slot = int(slot)

            Match.objects.update_or_create(
                match_id=match_id,
                defaults={"round": round_key, "slot": slot},
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {Team.objects.count()} teams and {Match.objects.count()} matches."
            )
        )
