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

from .models import Review, Favourite
from .serializers import ReviewSerializer, RegisterSerializer, LoginSerializer, MeSerializer, FavouriteSerializer
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
        # JOIN a userre, legújabb elöl
        qs = Review.objects.select_related("user").order_by("-created_at")
        movie_id = self.request.query_params.get("movie_id")
        if movie_id:
            qs = qs.filter(movie_id=movie_id)
        return qs

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
