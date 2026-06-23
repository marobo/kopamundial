import json

from django.core.exceptions import ValidationError
from django.db import models


class Team(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=100)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

    def to_dict(self):
        return {"code": self.code, "name": self.name}


class Match(models.Model):
    ROUND_R32 = "r32"
    ROUND_R16 = "r16"
    ROUND_QF = "qf"
    ROUND_SF = "sf"
    ROUND_FINAL = "final"

    ROUND_CHOICES = [
        (ROUND_R32, "Round of 32"),
        (ROUND_R16, "Round of 16"),
        (ROUND_QF, "Quarter Final"),
        (ROUND_SF, "Semi Final"),
        (ROUND_FINAL, "Final"),
    ]

    match_id = models.CharField(max_length=20, unique=True)
    round = models.CharField(max_length=10, choices=ROUND_CHOICES)
    slot = models.PositiveSmallIntegerField(default=0)
    home = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        related_name="home_matches",
        on_delete=models.SET_NULL,
    )
    away = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        related_name="away_matches",
        on_delete=models.SET_NULL,
    )
    winner = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        related_name="won_matches",
        on_delete=models.SET_NULL,
    )

    class Meta:
        ordering = ["round", "slot"]

    def __str__(self):
        home = self.home.code if self.home else "—"
        away = self.away.code if self.away else "—"
        return f"{self.match_id}: {home} vs {away}"

    def clean(self):
        if self.winner and self.winner not in (self.home, self.away):
            raise ValidationError({"winner": "Winner must be the home or away team."})

        if self.round == self.ROUND_R32 and (self.home or self.away):
            for team in (self.home, self.away):
                if not team:
                    continue
                duplicate = (
                    Match.objects.filter(round=self.ROUND_R32)
                    .exclude(pk=self.pk)
                    .filter(models.Q(home=team) | models.Q(away=team))
                    .exists()
                )
                if duplicate:
                    raise ValidationError(
                        f"{team.name} is already assigned to another Round of 32 match."
                    )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def to_dict(self):
        return {
            "home": self.home.to_dict() if self.home else None,
            "away": self.away.to_dict() if self.away else None,
            "winner": self.winner.code if self.winner else None,
        }
