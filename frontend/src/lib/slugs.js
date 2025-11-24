export function parsePersonSlug(slug = "") {
  const m = String(slug).trim().match(/^(\d+)/);
  return m ? Number(m[1]) : null;
}

export function parseMovieSlug(slug = "") {
    const m = String(slug).trim().match(/^(\d+)/);
    return m ? Number(m[1]) : null;
  }