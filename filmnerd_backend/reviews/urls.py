from django.urls import path
from .views import ReviewListCreateView, ReviewRetrieveUpdateDestroyView, review_summary

urlpatterns = [
    path("reviews/", ReviewListCreateView.as_view(), name="review-list-create"),
    path("reviews/<int:pk>/", ReviewRetrieveUpdateDestroyView.as_view(), name="review-rud"),
    path("reviews/summary/", review_summary, name="review-summary"),
]
