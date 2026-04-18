document.addEventListener("DOMContentLoaded", async () => {
  const bookingForm = document.getElementById("booking-form");
  const bookingSummary = document.getElementById("booking-summary");
  const backToSeatButton = document.getElementById("back-to-seat-btn");

  if (!bookingForm || !bookingSummary) {
    return;
  }

  const draft = getBookingDraft();
  const movieId = getQueryParam("id") || draft?.movieId;
  const showtimeId = getQueryParam("showtimeId") || draft?.showtimeId;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", `Booking.html?id=${encodeURIComponent(movieId || "")}&showtimeId=${encodeURIComponent(showtimeId || "")}`)}&reason=tickets`;
    return;
  }

  if (!draft || !Array.isArray(draft.selectedSeats) || draft.selectedSeats.length === 0) {
    bookingSummary.innerHTML = renderEmptyState("Chưa có thông tin đặt vé", "Hãy quay lại bước chọn ghế trước khi xác nhận.");
    bookingForm.classList.add("d-none");
    return;
  }

  backToSeatButton.href = `SeatSelection.html?id=${encodeURIComponent(movieId)}&showtimeId=${encodeURIComponent(showtimeId)}`;

  try {
    await window.appReady;
    const [movies, showtimes] = await Promise.all([getMovies(), getShowtimes()]);
    const movie = movies.find((item) => item.id === movieId);
    const showtime = showtimes.find((item) => item.id === showtimeId);

    if (!movie || !showtime) {
      bookingSummary.innerHTML = renderEmptyState("Thiếu dữ liệu phim hoặc suất chiếu", "Hãy quay lại chọn lịch chiếu.");
      bookingForm.classList.add("d-none");
      return;
    }

    const customerNameInput = document.getElementById("customer-name");
    const customerPhoneInput = document.getElementById("customer-phone");
    const customerEmailInput = document.getElementById("customer-email");
    const lastCustomer = getLastCustomerInfo();
    customerNameInput.value = currentUser?.fullName || lastCustomer?.customerName || "";
    customerPhoneInput.value = lastCustomer?.customerPhone || "";
    customerEmailInput.value = currentUser?.email || lastCustomer?.customerEmail || "";

    renderSummary(movie, showtime, draft);

    bookingForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const customerName = customerNameInput.value.trim();
      const customerPhone = customerPhoneInput.value.trim();
      const customerEmail = customerEmailInput.value.trim();

      if (customerName.length < 2) {
        showAlert("booking-alert", "Họ tên phải có ít nhất 2 ký tự.", "danger");
        return;
      }

      if (!/^(0|\+84)\d{8,10}$/.test(customerPhone)) {
        showAlert("booking-alert", "Số điện thoại không hợp lệ.", "danger");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        showAlert("booking-alert", "Email không hợp lệ.", "danger");
        return;
      }

      // Kiểm tra lại ghế đã đặt để tránh trường hợp người dùng mở nhiều tab cùng lúc.
      const currentBookedSeats = getBookedSeats(draft.showtimeKey);
      const invalidSeats = draft.selectedSeats.filter((seat) => currentBookedSeats.includes(seat));

      if (invalidSeats.length > 0) {
        showAlert("booking-alert", `Ghế ${invalidSeats.join(", ")} đã có người đặt trước. Hãy chọn lại ghế khác.`, "danger");
        return;
      }

      const booking = {
        ticketCode: generateTicketCode(),
        ownerId: currentUser.id,
        ownerEmail: currentUser.email,
        ownerName: currentUser.fullName,
        customerName,
        customerPhone,
        customerEmail,
        movieId: movie.id,
        movieTitle: movie.title,
        showtimeId: showtime.id,
        date: showtime.date,
        time: showtime.time,
        room: showtime.room,
        seats: [...draft.selectedSeats],
        totalPrice: showtime.price * draft.selectedSeats.length,
        bookedAt: new Date().toISOString(),
        showtimeKey: draft.showtimeKey
      };

      addBooking(booking);
      saveBookedSeats(draft.showtimeKey, [...currentBookedSeats, ...draft.selectedSeats]);
      saveLastCustomerInfo({ customerName, customerPhone, customerEmail });
      clearBookingDraft();

      showAlert("booking-alert", "Đặt vé thành công. Hệ thống sẽ chuyển bạn sang trang vé đã đặt.", "success");

      setTimeout(() => {
        window.location.href = `Tickets.html?ticketCode=${encodeURIComponent(booking.ticketCode)}`;
      }, 1200);
    });
  } catch (error) {
    console.error(error);
    bookingSummary.innerHTML = renderEmptyState("Không thể tải thông tin đặt vé", "Hãy kiểm tra dữ liệu và thử lại.");
    bookingForm.classList.add("d-none");
  }

  function renderSummary(movie, showtime, currentDraft) {
    bookingSummary.innerHTML = `
      <div class="summary-list">
        <div class="summary-item"><span>Phim</span><strong>${escapeHtml(movie.title)}</strong></div>
        <div class="summary-item"><span>Ngày chiếu</span><strong>${escapeHtml(formatDate(showtime.date))}</strong></div>
        <div class="summary-item"><span>Giờ chiếu</span><strong>${escapeHtml(showtime.time)}</strong></div>
        <div class="summary-item"><span>Phòng chiếu</span><strong>${escapeHtml(showtime.room)}</strong></div>
        <div class="summary-item"><span>Ghế</span><strong>${escapeHtml(currentDraft.selectedSeats.join(", "))}</strong></div>
        <div class="summary-item"><span>Giá mỗi ghế</span><strong>${escapeHtml(formatCurrency(showtime.price))}</strong></div>
      </div>
      <hr class="border-secondary-subtle" />
      <div class="total-box">
        <span>Tổng cộng</span>
        <strong>${escapeHtml(formatCurrency(showtime.price * currentDraft.selectedSeats.length))}</strong>
      </div>
    `;
  }
});
