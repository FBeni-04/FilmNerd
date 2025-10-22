from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Hozz létre egy routert
router = DefaultRouter()

# Regisztráld a Movie ViewSet-et 'movies' néven
# Ez automatikusan létrehozza:
# /movies/ (GET, POST)
# /movies/{movie_id}/ (GET, PUT, PATCH, DELETE)
router.register(r'users', views.UserViewSet)
router.register(r'genres', views.GenreViewSet)
router.register(r'directors', views.DirectorViewSet)
router.register(r'actors', views.ActorViewSet)
router.register(r'movies', views.MovieViewSet)
router.register(r'critics', views.CriticViewSet)

# Kapcsolódó táblák regisztrálása (pl. barátságok, kedvencek listázása, hozzáadása)
router.register(r'watchlist', views.WatchlistViewSet)
router.register(r'favourites', views.FavouriteViewSet)
router.register(r'friendships', views.FriendshipViewSet)

# A fő urlpatterns most már tartalmazza a router által generált URL-eket
urlpatterns = [
    path('api/', include(router.urls)),
    # ... ide jöhetnek a klasszikus Django URL-ek, ha kellenek
]