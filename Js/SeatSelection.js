document.addEventListener("DOMContentLoaded", async () => {
  const seatSummary = document.getElementById("seat-movie-summary");
  const selectedShowtime = document.getElementById("selected-showtime");
  const seatMap = document.getElementById("seat-map");
  const selectedSeatsContainer = document.getElementById("selected-seats");
  const totalPriceElement = document.getElementById("seat-total-price");
  const confirmButton = document.getElementById("confirm-seat-btn");

  if (!seatMap) {
    return;
  }

  const rows = ["A", "B", "C", "D", "E", "F"];
  const seatsPerRow = 8;
  const movieId = getQueryParam("id");
  const showtimeId = getQueryParam("showtimeId");

  try {
    await window.appReady;
    const [movies, showtimes] = await Promise.all([getMovies(), getShowtimes()]);
    const movie = movies.find((item) => item.id === movieId);
    const showtime = showtimes.find((item) => item.id === showtimeId);

    if (!movie || !showtime) {
      seatMap.innerHTML = renderEmptyState("Thiếu thông tin lịch chiếu", "Hãy quay lại bước chọn lịch chiếu.");
      confirmButton.disabled = true;
      return;
    }

    const showtimeKey = buildShowtimeKey(showtime);
    const bookedSeats = getBookedSeats(showtimeKey);
    const storedDraft = getBookingDraft();

    let selectedSeats =
      storedDraft && storedDraft.showtimeId === showtime.id && Array.isArray(storedDraft.selectedSeats)
        ? [...storedDraft.selectedSeats]
        : [];

    seatSummary.innerHTML = `
      <div class="d-flex flex-column flex-md-row gap-4 align-items-md-center">
        <img src="${escapeHtml(getImagePath(movie.poster, "../Assets/Images/Posters/DefaultPoster.svg"))}" alt="${escapeHtml(movie.title)}" style="width: 120px; border-radius: 18px;" />
        <div>
          <span class="section-subtitle mb-2">Đang đặt vé</span>
          <h1 class="h3 mb-2">${escapeHtml(movie.title)}</h1>
          <p class="mb-0 text-light-emphasis">${escapeHtml(movie.genre)} - ${escapeHtml(movie.duration)} phút</p>
        </div>
      </div>
    `;

    function renderSeatMap() {
      // Tạo sơ đồ ghế theo từng hàng để sinh viên mới học dễ quan sát cấu trúc HTML sinh ra từ JS.
      seatMap.innerHTML = rows
        .map((rowLabel) => {
          const seats = Array.from({ length: seatsPerRow }, (_, index) => {
            const seatCode = `${rowLabel}${index + 1}`;
            const isBooked = bookedSeats.includes(seatCode);
            const isSelected = selectedSeats.includes(seatCode);

            return `
              <button
                type="button"
                class="seat ${isBooked ? "booked" : ""} ${isSelected ? "selected" : ""}"
                data-seat="${seatCode}"
                ${isBooked ? "disabled" : ""}
              >
                ${index + 1}
              </button>
            `;
          }).join("");

          return `
            <div class="seat-row">
              <span class="row-label">${rowLabel}</span>
              ${seats}
            </div>
          `;
        })
        .join("");

      seatMap.querySelectorAll(".seat:not(.booked)").forEach((button) => {
        button.addEventListener("click", () => {
          const seatCode = button.dataset.seat;

          if (selectedSeats.includes(seatCode)) {
            selectedSeats = selectedSeats.filter((seat) => seat !== seatCode);
          } else {
            selectedSeats.push(seatCode);
            selectedSeats.sort();
          }

          renderSeatMap();
          renderSummary();
        });
      });
    }

    function renderSummary() {
      selectedShowtime.innerHTML = `
        <div class="summary-item"><span>Ngày chiếu</span><strong>${escapeHtml(formatDate(showtime.date))}</strong></div>
        <div class="summary-item"><span>Giờ chiếu</span><strong>${escapeHtml(showtime.time)}</strong></div>
        <div class="summary-item"><span>Phòng</span><strong>${escapeHtml(showtime.room)}</strong></div>
        <div class="summary-item"><span>Giá / ghế</span><strong>${escapeHtml(formatCurrency(showtime.price))}</strong></div>
      `;

      if (selectedSeats.length === 0) {
        selectedSeatsContainer.textContent = "Chưa chọn ghế";
      } else {
        selectedSeatsContainer.innerHTML = selectedSeats.map((seat) => `<span>${escapeHtml(seat)}</span>`).join("");
      }

      totalPriceElement.textContent = formatCurrency(showtime.price * selectedSeats.length);
      confirmButton.disabled = selectedSeats.length === 0;
    }

    confirmButton.addEventListener("click", () => {
      setBookingDraft({
        movieId: movie.id,
        movieTitle: movie.title,
        showtimeId: showtime.id,
        date: showtime.date,
        time: showtime.time,
        room: showtime.room,
        price: showtime.price,
        showtimeKey,
        selectedSeats,
        totalAmount: showtime.price * selectedSeats.length
      });

      window.location.href = `Booking.html?id=${encodeURIComponent(movie.id)}&showtimeId=${encodeURIComponent(showtime.id)}`;
    });

    renderSeatMap();
    renderSummary();
  } catch (error) {
    console.error(error);
    seatMap.innerHTML = renderEmptyState("Không thể tải sơ đồ ghế", "Hãy kiểm tra lại dữ liệu lịch chiếu.");
    confirmButton.disabled = true;
  }
});
