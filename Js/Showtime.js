document.addEventListener("DOMContentLoaded", async () => {
  const bannerContainer = document.getElementById("showtime-banner");
  const dateSelector = document.getElementById("date-selector");
  const showtimeList = document.getElementById("showtime-list");

  if (!bannerContainer || !dateSelector || !showtimeList) {
    return;
  }

  const movieId = getQueryParam("id");

  if (!movieId) {
    bannerContainer.innerHTML = renderEmptyState("Thiếu mã phim", "Hãy quay lại trang danh sách phim để chọn lại.");
    return;
  }

  try {
    await window.appReady;
    const [movies, showtimes] = await Promise.all([getMovies(), getShowtimes()]);
    const movie = movies.find((item) => item.id === movieId);

    if (!movie) {
      bannerContainer.innerHTML = renderEmptyState("Không tìm thấy phim", "Phim bạn chọn không tồn tại trong dữ liệu.");
      return;
    }

    const movieShowtimes = showtimes
      .filter((showtime) => showtime.movieId === movieId)
      .sort((first, second) => new Date(`${first.date}T${first.time}`) - new Date(`${second.date}T${second.time}`));

    if (movieShowtimes.length === 0) {
      bannerContainer.innerHTML = renderEmptyState("Chưa có lịch chiếu", "Admin có thể thêm lịch chiếu trong trang quản trị.");
      return;
    }

    bannerContainer.innerHTML = `
      <div class="movie-detail-banner" style="background-image: url('${escapeHtml(getImagePath(movie.banner, "../Assets/Images/Banners/DefaultBanner.svg"))}')">
        <div class="overlay-content">
          <span class="section-subtitle">Chọn lịch chiếu</span>
          <h1>${escapeHtml(movie.title)}</h1>
          <div class="hero-meta">
            <span><i class="bi bi-tags"></i> ${escapeHtml(movie.genre)}</span>
            <span><i class="bi bi-clock"></i> ${escapeHtml(movie.duration)} phút</span>
          </div>
          <p>${escapeHtml(movie.description)}</p>
        </div>
      </div>
    `;

    const dates = [...new Set(movieShowtimes.map((showtime) => showtime.date))];
    let activeDate = dates[0];

    renderDateSelector();
    renderShowtimeCards();

    function renderDateSelector() {
      dateSelector.innerHTML = dates
        .map(
          (date) => `
            <button class="date-chip ${date === activeDate ? "active" : ""}" type="button" data-date="${escapeHtml(date)}">
              <strong>${escapeHtml(formatDate(date))}</strong>
              <small>${escapeHtml(new Date(date).toLocaleDateString("vi-VN", { weekday: "long" }))}</small>
            </button>
          `
        )
        .join("");

      dateSelector.querySelectorAll("[data-date]").forEach((button) => {
        button.addEventListener("click", () => {
          activeDate = button.dataset.date;
          renderDateSelector();
          renderShowtimeCards();
        });
      });
    }

    function renderShowtimeCards() {
      const filteredShowtimes = movieShowtimes.filter((showtime) => showtime.date === activeDate);

      showtimeList.innerHTML = filteredShowtimes
        .map(
          (showtime) => `
            <div class="col-md-6 col-xl-4">
              <article class="showtime-card">
                <div class="showtime-time mb-2">${escapeHtml(showtime.time)}</div>
                <p class="mb-3">${escapeHtml(formatDate(showtime.date))}</p>
                <div class="summary-list mb-4">
                  <div class="summary-item"><span>Phòng chiếu</span><strong>${escapeHtml(showtime.room)}</strong></div>
                  <div class="summary-item"><span>Giá vé</span><strong>${escapeHtml(formatCurrency(showtime.price))}</strong></div>
                </div>
                <button class="btn btn-cine-primary w-100 select-showtime-btn" data-showtime-id="${escapeHtml(showtime.id)}">
                  Chọn suất chiếu
                </button>
              </article>
            </div>
          `
        )
        .join("");

      showtimeList.querySelectorAll(".select-showtime-btn").forEach((button) => {
        button.addEventListener("click", () => {
          const selectedShowtime = movieShowtimes.find((showtime) => showtime.id === button.dataset.showtimeId);

          setBookingDraft({
            movieId: movie.id,
            movieTitle: movie.title,
            showtimeId: selectedShowtime.id
          });

          window.location.href = `SeatSelection.html?id=${encodeURIComponent(movie.id)}&showtimeId=${encodeURIComponent(selectedShowtime.id)}`;
        });
      });
    }
  } catch (error) {
    console.error(error);
    bannerContainer.innerHTML = renderEmptyState("Không thể tải lịch chiếu", "Hãy kiểm tra dữ liệu JSON hoặc cách chạy dự án.");
  }
});
