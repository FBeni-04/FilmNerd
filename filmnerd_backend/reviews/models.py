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
    text = models.TextField(blank=True)
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