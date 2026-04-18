document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = getCurrentUser();

  if (!currentUser || !isAdmin(currentUser)) {
    const loginUrl = `${buildAuthPageUrl("login", "Admin.html")}&reason=admin`;
    window.location.href = loginUrl;
    return;
  }

  const movieForm = document.getElementById("movie-form");
  const showtimeForm = document.getElementById("showtime-form");
  const moviesTable = document.getElementById("admin-movies-table");
  const showtimesTable = document.getElementById("admin-showtimes-table");
  const bookingsTable = document.getElementById("admin-bookings-table");
  const showtimeMovieSelect = document.getElementById("showtime-movie");

  if (!movieForm || !showtimeForm) {
    return;
  }

  let movies = [];
  let showtimes = [];

  try {
    await window.appReady;
    movies = await getMovies();
    showtimes = await getShowtimes();
    renderAll();
  } catch (error) {
    console.error(error);
    showAlert("admin-alert", "Không thể tải dữ liệu admin. Hãy kiểm tra cách chạy dự án.", "danger");
    return;
  }

  movieForm.addEventListener("submit", handleMovieSubmit);
  showtimeForm.addEventListener("submit", handleShowtimeSubmit);
  document.getElementById("reset-movie-form-btn").addEventListener("click", resetMovieForm);
  document.getElementById("reset-showtime-form-btn").addEventListener("click", resetShowtimeForm);
  moviesTable.addEventListener("click", handleMovieActions);
  showtimesTable.addEventListener("click", handleShowtimeActions);

  function renderAll() {
    renderMovieOptions();
    renderMoviesTable();
    renderShowtimesTable();
    renderBookingsTable();
  }

  function renderMovieOptions() {
    showtimeMovieSelect.innerHTML = `
      <option value="">-- Chọn phim --</option>
      ${movies
        .map((movie) => `<option value="${escapeHtml(movie.id)}">${escapeHtml(movie.title)}</option>`)
        .join("")}
    `;
  }

  function renderMoviesTable() {
    if (movies.length === 0) {
      moviesTable.innerHTML = `<tr><td colspan="5" class="text-center text-light-emphasis">Chưa có phim nào.</td></tr>`;
      return;
    }

    moviesTable.innerHTML = movies
      .map(
        (movie) => `
          <tr>
            <td>${escapeHtml(movie.title)}</td>
            <td>${escapeHtml(movie.genre)}</td>
            <td>${escapeHtml(String(movie.duration))} phút</td>
            <td>${escapeHtml(formatDate(movie.releaseDate))}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-cine-outline edit-movie-btn" data-id="${escapeHtml(movie.id)}">Sửa</button>
                <button class="btn btn-sm btn-outline-danger delete-movie-btn" data-id="${escapeHtml(movie.id)}">Xóa</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
  }

  function renderShowtimesTable() {
    if (showtimes.length === 0) {
      showtimesTable.innerHTML = `<tr><td colspan="6" class="text-center text-light-emphasis">Chưa có lịch chiếu nào.</td></tr>`;
      return;
    }

    const sortedShowtimes = [...showtimes].sort(
      (first, second) => new Date(`${first.date}T${first.time}`) - new Date(`${second.date}T${second.time}`)
    );

    showtimesTable.innerHTML = sortedShowtimes
      .map((showtime) => {
        const movie = movies.find((item) => item.id === showtime.movieId);

        return `
          <tr>
            <td>${escapeHtml(movie ? movie.title : "Phim đã xóa")}</td>
            <td>${escapeHtml(formatDate(showtime.date))}</td>
            <td>${escapeHtml(showtime.time)}</td>
            <td>${escapeHtml(showtime.room)}</td>
            <td>${escapeHtml(formatCurrency(showtime.price))}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-cine-outline edit-showtime-btn" data-id="${escapeHtml(showtime.id)}">Sửa</button>
                <button class="btn btn-sm btn-outline-danger delete-showtime-btn" data-id="${escapeHtml(showtime.id)}">Xóa</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function renderBookingsTable() {
    const bookings = getBookings();

    if (bookings.length === 0) {
      bookingsTable.innerHTML = `<tr><td colspan="7" class="text-center text-light-emphasis">Chưa có vé đặt nào.</td></tr>`;
      return;
    }

    bookingsTable.innerHTML = bookings
      .map(
        (booking) => `
          <tr>
            <td>${escapeHtml(booking.ticketCode)}</td>
            <td>${escapeHtml(booking.customerName)}</td>
            <td>${escapeHtml(booking.movieTitle)}</td>
            <td>${escapeHtml(formatDate(booking.date))} - ${escapeHtml(booking.time)} - ${escapeHtml(booking.room)}</td>
            <td>${escapeHtml(booking.seats.join(", "))}</td>
            <td>${escapeHtml(formatCurrency(booking.totalPrice))}</td>
            <td>${escapeHtml(formatDateTime(booking.bookedAt))}</td>
          </tr>
        `
      )
      .join("");
  }

  function handleMovieSubmit(event) {
    event.preventDefault();

    const movieId = document.getElementById("movie-id").value;
    const movieData = {
      id: movieId || generateId("mv"),
      title: document.getElementById("movie-title").value.trim(),
      genre: document.getElementById("movie-genre").value.trim(),
      duration: Number(document.getElementById("movie-duration").value),
      releaseDate: document.getElementById("movie-release-date").value,
      director: document.getElementById("movie-director").value.trim(),
      cast: document.getElementById("movie-cast").value.trim(),
      poster: document.getElementById("movie-poster").value.trim() || "../Assets/Images/Posters/DefaultPoster.svg",
      banner: document.getElementById("movie-banner").value.trim() || "../Assets/Images/Banners/DefaultBanner.svg",
      trailer: document.getElementById("movie-trailer").value.trim(),
      description: document.getElementById("movie-description").value.trim()
    };

    if (!movieData.title || !movieData.genre || !movieData.releaseDate || !movieData.director || !movieData.cast || !movieData.description) {
      showAlert("admin-alert", "Vui lòng nhập đầy đủ thông tin phim.", "danger");
      return;
    }

    const movieIndex = movies.findIndex((movie) => movie.id === movieData.id);

    if (movieIndex >= 0) {
      movies[movieIndex] = movieData;
      showAlert("admin-alert", "Cập nhật phim thành công.", "success");
    } else {
      movies.push(movieData);
      showAlert("admin-alert", "Thêm phim mới thành công.", "success");
    }

    saveMovies(movies);
    resetMovieForm();
    renderAll();
  }

  function handleShowtimeSubmit(event) {
    event.preventDefault();

    const showtimeId = document.getElementById("showtime-id").value;
    const showtimeData = {
      id: showtimeId || generateId("st"),
      movieId: document.getElementById("showtime-movie").value,
      date: document.getElementById("showtime-date").value,
      time: document.getElementById("showtime-time").value,
      room: document.getElementById("showtime-room").value.trim(),
      price: Number(document.getElementById("showtime-price").value)
    };

    if (!showtimeData.movieId || !showtimeData.date || !showtimeData.time || !showtimeData.room || !showtimeData.price) {
      showAlert("admin-alert", "Vui lòng nhập đầy đủ thông tin lịch chiếu.", "danger");
      return;
    }

    const showtimeIndex = showtimes.findIndex((showtime) => showtime.id === showtimeData.id);

    if (showtimeIndex >= 0) {
      showtimes[showtimeIndex] = showtimeData;
      showAlert("admin-alert", "Cập nhật lịch chiếu thành công.", "success");
    } else {
      showtimes.push(showtimeData);
      showAlert("admin-alert", "Thêm lịch chiếu mới thành công.", "success");
    }

    saveShowtimes(showtimes);
    resetShowtimeForm();
    renderAll();
  }

  function handleMovieActions(event) {
    const editButton = event.target.closest(".edit-movie-btn");
    const deleteButton = event.target.closest(".delete-movie-btn");

    if (editButton) {
      const movie = movies.find((item) => item.id === editButton.dataset.id);

      if (!movie) {
        return;
      }

      document.getElementById("movie-id").value = movie.id;
      document.getElementById("movie-title").value = movie.title;
      document.getElementById("movie-genre").value = movie.genre;
      document.getElementById("movie-duration").value = movie.duration;
      document.getElementById("movie-release-date").value = movie.releaseDate;
      document.getElementById("movie-director").value = movie.director;
      document.getElementById("movie-cast").value = movie.cast;
      document.getElementById("movie-poster").value = movie.poster;
      document.getElementById("movie-banner").value = movie.banner;
      document.getElementById("movie-trailer").value = movie.trailer;
      document.getElementById("movie-description").value = movie.description;
      showAlert("admin-alert", `Đang chỉnh sửa phim ${movie.title}.`, "info");
    }

    if (deleteButton) {
      const movieId = deleteButton.dataset.id;
      const movie = movies.find((item) => item.id === movieId);

      if (!movie) {
        return;
      }

      const accepted = window.confirm(`Xóa phim "${movie.title}" và toàn bộ lịch chiếu liên quan?`);

      if (!accepted) {
        return;
      }

      movies = movies.filter((item) => item.id !== movieId);
      showtimes = showtimes.filter((showtime) => showtime.movieId !== movieId);
      saveMovies(movies);
      saveShowtimes(showtimes);
      resetMovieForm();
      renderAll();
      showAlert("admin-alert", "Đã xóa phim và các lịch chiếu liên quan.", "success");
    }
  }

  function handleShowtimeActions(event) {
    const editButton = event.target.closest(".edit-showtime-btn");
    const deleteButton = event.target.closest(".delete-showtime-btn");

    if (editButton) {
      const showtime = showtimes.find((item) => item.id === editButton.dataset.id);

      if (!showtime) {
        return;
      }

      document.getElementById("showtime-id").value = showtime.id;
      document.getElementById("showtime-movie").value = showtime.movieId;
      document.getElementById("showtime-date").value = showtime.date;
      document.getElementById("showtime-time").value = showtime.time;
      document.getElementById("showtime-room").value = showtime.room;
      document.getElementById("showtime-price").value = showtime.price;
      showAlert("admin-alert", "Đang chỉnh sửa lịch chiếu.", "info");
    }

    if (deleteButton) {
      const showtimeId = deleteButton.dataset.id;
      const accepted = window.confirm("Bạn có chắc muốn xóa lịch chiếu này không?");

      if (!accepted) {
        return;
      }

      showtimes = showtimes.filter((item) => item.id !== showtimeId);
      saveShowtimes(showtimes);
      resetShowtimeForm();
      renderAll();
      showAlert("admin-alert", "Đã xóa lịch chiếu.", "success");
    }
  }

  function resetMovieForm() {
    movieForm.reset();
    document.getElementById("movie-id").value = "";
  }

  function resetShowtimeForm() {
    showtimeForm.reset();
    document.getElementById("showtime-id").value = "";
  }
});
