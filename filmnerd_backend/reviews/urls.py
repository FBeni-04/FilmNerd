from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ReviewListCreateView,
    ReviewRetrieveUpdateDestroyView,
    UserWatchlistView,
    WatchlistViewSet,
    review_summary,
    LoginView,
    RegisterView,
    MeView,
    FavouriteViewSet,
    MovieListItemCreateView,
    MovieListItemDestroyView,
    MovieListViewSet,
    FollowCreateView,
    UnfollowView,
    FollowersListView,
    FollowingListView,
    FriendsListView,
    UserPublicProfileView,
    UserListsView,
    UserFavouritesView,
    UserReviewsView,
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

    # --- Social (Follow/Friends) ---
    path("social/follow/", FollowCreateView.as_view(), name="follow-create"),
    path("social/unfollow/<int:user_id>/", UnfollowView.as_view(), name="unfollow"),
    path("social/followers/", FollowersListView.as_view(), name="followers-list"),
    path("social/following/", FollowingListView.as_view(), name="following-list"),
    path("social/friends/", FriendsListView.as_view(), name="friends-list"),


    # --- Public user profile endpoints (NINCS 'api/' előtte!) ---
    path("users/<str:username>/", UserPublicProfileView.as_view(), name="user-public-profile"),
    path("users/<str:username>/lists/", UserListsView.as_view(), name="user-lists"),
    path("users/<str:username>/favourites/", UserFavouritesView.as_view(), name="user-favourites"),
    path("users/<str:username>/reviews/", UserReviewsView.as_view(), name="user-reviews"),
    path("users/<str:username>/watchlist/", UserWatchlistView.as_view(), name="user-watchlist"),

    # --- Watchlist ---
    path(
        "watchlist/exists/",
        WatchlistViewSet.as_view({"get": "exists"}),
        name="watchlist-exists"
    ),

    path(
        "watchlist/",
        WatchlistViewSet.as_view({"get": "list", "post": "create"}),
        name="watchlist-list-create"
    ),

    path(
        "watchlist/<str:movie_id>/",
        WatchlistViewSet.as_view({"delete": "destroy", "get": "retrieve"}),
        name="watchlist-rud"
    ),
]
