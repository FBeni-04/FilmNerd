from django.db.models import Avg, Count
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Review
from .serializers import ReviewSerializer

# Most még nincs auth – a user_id fixen 1
FIXED_USER_ID = 1

class ReviewListCreateView(generics.ListCreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Review.objects.all().order_by("-created_at")
        movie_id = self.request.query_params.get("movie_id")
        if movie_id:
            qs = qs.filter(movie_id=movie_id)
        return qs

    def perform_create(self, serializer):
        # Ha már létezik (user_id, movie_id), akkor update helyett hibát dobna az unique – kezeljük szépen:
        movie_id = self.request.data.get("movie_id")
        rating = self.request.data.get("rating")
        text = self.request.data.get("text")

        existing = Review.objects.filter(user_id=FIXED_USER_ID, movie_id=movie_id).first()
        if existing:
            existing.rating = float(rating)
            existing.text = text
            existing.save()
            return  # ListCreateAPIView úgyis visszaadná az eredeti instance-t, ezért inkább átirányítunk a create vége felé

        serializer.save(user_id=FIXED_USER_ID)

    def create(self, request, *args, **kwargs):
        # fenti perform_create “update-eli” ha már van – itt ezt kezeljük visszatérési oldalon
        movie_id = request.data.get("movie_id")
        existing = Review.objects.filter(user_id=FIXED_USER_ID, movie_id=movie_id).first()
        if existing:
            ser = self.get_serializer(existing)
            headers = self.get_success_headers(ser.data)
            return Response(ser.data, status=status.HTTP_200_OK, headers=headers)
        return super().create(request, *args, **kwargs)

class ReviewRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [permissions.AllowAny]

    def perform_update(self, serializer):
        # user_id stabilan 1 marad
        serializer.save(user_id=FIXED_USER_ID)

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
        "movie_id": int(movie_id),
        "count": agg["count"] or 0,
        "avg": round(agg["avg"] or 0, 1),
    })
