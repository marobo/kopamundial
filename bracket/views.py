import json

from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_GET, require_POST

from .models import Match, Team
from .services import bracket_payload, propagate_winner, update_match_slot


def index(request):
    return render(request, "bracket/index.html")


@require_GET
def bracket_api(request):
    return JsonResponse(bracket_payload(request.user.is_staff))


@require_POST
@staff_member_required
def match_update_api(request):
    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    match_id = data.get("match_id")
    field = data.get("field")
    team_code = data.get("team_code")

    if not match_id or field not in {"home", "away", "winner"}:
        return JsonResponse({"error": "Invalid match_id or field."}, status=400)

    try:
        match = Match.objects.select_related("home", "away", "winner").get(
            match_id=match_id
        )
    except Match.DoesNotExist:
        return JsonResponse({"error": "Match not found."}, status=404)

    try:
        update_match_slot(match, field, team_code)
    except ValidationError as exc:
        message = exc.messages[0] if hasattr(exc, "messages") and exc.messages else str(exc)
        return JsonResponse({"error": message}, status=400)
    except Team.DoesNotExist:
        return JsonResponse({"error": "Team not found."}, status=400)

    if field == "winner":
        propagate_winner(match)

    return JsonResponse(bracket_payload(True))
