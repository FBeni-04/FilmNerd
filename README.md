# FilmNerd

A university project for the course **Software Development Methodologies**. We designed and built FilmNerd for passionate cinephiles who want more expressive ratings and discovery than a typical 1–10 star site.

## Team

* **Ferenczi Benjámin Brúnó**
* **Pósán Patrik**
* **Tudesze Márk**

---

## What is FilmNerd?

FilmNerd is a web application where you can rate movies with **emojis** (instead of hard numbers), follow and compare tastes, and discover people with similar favorites. When there’s a match, you can start a conversation via an in‑app **chat**.

### Key capabilities

* **Emoji‑based movie ratings** (more expressive than numeric stars)
* **Actor & Director reactions**: simple **Like / Dislike**
* **Create & manage lists** (public or private)
* **Favorites** and **Watchlist**
* **Search** by **title, genre, actor, director**
* **Filter** any movie list by **genre, actor, director, runtime**
* **Detail pages** for movies, actors, directors
* **Taste‑based people discovery** and 1:1 **chat**

---

## What we implemented (highlights)

> This is a concise summary of items we built and iterated on together during development.

* **Frontend foundation** with React + Vite, routing, and a responsive **Navbar** using `react-icons` (moved away from external CDNs due to CSP).
* **Authentication UI**: `AuthProvider` + `AuthModal` with a clean login/registration flow (JWT on the backend).
* **Home shelves**: static TMDB ID shelves for rapid prototyping — **Recommended**, **Friends’ Favorites**, **Admin’s Favorites**, and **Popular This Week** (no DB call needed for the shelf itself).
* **Movie detail view** consuming TMDB images (`image.tmdb.org` sizes: w92/w185/w342/w500/w1280) and displaying emoji ratings.
* **Search box** with debounced queries; supports title/genre/actor/director and integrates with backend endpoints.
* **CSP/CORS hardening**: removed external stylesheets and icon CDNs that violated CSP; enabled CORS in the API for local dev origins.
* **Consistent API base handling** with `API_BASE` env on the client.
* **MySQL port migration** to `3307` for local compatibility; documented `.env` for backend DB.

---

## Architecture & Tech Stack

**Frontend**

* React 18 + Vite
* React Router
* State: lightweight React state + context for auth
* UI: Tailwind CSS or Bootstrap (project supports either; we used Tailwind during most iterations), `react-icons`

**Backend**

* **Django + Django REST Framework**
* Auth: JWT (SimpleJWT)
* DB: **MySQL** (dev port `3307`)
* CORS: `django-cors-headers`

**External**

* **TMDB API** for metadata and images

---

## Data model (current)

![ERD](https://github.com/user-attachments/assets/2ef70e68-6b9e-438b-9558-b26c0eec136c)

> The schema includes Users, Movies, People (Actors/Directors), EmojiRatings, Reactions (Like/Dislike), Lists, Favorites, Watchlist, and basic Chat entities. Movies/People store TMDB IDs so we can hydrate details from TMDB when needed.

---

## How to run – Backend (Django + DRF)

### Prerequisites

* Python **3.11+**
* MySQL **8+** (or MariaDB compatible) — listening on **port 3307** for local dev
* Create a database and user with UTF8MB4

```sql
CREATE DATABASE filmnerd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'filmnerd'@'localhost' IDENTIFIED BY 'filmnerd_pw';
GRANT ALL PRIVILEGES ON filmnerd.* TO 'filmnerd'@'localhost';
FLUSH PRIVILEGES;
```

### 1) Clone & create virtualenv

```bash
git clone <your-repo-url>
cd filmnerd/backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2) Configure environment

Create a `.env` in `backend/` (or use your settings module that reads envs):

```
DJANGO_SECRET_KEY=dev-secret-change-me
DJANGO_DEBUG=true
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

DB_NAME=filmnerd
DB_USER=filmnerd
DB_PASS=filmnerd_pw
DB_HOST=127.0.0.1
DB_PORT=3307

CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

### 3) Migrate & create superuser

```bash
python manage.py migrate
python manage.py createsuperuser
```

### 4) Run server

```bash
python manage.py runserver 0.0.0.0:8000
```

The API should be available at `http://localhost:8000/`.

> **Notes**
>
> * Ensure `django-cors-headers` is installed and added to `INSTALLED_APPS` and middleware, then configure `CORS_ALLOWED_ORIGINS`.
> * If you previously had XAMPP/MariaDB conflicts, verify only one MySQL instance is running and that nothing else binds 3307.

---

## How to run – Frontend (React + Vite)

### Prerequisites

* Node.js **18+** (Node 20 recommended)
* npm or pnpm or yarn

### 1) Install

```bash
cd filmnerd/frontend
npm install  # or: pnpm install / yarn
```

### 2) Environment

Create `frontend/.env` with:

```
VITE_API_BASE=http://localhost:8000
VITE_TMDB_API_KEY=<your_tmdb_api_key>
```

### 3) Start dev server

```bash
npm run dev
```

Vite will expose the app at `http://localhost:5173`.

### 4) Production build

```bash
npm run build
npm run preview  # optional local preview
```

> **Notes**
>
> * We intentionally use `react-icons` (no external CSS from CDNs) to avoid CSP issues.
> * Image loading uses TMDB’s secure base (`https://image.tmdb.org/t/p/…`). Make sure the sizes match your component usage.

---

## API quick sketch

* `POST /api/auth/login/` – obtain JWT
* `POST /api/auth/register/` – create account
* `GET /api/movies/?q=keyword&genre=…&actor=…&director=…` – search
* `POST /api/movies/{id}/rate` – emoji rating
* `POST /api/people/{id}/react` – like/dislike actor or director
* `GET /api/lists/`, `POST /api/lists/` – create/manage lists
* `GET /api/recommendations/peers` – similar‑taste users
* `POST /api/chat/{user_id}/message` – send message

> Endpoint names can differ slightly depending on your DRF routers; adjust if your actual routes vary.

---

## Roadmap

* **Phase 1**: Solidify auth + ratings, stabilize list/watchlist flows, and search filters.
* **Phase 2**: Social graph improvements (follow, recommendations based on embeddings), chat polish.
* **Phase 3**: Notifications, activity feed, and collaborative lists.

See our active tasks:

* **Trello**: [https://trello.com/b/vzaLLd63/filmnerd](https://trello.com/b/vzaLLd63/filmnerd)

---

## Dev tips

* Keep `.env` files out of version control.
* When switching UI libraries (Tailwind ↔ Bootstrap), ensure component classes match and purge configs are updated.
* For TMDB rate limits, cache lightweight responses server‑side.

---

## Database
<img width="1302" height="654" alt="Untitled" src="https://github.com/user-attachments/assets/2ef70e68-6b9e-438b-9558-b26c0eec136c" />

## License

Academic project. License to be defined by the team.




