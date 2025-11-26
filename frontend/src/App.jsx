import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import FilmNerdHome from "./FilmNerdHome.jsx";
import MovieLists from "./MovieLists";
import MovieListDetail from "./MovieListDetail";
import DirectorDetail from "./DirectorDetail.jsx";
import ActorDetail from "./ActorDetail.jsx";
import MovieDetail from "./MovieDetail.jsx";
import SearchPage from "./SearchPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import PublicProfilePage from "./PublicProfilePage.jsx";

function MovieRoute() {
  const { slug } = useParams();
  return <MovieDetail slug={slug} />;
}

function MovieListDetailWrapper() {
  const { listId } = useParams();
  return <MovieListDetail listId={listId} />;
}

export default function App() {
  return (
    <BrowserRouter basename="/filmnerd">
      <Routes>
        <Route path="/" element={<FilmNerdHome />} />
        <Route path="/movie/:slug" element={<MovieRoute />} />
        <Route path="/lists" element={<MovieLists />} />
        <Route path="/list/:listId" element={<MovieListDetailWrapper />} />
        <Route path="/director/:id" element={<DirectorDetail />} />
        <Route path="/actor/:id" element={<ActorDetail />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/users/:username" element={<PublicProfilePage />} />
        <Route path="/search" element={<SearchPage />} />
      </Routes>
    </BrowserRouter>
  );
}
