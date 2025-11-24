from django.db import models
from django.contrib.auth.models import AbstractUser
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class User(AbstractUser):
    name = models.CharField(max_length=255, blank=True)
    token_expiration = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.username


class Review(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    movie_id = models.CharField(max_length=20, db_index=True)
    rating = models.FloatField(
        default=0,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "movie_id"], name="unique_review_per_user_and_movie"
            )
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Review(user={self.user_id}, movie={self.movie_id}, rating={self.rating})"


class Favourite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favourites")
    movie_id = models.CharField(max_length=20, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "movie_id"], name="unique_favourite_user_movie")
        ]
        ordering = ["id"]

    def __str__(self):
        return f"Favourite(user={self.user_id}, movie={self.movie_id})"


# for Creating list
class MovieList(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="movie_lists")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "name"], name="unique_list_name_per_user")
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"MovieList(user={self.user.username}, name={self.name})"


class MovieListItem(models.Model):
    movie_list = models.ForeignKey(MovieList, on_delete=models.CASCADE, related_name="items")
    movie_id = models.CharField(max_length=20, db_index=True)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["movie_list", "movie_id"], name="unique_movie_in_list")
        ]
        ordering = ["added_at"]

    def __str__(self):
        return f"MovieListItem(list={self.movie_list_id}, movie={self.movie_id})"


class Follow(models.Model):
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="following"
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="followers"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["from_user", "to_user"], name="unique_follow")
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"Follow({self.from_user_id} -> {self.to_user_id})"


class Watchlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="watchlist")
    movie_id = models.CharField(max_length=20, db_index=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["user", "movie_id"], name="unique_watchlist_user_movie")
        ]
        ordering = ["id"]

    def __str__(self):
        return f"Watchlist(user={self.user_id}, movie={self.movie_id})"
