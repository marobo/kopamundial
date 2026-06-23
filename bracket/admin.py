from django.contrib import admin

from .models import Match, Team
from .services import propagate_winner


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("code", "name")
    search_fields = ("code", "name")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("match_id", "round", "home", "away", "winner")
    list_filter = ("round",)
    search_fields = ("match_id", "home__name", "away__name", "winner__name")
    autocomplete_fields = ("home", "away", "winner")

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.winner_id:
            propagate_winner(obj)
