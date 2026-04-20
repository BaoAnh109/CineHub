document.addEventListener("DOMContentLoaded", async () => {
  const bookingForm = document.getElementById("booking-form");
  const bookingSummary = document.getElementById("booking-summary");
  const backToSeatButton = document.getElementById("back-to-seat-btn");
  const paymentQrImage = document.getElementById("payment-qr-image");
  const paymentBankNameElement = document.getElementById("payment-bank-name");
  const paymentBankAccountElement = document.getElementById("payment-bank-account");
  const paymentTransferContentElement = document.getElementById("payment-transfer-content");
  const paymentTransferAmountElement = document.getElementById("payment-transfer-amount");
  const copyTransferContentButton = document.getElementById("copy-transfer-content-btn");
  const qrPaidCheck = document.getElementById("qr-paid-check");

  if (!bookingForm || !bookingSummary) {
    return;
  }

  const draft = getBookingDraft();
  const movieId = getQueryParam("id") || draft?.movieId;
  const showtimeId = getQueryParam("showtimeId") || draft?.showtimeId;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl(
      "login",
      `Booking.html?id=${encodeURIComponent(movieId || "")}&showtimeId=${encodeURIComponent(showtimeId || "")}`
    )}&reason=tickets`;
    return;
  }

  if (!draft || !Array.isArray(draft.selectedSeats) || draft.selectedSeats.length === 0) {
    bookingSummary.innerHTML = renderEmptyState(
      "Chưa có thông tin đặt vé",
      "Hãy quay lại bước chọn ghế trước khi thanh toán."
    );
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
      bookingSummary.innerHTML = renderEmptyState(
        "Thiếu dữ liệu phim hoặc suất chiếu",
        "Hãy quay lại chọn lịch chiếu."
      );
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
    const paymentContext = renderQrPayment(showtime, draft);

    if (copyTransferContentButton) {
      copyTransferContentButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(paymentContext.transferContent);
          showAlert("booking-alert", "Đã sao chép nội dung chuyển khoản.", "success");
        } catch (error) {
          console.error(error);
          showAlert("booking-alert", "Không thể sao chép. Hãy sao chép thủ công nội dung chuyển khoản.", "warning");
        }
      });
    }

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

      if (qrPaidCheck && !qrPaidCheck.checked) {
        showAlert("booking-alert", "Vui lòng xác nhận đã thanh toán QR trước khi hoàn tất đặt vé.", "danger");
        return;
      }

      // Kiem tra lai ghe da dat de tranh truong hop nguoi dung mo nhieu tab cung luc.
      const currentBookedSeats = getBookedSeats(draft.showtimeKey);
      const invalidSeats = draft.selectedSeats.filter((seat) => currentBookedSeats.includes(seat));

      if (invalidSeats.length > 0) {
        showAlert(
          "booking-alert",
          `Ghế ${invalidSeats.join(", ")} đã có người đặt trước. Hãy chọn lại ghế khác.`,
          "danger"
        );
        return;
      }

      const paidAt = new Date().toISOString();
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
        bookedAt: paidAt,
        showtimeKey: draft.showtimeKey,
        paymentMethod: "qr",
        paymentStatus: "paid",
        paymentTransferContent: paymentContext.transferContent,
        paidAt
      };

      addBooking(booking);
      saveBookedSeats(draft.showtimeKey, [...currentBookedSeats, ...draft.selectedSeats]);
      saveLastCustomerInfo({ customerName, customerPhone, customerEmail });
      clearBookingDraft();

      showAlert("booking-alert", "Thanh toán thành công. Hệ thống đang chuyển bạn sang trang vé đã đặt.", "success");

      setTimeout(() => {
        window.location.href = `Tickets.html?ticketCode=${encodeURIComponent(booking.ticketCode)}`;
      }, 1200);
    });
  } catch (error) {
    console.error(error);
    bookingSummary.innerHTML = renderEmptyState(
      "Không thể tải thông tin thanh toán",
      "Hãy kiểm tra dữ liệu và thử lại."
    );
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

  function renderQrPayment(showtime, currentDraft) {
    const BANK_NAME = "MB Bank (Demo)";
    const BANK_CODE = "MB";
    const ACCOUNT_NUMBER = "1900123456789";
    const ACCOUNT_NAME = "CINEHUB MOVIE";

    const amount = showtime.price * currentDraft.selectedSeats.length;
    const transferContent = buildTransferContent(showtime.id, currentDraft.selectedSeats);
    const qrUrl = buildVietQrImageUrl({
      bankCode: BANK_CODE,
      accountNumber: ACCOUNT_NUMBER,
      accountName: ACCOUNT_NAME,
      amount,
      transferContent
    });

    if (paymentQrImage) {
      paymentQrImage.src = qrUrl;
      paymentQrImage.alt = `Mã QR thanh toán ${formatCurrency(amount)}`;
    }

    if (paymentBankNameElement) {
      paymentBankNameElement.textContent = BANK_NAME;
    }

    if (paymentBankAccountElement) {
      paymentBankAccountElement.textContent = ACCOUNT_NUMBER;
    }

    if (paymentTransferContentElement) {
      paymentTransferContentElement.textContent = transferContent;
    }

    if (paymentTransferAmountElement) {
      paymentTransferAmountElement.textContent = formatCurrency(amount);
    }

    return {
      amount,
      transferContent
    };
  }
});

function buildTransferContent(showtimeId, seats) {
  const sanitizedShowtimeId = String(showtimeId || "").replace(/\s+/g, "");
  const seatCode = (Array.isArray(seats) ? seats : []).join("").replace(/\s+/g, "");
  return `CINEHUB ${sanitizedShowtimeId} ${seatCode}`.trim();
}

function buildVietQrImageUrl({ bankCode, accountNumber, accountName, amount, transferContent }) {
  const encodedInfo = encodeURIComponent(String(transferContent || ""));
  const encodedAccountName = encodeURIComponent(String(accountName || ""));
  const normalizedAmount = Number(amount || 0);

  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(
    accountNumber
  )}-compact2.png?amount=${normalizedAmount}&addInfo=${encodedInfo}&accountName=${encodedAccountName}`;
}
