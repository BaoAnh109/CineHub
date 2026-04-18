document.addEventListener("DOMContentLoaded", async () => {
  const detailContainer = document.getElementById("movie-detail-content");

  if (!detailContainer) {
    return;
  }

  const movieId = getQueryParam("id");

  if (!movieId) {
    detailContainer.innerHTML = renderEmptyState("Thiếu mã phim", "Hãy quay lại danh sách phim và chọn lại.");
    return;
  }

  try {
    await window.appReady;
    const [movies, showtimes] = await Promise.all([getMovies(), getShowtimes()]);
    const movie = movies.find((item) => item.id === movieId);

    if (!movie) {
      detailContainer.innerHTML = renderEmptyState("Không tìm thấy phim", "Phim bạn chọn không còn trong dữ liệu.");
      return;
    }

    const relatedShowtimes = showtimes.filter((showtime) => showtime.movieId === movie.id).slice(0, 3);

    detailContainer.innerHTML = `
      <div class="movie-detail-banner" style="background-image: url('${escapeHtml(getImagePath(movie.banner, "../Assets/Images/Banners/DefaultBanner.svg"))}')">
        <div class="overlay-content">
          <span class="section-subtitle">Chi tiết phim</span>
          <h1>${escapeHtml(movie.title)}</h1>
          <div class="hero-meta">
            <span><i class="bi bi-tags"></i> ${escapeHtml(movie.genre)}</span>
            <span><i class="bi bi-clock"></i> ${escapeHtml(movie.duration)} phút</span>
            <span><i class="bi bi-calendar-event"></i> ${escapeHtml(formatDate(movie.releaseDate))}</span>
          </div>
          <div class="d-flex flex-wrap gap-3 mt-4">
            <a href="Showtime.html?id=${encodeURIComponent(movie.id)}" class="btn btn-cine-primary">Đặt vé ngay</a>
            <a href="Movies.html" class="btn btn-cine-outline">Quay lại danh sách</a>
          </div>
        </div>
      </div>

      <div class="row g-4 detail-layout">
        <div class="col-lg-4">
          <img class="detail-poster" src="${escapeHtml(getImagePath(movie.poster, "../Assets/Images/Posters/DefaultPoster.svg"))}" alt="${escapeHtml(movie.title)}" />
        </div>
        <div class="col-lg-8">
          <div class="detail-panel mb-4">
            <h2 class="h3 mb-3">Nội dung phim</h2>
            <p class="detail-description mb-0">${escapeHtml(movie.description)}</p>

            <div class="movie-meta-list">
              <div><strong>Thể loại</strong><span>${escapeHtml(movie.genre)}</span></div>
              <div><strong>Thời lượng</strong><span>${escapeHtml(movie.duration)} phút</span></div>
              <div><strong>Ngày khởi chiếu</strong><span>${escapeHtml(formatDate(movie.releaseDate))}</span></div>
              <div><strong>Đạo diễn</strong><span>${escapeHtml(movie.director)}</span></div>
              <div><strong>Diễn viên</strong><span>${escapeHtml(movie.cast)}</span></div>
            </div>
          </div>

          <div class="detail-panel mb-4">
            <h2 class="h4 mb-3">Một số suất chiếu gần nhất</h2>
            ${
              relatedShowtimes.length > 0
                ? relatedShowtimes
                    .map(
                      (showtime) => `
                        <div class="summary-item mb-3">
                          <span>${escapeHtml(formatDate(showtime.date))} - ${escapeHtml(showtime.time)} - ${escapeHtml(showtime.room)}</span>
                          <strong>${escapeHtml(formatCurrency(showtime.price))}</strong>
                        </div>
                      `
                    )
                    .join("")
                : "<p class='mb-0'>Hiện chưa có lịch chiếu cho phim này.</p>"
            }
          </div>

          ${
            movie.trailer
              ? `
                <div class="detail-panel">
                  <h2 class="h4 mb-3">Trailer</h2>
                  <div class="video-frame">
                    <iframe src="${escapeHtml(movie.trailer)}" title="Trailer ${escapeHtml(movie.title)}" allowfullscreen></iframe>
                  </div>
                </div>
              `
              : ""
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    detailContainer.innerHTML = renderEmptyState(
      "Không tải được dữ liệu phim",
      "Hãy kiểm tra cách chạy dự án hoặc file JSON."
    );
  }
});
