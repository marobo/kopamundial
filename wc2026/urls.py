from django.urls import include, path

urlpatterns = [
    path("", include("bracket.urls")),
]
