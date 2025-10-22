# models.py

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings


# --- Felhasználói modell ---
# Az AbstractUser modellt bővítjük, hogy megkapjuk a Django beépített
# hitelesítési funkcióit (username, email, password kezelés stb.)
class User(AbstractUser):
    """
    Kibővített felhasználói modell.
    Az 'id' (PK), 'username', 'email', 'password_encrypted' (password)
    mezőket az AbstractUser kezeli.
    """
    # Az ERD-ben szereplő 'name' mező
    name = models.CharField(max_length=255, blank=True)

    # Az ERD-ben szereplő 'token_expiration' (int)
    token_expiration = models.IntegerField(null=True, blank=True)

    # M2M kapcsolat a filmekhez a 'watchlist' táblán keresztül
    watchlist = models.ManyToManyField(
        'Movie',
        through='Watchlist',
        related_name='watchlisted_by'
    )

    # M2M kapcsolat a filmekhez a 'favourite' táblán keresztül
    favourites = models.ManyToManyField(
        'Movie',
        through='Favourite',
        related_name='favourited_by'
    )

    # A 'friendship' kapcsolatot a 'Friendship' modell kezeli.
    # A 'friends' M2M mező helyett érdemesebb közvetlenül
    # a 'Friendship' modellt lekérdezni a 'related_name' segítségével.

    def __str__(self):
        return self.username


# --- Alap entitások ---

class Genre(models.Model):
    """
    Film műfajok táblája.
    """
    # Az ERD-nek megfelelően 'genre_id' az elsődleges kulcs
    genre_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Director(models.Model):
    """
    Rendezők táblája.
    """
    # Az ERD-nek megfelelően 'director_id' (varchar) az elsődleges kulcs
    director_id = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class Actor(models.Model):
    """
    Színészek táblája.
    """
    # Az ERD-nek megfelelően 'actor_id' (varchar) az elsődleges kulcs
    actor_id = models.CharField(primary_key=True, max_length=50)
    name = models.CharField(max_length=255)

    def __str__(self):
        return self.name


class Movie(models.Model):
    """
    Filmek táblája.
    """
    # Az ERD-nek megfelelően 'movie_id' (varchar) az elsődleges kulcs
    movie_id = models.CharField(primary_key=True, max_length=50)
    title = models.CharField(max_length=255)

    # Kapcsolat a műfajhoz (az ERD-ben 'genre_id')
    genre = models.ForeignKey(
        Genre,
        on_delete=models.PROTECT,  # Védjük a műfajt a törléstől, ha film hivatkozik rá
        related_name='movies'
    )

    # Az ERD-ben 'rating' (int)
    rating = models.IntegerField(null=True, blank=True)  # Pl. átlagértékelés

    # M2M kapcsolatok a 'through' modellekkel
    directors = models.ManyToManyField(
        Director,
        through='DirectorInMovie',
        related_name='movies'
    )

    actors = models.ManyToManyField(
        Actor,
        through='ActorPlaysInMovie',
        related_name='movies'
    )

    def __str__(self):
        return self.title


# --- Kapcsolótáblák (Junction / Through Models) ---

class Critic(models.Model):
    """
    Kritikák táblája (critics).
    """

    # Értékelési lehetőségek az 'enum'-ra
    class RatingChoices(models.IntegerChoices):
        ONE = 1, '1 Csillag'
        TWO = 2, '2 Csillag'
        THREE = 3, '3 Csillag'
        FOUR = 4, '4 Csillag'
        FIVE = 5, '5 Csillag'
        # ... igény szerint bővíthető 10-ig

    # Az ERD-nek megfelelően 'critics_id' az elsődleges kulcs
    critics_id = models.AutoField(primary_key=True)

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,  # Hivatkozás a User modellre
        on_delete=models.CASCADE,  # Ha a user törlődik, a kritikája is
        related_name='critics'
    )
    movie = models.ForeignKey(
        Movie,
        on_delete=models.CASCADE,  # Ha a film törlődik, a kritikája is
        related_name='critics'
    )

    rating = models.IntegerField(choices=RatingChoices.choices)

    # Az ERD 'text' (varchar) mezője, de a TextField praktikusabb
    text = models.TextField(blank=True, null=True)

    class Meta:
        # Egy felhasználó csak egyszer értékelhessen egy filmet
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"Kritika: {self.user.username} - {self.movie.title}"


class Watchlist(models.Model):
    """
    'Nézőlista' kapcsolótábla.
    """
    # Az ERD-nek megfelelően 'id' az elsődleges kulcs
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='watch_items')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'movie')  # Egyedi párosok


class Favourite(models.Model):
    """
    'Kedvencek' kapcsolótábla.
    """
    # Az ERD-nek megfelelően 'id' az elsődleges kulcs
    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='favourite_items')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('user', 'movie')  # Egyedi párosok


class Friendship(models.Model):
    """
    'Barátság' kapcsolat táblája.
    """
    # Az ERD-nek megfelelően 'friend_id' az elsődleges kulcs
    friend_id = models.AutoField(primary_key=True)

    # Az ERD 'user1' és 'user2' mezői
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friendship_creator_set'  # Aki kezdeményezte/küldte
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='friendship_receiver_set'  # Akinek küldték
    )

    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        # A kapcsolat egyedi (user1 -> user2 csak egyszer létezhet)
        unique_together = ('user1', 'user2')


class DirectorInMovie(models.Model):
    """
    Rendező-film kapcsolótábla.
    """
    # Az ERD-nek megfelelően 'id' az elsődleges kulcs
    id = models.AutoField(primary_key=True)
    director = models.ForeignKey(Director, on_delete=models.CASCADE)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('director', 'movie')


class ActorPlaysInMovie(models.Model):
    """
    Színész-film kapcsolótábla.
    """
    # Az ERD-nek megfelelően 'id' az elsődleges kulcs
    id = models.AutoField(primary_key=True)
    actor = models.ForeignKey(Actor, on_delete=models.CASCADE)
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE)

    class Meta:
        unique_together = ('actor', 'movie')