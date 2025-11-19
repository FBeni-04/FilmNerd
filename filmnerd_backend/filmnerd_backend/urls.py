
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def root_view(request):
    return JsonResponse(
        {
            "detail": "FilmNerd API is running.",
            "endpoints": {
                "auth": "/api/auth/",
                "reviews": "/api/reviews/",
                "favourites": "/api/favourites/",
                "lists": "/api/lists/",
                "users": "/api/users/<username>/",
            },
        }
    )


urlpatterns = [
    path("", root_view, name="api-root"),
    path("admin/", admin.site.urls),
    path("api/", include("reviews.urls")),
]
