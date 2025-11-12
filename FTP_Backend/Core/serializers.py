from rest_framework import serializers
from .models import (
    User, Genre, Director, Actor, Movie, Critic,
    Watchlist, Favourite, Friendship, DirectorInMovie, ActorPlaysInMovie
)


# Feltételezve, hogy a 'User' modellt a .models fájlban definiáltad
# A 'User' modellt itt az aktuális app User modelljére hivatkozva használjuk

# --- 1. Alap entitások Serializerei ---

class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = '__all__'  # Minden mező: genre_id, name


class DirectorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Director
        fields = '__all__'  # Minden mező: director_id, name


class ActorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Actor
        fields = '__all__'  # Minden mező: actor_id, name


# --- 2. Kapcsolatkezelő Serializerek (Közvetítő táblák) ---

class WatchlistSerializer(serializers.ModelSerializer):
    # Itt a user és movie ID-ját kezeljük, de a külső nézetek
    # valószínűleg nem közvetlenül ezt használják.
    class Meta:
        model = Watchlist
        fields = '__all__'


class FavouriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favourite
        fields = '__all__'


# --- 3. Komplex entitások Serializerei ---

# A Movie Serializere, kibővítve a kapcsolatokkal
class MovieSerializer(serializers.ModelSerializer):
    # A genre_id helyett a genre nevét szeretnénk látni (READ műveletnél)
    # A write-only beállítás lehetővé teszi, hogy POST/PUT/PATCH-nél
    # elfogadja az ID-t, de GET-nél nem listázza.
    genre_name = serializers.CharField(source='genre.name', read_only=True)

    # A directors és actors M2M mezők ID-kat adnak vissza alapból, ami általában jó.
    # Ha szeretnéd, hogy a nevüket adja vissza, akkor használhatod a 'SlugRelatedField'-et,
    # de a ModelSerializer alapértelmezett beállítása (PrimaryKeyRelatedField) egyszerűbb.

    class Meta:
        model = Movie
        fields = [
            'movie_id',
            'title',
            'genre',  # Ez az ID, ami a POST-hoz kell (pl. genre: 5)
            'genre_name',  # Ez a név, amit GET-nél adunk vissza (pl. genre_name: "Dráma")
            'rating',
            'directors',  # director ID-k listája
            'actors',  # actor ID-k listája
        ]


class UserSerializer(serializers.ModelSerializer):
    # Itt beágyazzuk a M2M kapcsolatokat (listázza a kedvenc/nézőlistás filmek ID-it)
    # A 'source' a User modell M2M mezőire mutat
    watchlist_movies = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='watchlist')
    favourite_movies = serializers.PrimaryKeyRelatedField(many=True, read_only=True, source='favourites')

    class Meta:
        model = User
        # Csak a legfontosabb mezőket listázzuk, JELSZÓ NÉLKÜL!
        fields = [
            'id',
            'username',
            'email',
            'name',
            'token_expiration',
            'watchlist_movies',
            'favourite_movies',
            # A 'password' mezőt csak POST/PUT/PATCH esetén használjuk
        ]
        read_only_fields = ('token_expiration',)  # Ne lehessen API-n keresztül frissíteni


class CriticSerializer(serializers.ModelSerializer):
    # A film és a felhasználó neve beágyazva, hogy könnyebben olvasható legyen a kritika
    user_username = serializers.CharField(source='user.username', read_only=True)
    movie_title = serializers.CharField(source='movie.title', read_only=True)

    class Meta:
        model = Critic
        fields = [
            'critics_id',
            'user',  # A POST-hoz szükséges User ID
            'user_username',  # A GET-hez szükséges username
            'movie',  # A POST-hoz szükséges Movie ID
            'movie_title',  # A GET-hez szükséges movie title
            'rating',
            'text',
        ]
        # Egyedi validáció biztosítása, hogy egy user csak egyszer írhasson kritikát egy filmhez
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Critic.objects.all(),
                fields=['user', 'movie'],
                message="Már írtál kritikát ehhez a filmhez."
            )
        ]


class FriendshipSerializer(serializers.ModelSerializer):
    # A User ID-k helyett a felhasználók neveit szeretnénk látni (READ műveletnél)
    user1_username = serializers.CharField(source='user1.username', read_only=True)
    user2_username = serializers.CharField(source='user2.username', read_only=True)

    class Meta:
        model = Friendship
        fields = [
            'friend_id',
            'user1',
            'user1_username',
            'user2',
            'user2_username',
            'created'
        ]
        # Egyedi validáció, hogy a kapcsolat egyedi legyen (user1 -> user2 csak egyszer)
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Friendship.objects.all(),
                fields=['user1', 'user2'],
                message="Ez a barátság már létezik."
            )
        ]