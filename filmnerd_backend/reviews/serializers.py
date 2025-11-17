from rest_framework import serializers
from .models import Review, User, Favourite, MovieList, MovieListItem, Follow

# reviews/serializers.py
from rest_framework import serializers
from django.contrib.auth import authenticate, get_user_model    

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "name", "password"]

    def create(self, validated_data):
        user = User(
            username=validated_data["username"],
            email=validated_data["email"],
            name=validated_data.get("name", "")
        )
        user.set_password(validated_data["password"])
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()              # <-- email helyett username
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(
            username=data["username"],              # <-- ez a default
            password=data["password"]
        )
        if not user:
            raise serializers.ValidationError("Hibás név vagy jelszó.")
        data["user"] = user
        return data



class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "name", "token_expiration"]


class ReviewSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "user_id", "user_username", "movie_id", "rating", "text", "created_at", "updated_at"]
        read_only_fields = ["id", "user_id", "created_at", "updated_at"]


class FavouriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Favourite
        fields = ["id", "user_id", "movie_id"]
        read_only_fields = ["id", "user_id"]

    def validate_movie_id(self, v):
        v = (v or "").strip()
        if not v:
            raise serializers.ValidationError("movie_id required")
        return v
    
#for MovieList and MovieListItem


class MovieListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovieListItem
        fields = ['movie_id', 'added_at']

class MovieListSerializer(serializers.ModelSerializer):
    items = MovieListItemSerializer(many=True, read_only=True)
    user = serializers.ReadOnlyField(source='user.username')

    class Meta:
        model = MovieList
        fields = ['id', 'user', 'name', 'created_at', 'items']

class MovieListCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovieList
        fields = ['name']

class MovieListItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MovieListItem
        fields = ['movie_id']

class UserPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name"]


class FollowSerializer(serializers.ModelSerializer):
    from_user = UserPublicSerializer(read_only=True)
    to_user = UserPublicSerializer(read_only=True)

    class Meta:
        model = Follow
        fields = ["id", "from_user", "to_user", "created_at"]


class FollowCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Follow
        fields = ["to_user"]
        extra_kwargs = {"to_user": {"write_only": True}}

    def validate(self, attrs):
        request = self.context.get("request")
        to_user = attrs.get("to_user")
        if request and request.user == to_user:
            raise serializers.ValidationError("You cannot follow yourself.")
        return attrs