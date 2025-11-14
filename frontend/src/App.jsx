import { BrowserRouter, Routes, Route, useParams } from "react-router-dom";
import FilmNerdHome from "./FilmNerdHome.jsx";
import MovieDetail from "./MovieDetail.jsx"; 
import DirectorDetail from "./DirectorDetail.jsx";
import ActorDetail from "./ActorDetail.jsx";

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
        <Route path="/director/:id" element={<DirectorDetail />} />
        <Route path="/actor/:id" element={<ActorDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
