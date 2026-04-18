document.addEventListener("DOMContentLoaded", async () => {
  const moviesList = document.getElementById("movies-list");
  const genreFilter = document.getElementById("genre-filter");
  const searchInput = document.getElementById("search-input");
  const movieCount = document.getElementById("movie-count");
  const resetFilterButton = document.getElementById("reset-filter-btn");

  if (!moviesList) {
    return;
  }

  try {
    await window.appReady;
    const movies = await getMovies();

    populateGenreFilter(movies);
    renderMovies(movies);

    searchInput.addEventListener("input", () => renderMovies(movies));
    genreFilter.addEventListener("change", () => renderMovies(movies));
    resetFilterButton.addEventListener("click", () => {
      searchInput.value = "";
      genreFilter.value = "all";
      renderMovies(movies);
    });
  } catch (error) {
    console.error(error);
    moviesList.innerHTML = renderEmptyState(
      "Không thể tải danh sách phim",
      "Hãy chạy dự án bằng local server để fetch() hoạt động đúng."
    );
  }

  function populateGenreFilter(movies) {
    const genres = [...new Set(movies.map((movie) => movie.genre))].sort();
    genreFilter.innerHTML = `
      <option value="all">Tất cả thể loại</option>
      ${genres.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join("")}
    `;
  }

  function renderMovies(movies) {
    const keyword = searchInput.value.trim().toLowerCase();
    const selectedGenre = genreFilter.value;

    const filteredMovies = movies.filter((movie) => {
      const matchedTitle = movie.title.toLowerCase().includes(keyword);
      const matchedGenre = selectedGenre === "all" || movie.genre === selectedGenre;
      return matchedTitle && matchedGenre;
    });

    movieCount.textContent = `Hiển thị ${filteredMovies.length} / ${movies.length} phim`;

    if (filteredMovies.length === 0) {
      moviesList.innerHTML = renderEmptyState(
        "Không tìm thấy phim phù hợp",
        "Hãy thử đổi từ khóa hoặc chọn lại thể loại."
      );
      return;
    }

    moviesList.innerHTML = filteredMovies.map(createMovieCard).join("");
  }
});
