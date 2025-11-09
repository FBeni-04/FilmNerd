from django.contrib import admin
from .models import Movie

@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ("movie_id", "title", "genre_id", "rating")  # removed created_at
    search_fields = ("movie_id", "title")


