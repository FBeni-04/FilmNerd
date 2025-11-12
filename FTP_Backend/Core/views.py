from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import (
    User, Genre, Director, Actor, Movie, Critic,
    Watchlist, Favourite, Friendship, DirectorInMovie, ActorPlaysInMovie
)
from .serializers import (
    UserSerializer, GenreSerializer, DirectorSerializer, ActorSerializer,
    MovieSerializer, CriticSerializer, WatchlistSerializer, FavouriteSerializer,
    FriendshipSerializer
)


# --- Alap entitások ViewSet-jei (Egyszerű CRUD) ---

class GenreViewSet(viewsets.ModelViewSet):
    """Kezeli a műfajok listázását, létrehozását, frissítését és törlését."""
    queryset = Genre.objects.all().order_by('name')
    serializer_class = GenreSerializer


class DirectorViewSet(viewsets.ModelViewSet):
    """Kezeli a rendezők CRUD műveleteit."""
    queryset = Director.objects.all().order_by('name')
    serializer_class = DirectorSerializer
    # Mivel a PK varchar típusú ('director_id'), megadjuk a keresőmezőt
    lookup_field = 'director_id'


class ActorViewSet(viewsets.ModelViewSet):
    """Kezeli a színészek CRUD műveleteit."""
    queryset = Actor.objects.all().order_by('name')
    serializer_class = ActorSerializer
    # Mivel a PK varchar típusú ('actor_id'), megadjuk a keresőmezőt
    lookup_field = 'actor_id'


# --- Komplex entitások ViewSet-jei ---

class MovieViewSet(viewsets.ModelViewSet):
    """Kezeli a filmek CRUD műveleteit, beleértve a rendezők és színészek M2M kapcsolatát."""
    queryset = Movie.objects.all().order_by('title')
    serializer_class = MovieSerializer
    # Mivel a PK varchar típusú ('movie_id'), megadjuk a keresőmezőt
    lookup_field = 'movie_id'


class UserViewSet(viewsets.ModelViewSet):
    """Kezeli a felhasználók CRUD műveleteit (JELSZÓ KEZELÉS NÉLKÜL!)."""
    # Érdemes szűrni a felhasználókat, vagy beállítani az engedélyeket (permissions)
    # egy valós alkalmazásban!
    queryset = User.objects.all().order_by('username')
    serializer_class = UserSerializer


class CriticViewSet(viewsets.ModelViewSet):
    """Kezeli a kritikák CRUD műveleteit."""
    queryset = Critic.objects.all().order_by('-critics_id')
    serializer_class = CriticSerializer


# --- Kapcsolattartó ViewSet-ek (Ezek kezelik a M2M kapcsolatokat a User és a Movie között) ---

class WatchlistViewSet(viewsets.ModelViewSet):
    """Kezeli a nézőlisták bejegyzéseit (user-movie párosok)."""
    queryset = Watchlist.objects.all()
    serializer_class = WatchlistSerializer


class FavouriteViewSet(viewsets.ModelViewSet):
    """Kezeli a kedvencek bejegyzéseit (user-movie párosok)."""
    queryset = Favourite.objects.all()
    serializer_class = FavouriteSerializer


class FriendshipViewSet(viewsets.ModelViewSet):
    """Kezeli a barátság kapcsolatok létrehozását és törlését."""
    queryset = Friendship.objects.all().order_by('-created')
    serializer_class = FriendshipSerializer