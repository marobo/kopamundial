from django.urls import path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("api/bracket/", views.bracket_api, name="bracket_api"),
    path("api/bracket/match/", views.match_update_api, name="match_update_api"),
]
