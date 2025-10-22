from django.contrib import admin
from django.contrib.auth.models import Group

from Core.models import Movie, Genre, Favourite, User, Friendship, Director, Critic, Actor, ActorPlaysInMovie, \
    DirectorInMovie

# Register your models here.
admin.site.register(Movie)
admin.site.register(Genre)
admin.site.register(Favourite)
admin.site.register(Friendship)
admin.site.register(User)
admin.site.register(Critic)
admin.site.register(Actor)
admin.site.register(Director)
admin.site.register(ActorPlaysInMovie)
admin.site.register(DirectorInMovie)