
import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import FilmNerdHome from "./FilmNerdHome.jsx";
import MovieDetail, { parseMovieSlug } from "./MovieDetail.jsx";

function MovieRoute() {
  const { slug } = useParams();
  return <MovieDetail slug={slug} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FilmNerdHome />} />
        <Route path="/movie/:slug" element={<MovieRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
