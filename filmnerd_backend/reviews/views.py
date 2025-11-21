# reviews/views.py
from django.db.models import Avg, Count
from django.db import transaction
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.decorators import api_view, action
from datetime import timedelta
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import NotFound

from .models import Review, Favourite, MovieList, MovieListItem, Follow, Watchlist
from .serializers import (ReviewSerializer, RegisterSerializer, LoginSerializer, MeSerializer, 
                          FavouriteSerializer, MovieListCreateUpdateSerializer, MovieListItemCreateSerializer, MovieListSerializer,
                          FollowSerializer, FollowCreateSerializer, UserPublicSerializer, WatchlistSerializer)
from .permissions import IsOwnerOrReadOnly

User = get_user_model()

def set_expiration(user):
    lifetime = timedelta(days=7)
    user.token_expiration = timezone.now() + lifetime
    user.save(update_fields=["token_expiration"])


# --- Auth ---
class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        ser = RegisterSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.save()
        refresh = RefreshToken.for_user(user)
        set_expiration(user)
        return Response({
            "user": MeSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    def post(self, request):
        ser = LoginSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        set_expiration(user)
        return Response({
            "user": MeSerializer(user).data,
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        })

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        return Response(MeSerializer(request.user).data)


# --- Reviews ---
class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = Review.objects.all()
        movie_id = self.request.query_params.get("movie_id")
        mine = self.request.query_params.get("mine")

        if movie_id:
            qs = qs.filter(movie_id=movie_id)

        if mine in ("1", "true", "True") and self.request.user.is_authenticated:
            qs = qs.filter(user=self.request.user)

        return qs.order_by("-created_at")

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Idempotens: (user, movie_id) egyediség – ha létezik, frissítjük.
        """
        user = self.request.user
        if not user.is_authenticated:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Bejelentkezés szükséges.")

        movie_id = self.request.data.get("movie_id")
        rating   = self.request.data.get("rating")
        text     = self.request.data.get("text")

        # update_or_create a tisztább megoldás
        obj, created = Review.objects.update_or_create(
            user=user,
            movie_id=movie_id,
            defaults={
                "rating": float(rating) if rating is not None else 0,
                "text": (text or "").strip(),
            },
        )
        self.existing_instance = None if created else obj
        if created:
            # ha új, a DRF serializerrel mentünk (hogy before/after hookok menjenek)
            serializer.instance = obj

    def create(self, request, *args, **kwargs):
        resp = super().create(request, *args, **kwargs)
        # ha létezőt frissítettünk, 200-zal és a friss példány adataival térünk vissza
        existing = getattr(self, "existing_instance", None)
        if existing is not None:
            ser = self.get_serializer(existing)
            headers = self.get_success_headers(ser.data)
            return Response(ser.data, status=status.HTTP_200_OK, headers=headers)
        return resp


class ReviewRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.select_related("user").all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]

    def perform_update(self, serializer):
        # Mindig a bejelentkezett user a tulaj; user-t külső változtatásra nem engedjük
        serializer.save(user=self.request.user)

class FavouriteViewSet(viewsets.ModelViewSet):
    queryset = Favourite.objects.all()
    serializer_class = FavouriteSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "movie_id"
    lookup_url_kwarg = "movie_id"

    def get_queryset(self):
        # Mindig csak az adott user kedvencei
        return Favourite.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        movie_id = request.data.get("movie_id")
        user = request.user

        fav, created = Favourite.objects.get_or_create(
            user=user,
            movie_id=movie_id
        )

        return Response({"created": created}, status=200)

    def destroy(self, request, movie_id=None, *args, **kwargs):
        Favourite.objects.filter(
            user=request.user,
            movie_id=movie_id
        ).delete()
        return Response(status=204)

    @action(detail=False, methods=["get"])
    def exists(self, request):
        movie_id = request.query_params.get("movie_id")
        exists = Favourite.objects.filter(
            user=request.user,
            movie_id=movie_id
        ).exists()
        return Response({"exists": exists})


@api_view(["GET"])
def review_summary(request):
    movie_id = request.query_params.get("movie_id")
    if not movie_id:
        return Response({"detail": "movie_id is required"}, status=400)

    agg = Review.objects.filter(movie_id=movie_id).aggregate(
        count=Count("id"),
        avg=Avg("rating"),
    )
    return Response({
        "movie_id": movie_id,              # ← ne erőltesd int-re
        "count": int(agg["count"] or 0),
        "avg": round((agg["avg"] or 0), 1),
    })

#List Creating views

class MovieListViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwnerOrReadOnly]

    def get_queryset(self):
        return MovieList.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return MovieListCreateUpdateSerializer
        return MovieListSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class MovieListItemCreateView(generics.CreateAPIView):
    serializer_class = MovieListItemCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        movie_list = get_object_or_404(MovieList, pk=self.kwargs['list_pk'])
        if movie_list.user != self.request.user:
            raise permissions.PermissionDenied("You do not own this list.")
        serializer.save(movie_list=movie_list)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            if 'unique_movie_in_list' in str(e):
                return Response(
                    {"error": "This movie is already in the list."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            raise e


class MovieListItemDestroyView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        list_pk = self.kwargs['list_pk']
        movie_id = self.kwargs['movie_id']
        movie_list = get_object_or_404(MovieList, pk=list_pk)
        if movie_list.user != self.request.user:
            raise permissions.PermissionDenied("You do not own this list.")
        item = get_object_or_404(MovieListItem, movie_list=movie_list, movie_id=movie_id)
        return item



# --- Social: Follow / Followers / Following / Friends ---
class FollowCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """
        Follow another user. Accepts either {"to_user": <id>} or {"to_user_id": <id>} or {"username": "name"}
        Returns created Follow or 200 if already exists.
        """
        payload = request.data or {}
        to_user = None
        to_user_id = payload.get("to_user") or payload.get("to_user_id")
        username = payload.get("username")
        if to_user_id:
            to_user = get_object_or_404(User, pk=to_user_id)
        elif username:
            to_user = get_object_or_404(User, username=username)
        else:
            return Response({"detail": "Provide to_user_id or username"}, status=status.HTTP_400_BAD_REQUEST)

        if to_user == request.user:
            return Response({"detail": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follow, created = Follow.objects.get_or_create(from_user=request.user, to_user=to_user)
        ser = FollowSerializer(follow)
        return Response({"created": created, "follow": ser.data}, status=status.HTTP_200_OK)


class UnfollowView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, user_id: int):
        Follow.objects.filter(from_user=request.user, to_user_id=user_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class FollowersListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(following__to_user=request.user).distinct()
        return Response(UserPublicSerializer(users, many=True).data)


class FollowingListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        users = User.objects.filter(followers__from_user=request.user).distinct()
        return Response(UserPublicSerializer(users, many=True).data)


class FriendsListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # mutual follows: user A follows B and B follows A
        following_ids = set(
            Follow.objects.filter(from_user=request.user).values_list("to_user_id", flat=True)
        )
        follower_ids = set(
            Follow.objects.filter(to_user=request.user).values_list("from_user_id", flat=True)
        )
        mutual_ids = list(following_ids.intersection(follower_ids))
        users = User.objects.filter(id__in=mutual_ids)
        return Response(UserPublicSerializer(users, many=True).data)
    

class UserPublicProfileView(generics.RetrieveAPIView):
    """
    GET /api/users/<username>/
    Csak a publikus adatokat adja vissza (username, name, bio stb.).
    """
    queryset = User.objects.all()
    serializer_class = UserPublicSerializer
    lookup_field = "username"
    permission_classes = [permissions.AllowAny]


class UsernameMixin:
    """
    Segéd mixin: URL-ből kiveszi a username-et,
    és leszűri rá a querysetet.
    """
    def get_user(self):
        username = self.kwargs.get("username")
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            raise NotFound("User not found")

    def get_queryset(self):
        user = self.get_user()
        return super().get_queryset().filter(user=user)


class UserListsView(UsernameMixin, generics.ListAPIView):
    """
    GET /api/users/<username>/lists/
    Az adott user MovieListjei.
    """
    serializer_class = MovieListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        base_qs = MovieList.objects.all()
        user = self.get_user()
        return base_qs.filter(user=user)


class UserFavouritesView(UsernameMixin, generics.ListAPIView):
    """
    GET /api/users/<username>/favourites/
    Az adott user kedvenc filmjei.
    """
    serializer_class = FavouriteSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        base_qs = Favourite.objects.all()
        user = self.get_user()
        return base_qs.filter(user=user)


class UserReviewsView(UsernameMixin, generics.ListAPIView):
    """
    GET /api/users/<username>/reviews/
    Az adott user review-i.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        base_qs = Review.objects.all()
        user = self.get_user()
        return base_qs.filter(user=user)
    
class WatchlistViewSet(viewsets.ModelViewSet):
    queryset = Watchlist.objects.all()
    serializer_class = WatchlistSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "movie_id"
    lookup_url_kwarg = "movie_id"

    def get_queryset(self):
        # Only show the current user's watchlist
        return Watchlist.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        movie_id = request.data.get("movie_id")
        user = request.user

        # Idempotent create (if it exists, just return success)
        obj, created = Watchlist.objects.get_or_create(
            user=user,
            movie_id=movie_id
        )
        return Response({"created": created}, status=200)

    def destroy(self, request, movie_id=None, *args, **kwargs):
        # Delete based on movie_id and current user
        Watchlist.objects.filter(
            user=request.user,
            movie_id=movie_id
        ).delete()
        return Response(status=204)

    @action(detail=False, methods=["get"])
    def exists(self, request):
        # Check if a specific movie is in the watchlist
        movie_id = request.query_params.get("movie_id")
        exists = Watchlist.objects.filter(
            user=request.user,
            movie_id=movie_id
        ).exists()
        return Response({"exists": exists})