const DEFAULT_POSTER_PATH = "../Assets/Images/Posters/DefaultPoster.svg";
const DEFAULT_BANNER_PATH = "../Assets/Images/Banners/DefaultBanner.svg";

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
  const supportTable = document.getElementById("admin-support-table");
  const showtimeMovieSelect = document.getElementById("showtime-movie");
  const supportModalElement = document.getElementById("admin-support-modal");
  const supportModalTitle = document.getElementById("admin-support-modal-title");
  const supportModalSubtitle = document.getElementById("admin-support-modal-subtitle");
  const supportModalInfo = document.getElementById("admin-support-modal-info");
  const supportResolveButton = document.getElementById("admin-support-resolve-btn");
  const supportCancelButton = document.getElementById("admin-support-cancel-btn");

  if (
    !movieForm ||
    !showtimeForm ||
    !moviesTable ||
    !showtimesTable ||
    !bookingsTable ||
    !supportTable ||
    !showtimeMovieSelect ||
    !supportModalElement ||
    !supportModalTitle ||
    !supportModalSubtitle ||
    !supportModalInfo ||
    !supportResolveButton ||
    !supportCancelButton
  ) {
    return;
  }

  const supportModal = bootstrap.Modal.getOrCreateInstance(supportModalElement);

  const posterField = setupImageDropzone({
    hiddenInput: document.getElementById("movie-poster"),
    fileInput: document.getElementById("movie-poster-file"),
    dropzone: document.getElementById("movie-poster-dropzone"),
    preview: document.getElementById("movie-poster-preview"),
    meta: document.getElementById("movie-poster-meta"),
    clearButton: document.getElementById("movie-poster-clear"),
    fallbackPath: DEFAULT_POSTER_PATH,
    emptyText: "Nếu không tải lên, hệ thống sẽ dùng poster mặc định."
  });

  const bannerField = setupImageDropzone({
    hiddenInput: document.getElementById("movie-banner"),
    fileInput: document.getElementById("movie-banner-file"),
    dropzone: document.getElementById("movie-banner-dropzone"),
    preview: document.getElementById("movie-banner-preview"),
    meta: document.getElementById("movie-banner-meta"),
    clearButton: document.getElementById("movie-banner-clear"),
    fallbackPath: DEFAULT_BANNER_PATH,
    emptyText: "Nếu không tải lên, hệ thống sẽ dùng banner mặc định."
  });

  let movies = [];
  let showtimes = [];
  let supportRequests = [];
  let activeSupportRequestCode = null;

  try {
    await window.appReady;
    movies = await getMovies();
    showtimes = await getShowtimes();
    supportRequests = getSupportRequests();
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
  supportTable.addEventListener("click", handleSupportActions);
  supportResolveButton.addEventListener("click", () => updateSupportRequest("Đã xử lý"));
  supportCancelButton.addEventListener("click", () => updateSupportRequest("Đã hủy bỏ"));

  function renderAll() {
    renderMovieOptions();
    renderMoviesTable();
    renderShowtimesTable();
    renderBookingsTable();
    renderSupportRequestsTable();
  }

  function renderMovieOptions() {
    showtimeMovieSelect.innerHTML = `
      <option value="">-- Chọn phim --</option>
      ${movies.map((movie) => `<option value="${escapeHtml(movie.id)}">${escapeHtml(movie.title)}</option>`).join("")}
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

  function renderSupportRequestsTable() {
    supportRequests = getSupportRequests();

    if (supportRequests.length === 0) {
      supportTable.innerHTML = `<tr><td colspan="8" class="text-center text-light-emphasis">Chưa có yêu cầu hỗ trợ nào.</td></tr>`;
      return;
    }

    supportTable.innerHTML = supportRequests
      .map((request) => {
        const status = request.status || "Mới tiếp nhận";
        const canResolve = status === "Mới tiếp nhận";
        const canCancel = status === "Mới tiếp nhận";
        const contact = [request.phone, request.email].filter(Boolean).join(" - ");

        return `
          <tr>
            <td><strong>${escapeHtml(request.requestCode)}</strong></td>
            <td>${escapeHtml(request.fullName || "Không có")}</td>
            <td>${escapeHtml(contact || "Không có")}</td>
            <td>${escapeHtml(request.subject || "Không có")}</td>
            <td>${escapeHtml(request.ticketCode || "Không có")}</td>
            <td><span class="badge-soft">${escapeHtml(status)}</span></td>
            <td>${escapeHtml(formatDateTime(request.createdAt))}</td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-sm btn-cine-outline view-support-btn" data-request-code="${escapeHtml(request.requestCode)}">Xem</button>
                <button class="btn btn-sm btn-success resolve-support-btn" data-request-code="${escapeHtml(request.requestCode)}" ${canResolve ? "" : "disabled"}>Đã xử lý</button>
                <button class="btn btn-sm btn-outline-danger cancel-support-btn" data-request-code="${escapeHtml(request.requestCode)}" ${canCancel ? "" : "disabled"}>Hủy bỏ</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function handleMovieSubmit(event) {
    event.preventDefault();
    await Promise.all([posterField.settle(), bannerField.settle()]);

    const movieId = document.getElementById("movie-id").value;
    const movieData = {
      id: movieId || generateId("mv"),
      title: document.getElementById("movie-title").value.trim(),
      genre: document.getElementById("movie-genre").value.trim(),
      duration: Number(document.getElementById("movie-duration").value),
      releaseDate: document.getElementById("movie-release-date").value,
      director: document.getElementById("movie-director").value.trim(),
      cast: document.getElementById("movie-cast").value.trim(),
      poster: posterField.getValue() || DEFAULT_POSTER_PATH,
      banner: bannerField.getValue() || DEFAULT_BANNER_PATH,
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
      posterField.setValue(movie.poster);
      bannerField.setValue(movie.banner);
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

  function handleSupportActions(event) {
    const viewButton = event.target.closest(".view-support-btn");
    const resolveButton = event.target.closest(".resolve-support-btn");
    const cancelButton = event.target.closest(".cancel-support-btn");

    if (viewButton) {
      openSupportDetailModal(viewButton.dataset.requestCode);
      return;
    }

    if (resolveButton) {
      activeSupportRequestCode = resolveButton.dataset.requestCode;
      updateSupportRequest("Đã xử lý");
      return;
    }

    if (cancelButton) {
      activeSupportRequestCode = cancelButton.dataset.requestCode;
      updateSupportRequest("Đã hủy bỏ");
    }
  }

  function openSupportDetailModal(requestCode) {
    const request = supportRequests.find((item) => item.requestCode === requestCode);

    if (!request) {
      showAlert("admin-alert", "Không tìm thấy yêu cầu hỗ trợ.", "danger");
      return;
    }

    activeSupportRequestCode = request.requestCode;
    const status = request.status || "Mới tiếp nhận";
    const resolvedBy = request.resolvedBy?.fullName || request.resolvedBy?.email || "";

    supportModalTitle.textContent = `Yêu cầu: ${request.requestCode}`;
    supportModalSubtitle.textContent = `${request.fullName || "Khách hàng"} - ${status}`;
    supportModalInfo.innerHTML = `
      <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(request.fullName || "Không có")}</strong></div>
      <div class="summary-item"><span>Email</span><strong>${escapeHtml(request.email || "Không có")}</strong></div>
      <div class="summary-item"><span>Số điện thoại</span><strong>${escapeHtml(request.phone || "Không có")}</strong></div>
      <div class="summary-item"><span>Chủ đề</span><strong>${escapeHtml(request.subject || "Không có")}</strong></div>
      <div class="summary-item"><span>Mã vé</span><strong>${escapeHtml(request.ticketCode || "Không có")}</strong></div>
      <div class="summary-item"><span>Trạng thái</span><strong>${escapeHtml(status)}</strong></div>
      <div class="summary-item"><span>Thời gian gửi</span><strong>${escapeHtml(formatDateTime(request.createdAt))}</strong></div>
      ${
        request.resolvedAt
          ? `<div class="summary-item"><span>Thời gian cập nhật</span><strong>${escapeHtml(
              formatDateTime(request.resolvedAt)
            )}</strong></div>`
          : ""
      }
      ${
        resolvedBy
          ? `<div class="summary-item"><span>Người xử lý</span><strong>${escapeHtml(resolvedBy)}</strong></div>`
          : ""
      }
      <div class="summary-item"><span>Nội dung</span><strong class="text-break">${escapeHtml(request.message || "Không có")}</strong></div>
    `;

    const isPending = status === "Mới tiếp nhận";
    supportResolveButton.disabled = !isPending;
    supportCancelButton.disabled = !isPending;
    supportModal.show();
  }

  function updateSupportRequest(nextStatus) {
    if (!activeSupportRequestCode) {
      return;
    }

    const request = supportRequests.find((item) => item.requestCode === activeSupportRequestCode);

    if (!request) {
      showAlert("admin-alert", "Không tìm thấy yêu cầu hỗ trợ để cập nhật.", "danger");
      return;
    }

    if ((request.status || "Mới tiếp nhận") !== "Mới tiếp nhận") {
      showAlert("admin-alert", "Yêu cầu này đã được xử lý trước đó.", "warning");
      return;
    }

    const updated = updateSupportRequestStatus(activeSupportRequestCode, nextStatus, currentUser);

    if (!updated) {
      showAlert("admin-alert", "Không thể cập nhật trạng thái yêu cầu hỗ trợ.", "danger");
      return;
    }

    supportRequests = getSupportRequests();
    renderSupportRequestsTable();
    openSupportDetailModal(activeSupportRequestCode);
    showAlert("admin-alert", `Đã cập nhật yêu cầu ${activeSupportRequestCode} thành trạng thái "${nextStatus}".`, "success");
  }

  function resetMovieForm() {
    movieForm.reset();
    document.getElementById("movie-id").value = "";
    posterField.reset();
    bannerField.reset();
  }

  function resetShowtimeForm() {
    showtimeForm.reset();
    document.getElementById("showtime-id").value = "";
  }
});

function setupImageDropzone({ hiddenInput, fileInput, dropzone, preview, meta, clearButton, fallbackPath, emptyText }) {
  let pendingRead = Promise.resolve();

  if (!hiddenInput || !fileInput || !dropzone || !preview || !meta || !clearButton) {
    return {
      getValue() {
        return "";
      },
      reset() {},
      setValue() {},
      settle() {
        return Promise.resolve();
      }
    };
  }

  function getSourceLabel(source) {
    if (!source) {
      return emptyText;
    }

    if (source.startsWith("data:image/")) {
      return "Ảnh đã tải lên từ máy tính.";
    }

    const parts = source.split(/[\\/]/);
    return `Đang dùng: ${parts[parts.length - 1]}`;
  }

  function syncPreview() {
    const source = hiddenInput.value.trim();
    preview.src = source || fallbackPath;
    meta.textContent = getSourceLabel(source);
    clearButton.disabled = !source;
    dropzone.classList.toggle("image-dropzone-empty", !source);
  }

  async function readFile(file) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      showAlert("admin-alert", "Chỉ có thể tải tệp ảnh cho poster và banner.", "danger");
      fileInput.value = "";
      return;
    }

    pendingRead = new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = () => {
        hiddenInput.value = String(reader.result || "");
        fileInput.value = "";
        syncPreview();
        resolve();
      };

      reader.onerror = () => {
        showAlert("admin-alert", "Không thể đọc tệp ảnh vừa chọn.", "danger");
        fileInput.value = "";
        resolve();
      };

      reader.readAsDataURL(file);
    });

    await pendingRead;
  }

  function openPicker() {
    fileInput.click();
  }

  dropzone.addEventListener("click", () => {
    openPicker();
  });

  dropzone.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openPicker();
  });

  dropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropzone.classList.add("drag-over");
  });

  dropzone.addEventListener("dragleave", () => {
    dropzone.classList.remove("drag-over");
  });

  dropzone.addEventListener("drop", async (event) => {
    event.preventDefault();
    dropzone.classList.remove("drag-over");
    await readFile(event.dataTransfer?.files?.[0]);
  });

  fileInput.addEventListener("change", async () => {
    await readFile(fileInput.files?.[0]);
  });

  clearButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hiddenInput.value = "";
    fileInput.value = "";
    syncPreview();
  });

  syncPreview();

  return {
    getValue() {
      return hiddenInput.value.trim();
    },
    reset() {
      hiddenInput.value = "";
      fileInput.value = "";
      syncPreview();
    },
    setValue(value) {
      hiddenInput.value = String(value || "").trim();
      fileInput.value = "";
      syncPreview();
    },
    settle() {
      return pendingRead;
    }
  };
}
