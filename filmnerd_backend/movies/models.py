from django.db import models

class Movie(models.Model):
    # Ez lesz az adatbázisban tárolt movie_id (amit a React is használ)
    movie_id = models.CharField(max_length=255, unique=True, db_index=True, primary_key=True)
    title    = models.CharField(max_length=255, blank=True, default="")
    genre_id = models.IntegerField(null=True, blank=True)
    rating   = models.FloatField(default=0)

    class Meta:
        db_table = "movies"
