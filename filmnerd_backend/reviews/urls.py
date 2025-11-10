from django.urls import path
from .views import (
    ReviewListCreateView,
    ReviewRetrieveUpdateDestroyView,
    review_summary,
    LoginView,
    RegisterView,
    MeView,
    FavouriteViewSet
)

urlpatterns = [
    # --- Auth ---
    path("auth/register/", RegisterView.as_view()),
    path("auth/login/", LoginView.as_view()),
    path("auth/me/", MeView.as_view()),

    # --- Reviews ---
    path("reviews/", ReviewListCreateView.as_view()),
    path("reviews/<int:pk>/", ReviewRetrieveUpdateDestroyView.as_view()),
    path("reviews/summary/", review_summary),

    # --- Favourites ---
    path(
        "favourites/exists/",
        FavouriteViewSet.as_view({"get": "exists"}),
        name="favourite-exists"
    ),

    path(
        "favourites/",
        FavouriteViewSet.as_view({"get": "list", "post": "create"}),
        name="favourite-list-create"
    ),

    path(
        "favourites/<str:movie_id>/",
        FavouriteViewSet.as_view({"delete": "destroy", "get": "retrieve"}),
        name="favourite-rud"
    ),
]
