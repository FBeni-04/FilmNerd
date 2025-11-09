<<<<<<< HEAD
from django.urls import path, include

urlpatterns = [
    path("api/", include("reviews.urls")),
=======
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("movies.urls")),
>>>>>>> b91a7bc283e843188e618488ecbbb928d391b0fc
]
