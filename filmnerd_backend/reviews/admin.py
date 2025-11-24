from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("id", "user_id", "movie_id", "rating", "short_text", "created_at")
    search_fields = ("movie_id", "user_id", "text")
    list_filter = ("rating",)
    ordering = ("-created_at",)

    def short_text(self, obj):
        if not obj.text:
            return ""
        return (obj.text[:40] + "...") if len(obj.text) > 40 else obj.text

    short_text.short_description = "Review text"
