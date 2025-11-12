
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import FilmNerdHome from "./FilmNerdHome.jsx";
import MovieDetail, { parseMovieSlug } from "./MovieDetail.jsx";
import MovieLists from "./MovieLists";
import MovieListDetail from "./MovieListDetail";

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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FilmNerdHome />} />
        <Route path="/movie/:slug" element={<MovieRoute />} />
        <Route path="/lists" element={<MovieLists />} />
        <Route path="/list/:listId" element={<MovieListDetailWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}
