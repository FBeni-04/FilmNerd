from django.db import models

class Review(models.Model):
    user_id = models.BigIntegerField()
    movie_id = models.BigIntegerField(db_index=True)
    rating = models.FloatField()  # 1.0–5.0
    text = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user_id", "movie_id")
        indexes = [
            models.Index(fields=["movie_id"]),
            models.Index(fields=["user_id"]),
        ]

    def __str__(self):
        return f"Review(user={self.user_id}, movie={self.movie_id}, rating={self.rating})"
