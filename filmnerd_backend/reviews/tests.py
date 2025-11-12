import math
from datetime import timedelta

from django.utils import timezone
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework import status

from .models import Review, Favourite  # app label assumed: reviews
from .views import (
    RegisterView, LoginView, MeView,
    ReviewListCreateView, ReviewRetrieveUpdateDestroyView,
    FavouriteViewSet, review_summary,
)

User = get_user_model()


class BaseAPITestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="alice", email="alice@example.com", password="pass123", name="Alice"
        )
        self.user2 = User.objects.create_user(
            username="bob", email="bob@example.com", password="pass123", name="Bob"
        )


class AuthTests(BaseAPITestCase):
    def test_register_sets_token_expiration_and_returns_jwt(self):
        view = RegisterView.as_view()
        req = self.factory.post(
            "/register",
            {
                "username": "newuser",
                "email": "n@u.com",
                "name": "New U",
                "password": "StrongPass!23",
            },
            format="json",
        )
        resp = view(req)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp.data)
        self.assertIn("refresh", resp.data)
        self.assertIn("user", resp.data)
        u = User.objects.get(username="newuser")
        # ~7 napos lejárat
        self.assertIsNotNone(u.token_expiration)
        delta = u.token_expiration - timezone.now()
        self.assertTrue(timedelta(days=6, hours=20) < delta < timedelta(days=7, hours=4))

    def test_login_success_and_failure(self):
        view = LoginView.as_view()

        bad = self.factory.post("/login", {"username": "alice", "password": "wrong"}, format="json")
        resp_bad = view(bad)
        self.assertEqual(resp_bad.status_code, status.HTTP_400_BAD_REQUEST)

        good = self.factory.post("/login", {"username": "alice", "password": "pass123"}, format="json")
        resp_ok = view(good)
        self.assertEqual(resp_ok.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp_ok.data)
        self.assertIn("refresh", resp_ok.data)

    def test_me_requires_auth(self):
        view = MeView.as_view()

        req_anon = self.factory.get("/me")
        resp_anon = view(req_anon)
        self.assertEqual(resp_anon.status_code, status.HTTP_401_UNAUTHORIZED)

        req_auth = self.factory.get("/me")
        force_authenticate(req_auth, user=self.user)
        resp_auth = view(req_auth)
        self.assertEqual(resp_auth.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_auth.data["username"], "alice")


class ReviewTests(BaseAPITestCase):
    def test_create_is_idempotent_update_or_create_returns_200_on_update(self):
        view = ReviewListCreateView.as_view()

        # első létrehozás
        req1 = self.factory.post(
            "/reviews",
            {"movie_id": "1359", "rating": 4, "text": "American Psycho rulez"},
            format="json",
        )
        force_authenticate(req1, user=self.user)
        resp1 = view(req1)
        self.assertEqual(resp1.status_code, status.HTTP_201_CREATED)
        r1 = Review.objects.get(user=self.user, movie_id="1359")
        self.assertEqual(r1.rating, 4)
        self.assertEqual(r1.text, "American Psycho rulez")

        # második POST ugyanarra → frissítés + 200
        req2 = self.factory.post(
            "/reviews",
            {"movie_id": "1359", "rating": 5, "text": "Changed mind"},
            format="json",
        )
        force_authenticate(req2, user=self.user)
        resp2 = view(req2)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        r2 = Review.objects.get(user=self.user, movie_id="1359")
        self.assertEqual(r2.id, r1.id)
        self.assertEqual(r2.rating, 5)
        self.assertEqual(r2.text, "Changed mind")

    def test_retrieve_update_destroy_permissions(self):
        # Alice létrehoz
        r = Review.objects.create(user=self.user, movie_id="999", rating=3, text="init")

        # retrieve bárki (read-only) – itt autentikált Bob
        retrieve = ReviewRetrieveUpdateDestroyView.as_view()
        req_get = self.factory.get(f"/reviews/{r.id}")
        force_authenticate(req_get, user=self.user2)
        resp_get = retrieve(req_get, pk=r.id)
        self.assertEqual(resp_get.status_code, 200)
        self.assertEqual(resp_get.data["id"], r.id)

        # Bob NEM frissítheti Alice bejegyzését (IsOwnerOrReadOnly → 403)
        req_patch_forbidden = self.factory.patch(
            f"/reviews/{r.id}", {"text": "bob tries"}, format="json"
        )
        force_authenticate(req_patch_forbidden, user=self.user2)
        resp_forbidden = retrieve(req_patch_forbidden, pk=r.id)
        self.assertEqual(resp_forbidden.status_code, status.HTTP_403_FORBIDDEN)

        # Alice frissíthet. A view mindig a bejelentkezett userre állítja a usert.
        req_patch_ok = self.factory.patch(
            f"/reviews/{r.id}",
            {"text": "alice updated", "user_id": self.user2.id},  # ezt ignorálni kell
            format="json",
        )
        force_authenticate(req_patch_ok, user=self.user)
        resp_ok = retrieve(req_patch_ok, pk=r.id)
        self.assertEqual(resp_ok.status_code, 200)
        r.refresh_from_db()
        self.assertEqual(r.text, "alice updated")
        self.assertEqual(r.user_id, self.user.id)

        # Alice törölheti
        req_del = self.factory.delete(f"/reviews/{r.id}")
        force_authenticate(req_del, user=self.user)
        resp_del = retrieve(req_del, pk=r.id)
        self.assertEqual(resp_del.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Review.objects.filter(id=r.id).exists())


class ReviewSummaryTests(BaseAPITestCase):
    def test_review_summary_counts_and_avg_rounded(self):
        Review.objects.create(user=self.user, movie_id="42", rating=4, text="")
        Review.objects.create(user=self.user2, movie_id="42", rating=5, text="")
        Review.objects.create(user=self.user, movie_id="7", rating=1, text="")

        req = self.factory.get("/reviews/summary", {"movie_id": "42"})
        resp = review_summary(req)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["movie_id"], "42")
        self.assertEqual(resp.data["count"], 2)
        self.assertEqual(resp.data["avg"], 4.5)


class FavouriteTests(BaseAPITestCase):

    def test_create_get_or_create_semantics_and_exists(self):
        create_view = FavouriteViewSet.as_view({"post": "create"})
        exists_view = FavouriteViewSet.as_view({"get": "exists"})

        # első alkalommal created=True
        req1 = self.factory.post("/favourites", {"movie_id": "777"}, format="json")
        force_authenticate(req1, user=self.user)
        resp1 = create_view(req1)
        self.assertEqual(resp1.status_code, 200)
        self.assertEqual(resp1.data, {"created": True})
        self.assertTrue(Favourite.objects.filter(user=self.user, movie_id="777").exists())

        # másodszor created=False
        req2 = self.factory.post("/favourites", {"movie_id": "777"}, format="json")
        force_authenticate(req2, user=self.user)
        resp2 = create_view(req2)
        self.assertEqual(resp2.status_code, 200)
        self.assertEqual(resp2.data, {"created": False})

        # exists action
        req_ex = self.factory.get("/favourites/exists", {"movie_id": "777"})
        force_authenticate(req_ex, user=self.user)
        resp_ex = exists_view(req_ex)
        self.assertEqual(resp_ex.status_code, 200)
        self.assertEqual(resp_ex.data, {"exists": True})

    def test_destroy_by_movie_id(self):
        Favourite.objects.create(user=self.user, movie_id="321")
        destroy_view = FavouriteViewSet.as_view({"delete": "destroy"})

        req = self.factory.delete("/favourites/321")
        force_authenticate(req, user=self.user)
        resp = destroy_view(req, movie_id="321")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Favourite.objects.filter(user=self.user, movie_id="321").exists())
