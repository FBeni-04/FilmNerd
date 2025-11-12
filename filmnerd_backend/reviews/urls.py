from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReviewListCreateView,
    ReviewRetrieveUpdateDestroyView,
    review_summary,
    LoginView,
    RegisterView,
    MeView,
    FavouriteViewSet,
    MovieListItemCreateView,
    MovieListItemDestroyView,
    MovieListViewSet
)

router = DefaultRouter()

router.register(r'lists', MovieListViewSet, basename='movielist')

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

    # --- CreatingList ---
    path('lists/<int:list_pk>/items/', 
         MovieListItemCreateView.as_view(), 
         name='listitem-create'),
         
    path('lists/<int:list_pk>/items/<str:movie_id>/', 
         MovieListItemDestroyView.as_view(), 
         name='listitem-destroy'),
    path('',include(router.urls)),
]
