from pathlib import Path
import os
from dotenv import load_dotenv
from datetime import timedelta
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = True
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-secret-change-me")
ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "filmnerd.onrender.com",
]

database_url = os.environ.get("DATABASE_URL")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",

    "reviews",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


CORS_ALLOW_ALL_ORIGINS = False

CORS_ALLOWED_ORIGINS = [
    "https://fbeni-04.github.io",
    "http://localhost:5173",
]

CSRF_TRUSTED_ORIGINS = [
    "https://fbeni-04.github.io",
    "https://filmnerd.onrender.com",
]
CORS_ALLOW_CREDENTIALS = True
REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 50,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}

if database_url:
    DATABASES = {
        "default": dj_database_url.config(
            default=database_url,
            conn_max_age=600,
        )
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.environ.get("DB_NAME", "filmnerd"),
            "USER": os.environ.get("DB_USER", "root"),
            "PASSWORD": os.environ.get("DB_PASS", ""),
            "HOST": os.environ.get("DB_HOST", "127.0.0.1"),
            "PORT": os.environ.get("DB_PORT", "3307"),
        }
    }

# Tesztadatbázis: használja ugyanazt a configot mirrorral
DATABASES["default"]["TEST"] = {"MIRROR": "default"}
STATIC_URL = "/static/"
ROOT_URLCONF = "filmnerd_backend.urls"
AUTH_USER_MODEL = "reviews.User"
TEST_RUNNER = 'django.test.runner.DiscoverRunner'

DATABASES['default']['TEST'] = {
    'MIRROR': 'default'
}


SIMPLE_JWT = {"ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
              "REFRESH_TOKEN_LIFETIME": timedelta(days=7)}

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],  # ha lesz saját template mappa, ide adod hozzá
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]
