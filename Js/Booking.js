document.addEventListener("DOMContentLoaded", async () => {
  const bookingForm = document.getElementById("booking-form");
  const bookingSummary = document.getElementById("booking-summary");
  const bookingComboList = document.getElementById("booking-combo-list");
  const backToSeatButton = document.getElementById("back-to-seat-btn");
  const paymentQrImage = document.getElementById("payment-qr-image");
  const paymentBankNameElement = document.getElementById("payment-bank-name");
  const paymentBankAccountElement = document.getElementById("payment-bank-account");
  const paymentTransferContentElement = document.getElementById("payment-transfer-content");
  const paymentTransferAmountElement = document.getElementById("payment-transfer-amount");
  const copyTransferContentButton = document.getElementById("copy-transfer-content-btn");
  const qrPaidCheck = document.getElementById("qr-paid-check");

  if (!bookingForm || !bookingSummary || !bookingComboList) {
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
    const [movies, showtimes, combos] = await Promise.all([getMovies(), getShowtimes(), getCombos()]);
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

    const comboMap = new Map(combos.map((combo) => [combo.id, combo]));
    const selectedCombos = normalizeSelectedCombos(draft.selectedCombos, combos);

    renderComboSelector();
    let paymentContext = refreshOrderView();

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

    bookingComboList.addEventListener("click", (event) => {
      const actionButton = event.target.closest("[data-combo-action]");

      if (!actionButton) {
        return;
      }

      const comboId = actionButton.dataset.comboId;
      const action = actionButton.dataset.comboAction;
      const combo = comboMap.get(comboId);

      if (!combo) {
        return;
      }

      const currentQuantity = Number(selectedCombos[comboId] || 0);
      const nextQuantity = action === "increase" ? currentQuantity + 1 : Math.max(currentQuantity - 1, 0);

      if (nextQuantity > 0) {
        selectedCombos[comboId] = nextQuantity;
      } else {
        delete selectedCombos[comboId];
      }

      renderComboSelector();
      paymentContext = refreshOrderView();
    });

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

      const totals = calculateTotals(showtime, draft.selectedSeats, selectedCombos, comboMap);
      const comboItems = buildComboItems(selectedCombos, comboMap);
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
        seatTotalPrice: totals.seatAmount,
        combos: comboItems,
        comboTotalPrice: totals.comboAmount,
        totalPrice: totals.totalAmount,
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

    function renderComboSelector() {
      if (combos.length === 0) {
        bookingComboList.innerHTML = renderEmptyState("Chưa có combo", "Vui lòng quay lại sau để chọn thêm bắp nước.");
        return;
      }

      bookingComboList.innerHTML = combos
        .map((combo) => {
          const quantity = Number(selectedCombos[combo.id] || 0);

          return `
            <article class="combo-inline-item ${combo.isFeatured ? "featured" : ""}">
              <div class="combo-inline-head">
                <div>
                  <h3>${escapeHtml(combo.name)}</h3>
                  <p class="mb-0">${escapeHtml(combo.description || "")}</p>
                </div>
                ${combo.badge ? `<span class="badge-soft">${escapeHtml(combo.badge)}</span>` : ""}
              </div>
              <div class="combo-inline-footer">
                <strong>${escapeHtml(formatCurrency(combo.price))}</strong>
                <div class="combo-qty-control">
                  <button type="button" class="btn btn-cine-outline btn-sm" data-combo-action="decrease" data-combo-id="${escapeHtml(combo.id)}">-</button>
                  <span>${escapeHtml(String(quantity))}</span>
                  <button type="button" class="btn btn-cine-primary btn-sm" data-combo-action="increase" data-combo-id="${escapeHtml(combo.id)}">+</button>
                </div>
              </div>
            </article>
          `;
        })
        .join("");
    }

    function refreshOrderView() {
      const totals = calculateTotals(showtime, draft.selectedSeats, selectedCombos, comboMap);
      const comboItems = buildComboItems(selectedCombos, comboMap);

      draft.selectedCombos = { ...selectedCombos };
      draft.seatTotalAmount = totals.seatAmount;
      draft.comboTotalAmount = totals.comboAmount;
      draft.totalAmount = totals.totalAmount;
      setBookingDraft(draft);

      renderSummary(movie, showtime, draft.selectedSeats, comboItems, totals);
      return renderQrPayment(totals.totalAmount, showtime, draft.selectedSeats, comboItems);
    }
  } catch (error) {
    console.error(error);
    bookingSummary.innerHTML = renderEmptyState(
      "Không thể tải thông tin thanh toán",
      "Hãy kiểm tra dữ liệu và thử lại."
    );
    bookingForm.classList.add("d-none");
  }

  function renderSummary(movie, showtime, selectedSeats, comboItems, totals) {
    const comboSummaryHtml =
      comboItems.length > 0
        ? `
          <hr class="border-secondary-subtle" />
          <div>
            <h3 class="h6 mb-2">Combo đã chọn</h3>
            <div class="summary-list">
              ${comboItems
                .map(
                  (item) => `
                    <div class="summary-item">
                      <span>${escapeHtml(item.name)} x${escapeHtml(String(item.quantity))}</span>
                      <strong>${escapeHtml(formatCurrency(item.totalPrice))}</strong>
                    </div>
                  `
                )
                .join("")}
            </div>
          </div>
        `
        : "";

    bookingSummary.innerHTML = `
      <div class="summary-list">
        <div class="summary-item"><span>Phim</span><strong>${escapeHtml(movie.title)}</strong></div>
        <div class="summary-item"><span>Ngày chiếu</span><strong>${escapeHtml(formatDate(showtime.date))}</strong></div>
        <div class="summary-item"><span>Giờ chiếu</span><strong>${escapeHtml(showtime.time)}</strong></div>
        <div class="summary-item"><span>Phòng chiếu</span><strong>${escapeHtml(showtime.room)}</strong></div>
        <div class="summary-item"><span>Ghế</span><strong>${escapeHtml(selectedSeats.join(", "))}</strong></div>
        <div class="summary-item"><span>Tiền vé</span><strong>${escapeHtml(formatCurrency(totals.seatAmount))}</strong></div>
        <div class="summary-item"><span>Tiền combo</span><strong>${escapeHtml(formatCurrency(totals.comboAmount))}</strong></div>
      </div>
      ${comboSummaryHtml}
      <hr class="border-secondary-subtle" />
      <div class="total-box">
        <span>Tổng cộng</span>
        <strong>${escapeHtml(formatCurrency(totals.totalAmount))}</strong>
      </div>
    `;
  }

  function renderQrPayment(totalAmount, showtime, selectedSeats, comboItems) {
    const BANK_NAME = "MB Bank (Demo)";
    const BANK_CODE = "MB";
    const ACCOUNT_NUMBER = "1900123456789";
    const ACCOUNT_NAME = "CINEHUB MOVIE";

    const comboCount = comboItems.reduce((total, item) => total + item.quantity, 0);
    const transferContent = buildTransferContent(showtime.id, selectedSeats, comboCount);
    const qrUrl = buildVietQrImageUrl({
      bankCode: BANK_CODE,
      accountNumber: ACCOUNT_NUMBER,
      accountName: ACCOUNT_NAME,
      amount: totalAmount,
      transferContent
    });

    if (paymentQrImage) {
      paymentQrImage.src = qrUrl;
      paymentQrImage.alt = `Mã QR thanh toán ${formatCurrency(totalAmount)}`;
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
      paymentTransferAmountElement.textContent = formatCurrency(totalAmount);
    }

    return {
      amount: totalAmount,
      transferContent
    };
  }
});

function normalizeSelectedCombos(rawSelection, combos) {
  const comboIds = new Set(combos.map((combo) => combo.id));

  if (!rawSelection || typeof rawSelection !== "object") {
    return {};
  }

  return Object.entries(rawSelection).reduce((result, [comboId, quantity]) => {
    const parsedQuantity = Math.max(Number(quantity || 0), 0);

    if (comboIds.has(comboId) && parsedQuantity > 0) {
      result[comboId] = parsedQuantity;
    }

    return result;
  }, {});
}

function buildComboItems(selectedCombos, comboMap) {
  return Object.entries(selectedCombos)
    .map(([comboId, quantity]) => {
      const combo = comboMap.get(comboId);
      const normalizedQuantity = Number(quantity || 0);

      if (!combo || normalizedQuantity <= 0) {
        return null;
      }

      return {
        id: combo.id,
        name: combo.name,
        quantity: normalizedQuantity,
        unitPrice: Number(combo.price || 0),
        totalPrice: Number(combo.price || 0) * normalizedQuantity
      };
    })
    .filter(Boolean);
}

function calculateTotals(showtime, selectedSeats, selectedCombos, comboMap) {
  const seatAmount = Number(showtime.price || 0) * selectedSeats.length;
  const comboAmount = buildComboItems(selectedCombos, comboMap).reduce((total, item) => total + item.totalPrice, 0);

  return {
    seatAmount,
    comboAmount,
    totalAmount: seatAmount + comboAmount
  };
}

function buildTransferContent(showtimeId, seats, comboCount) {
  const sanitizedShowtimeId = String(showtimeId || "").replace(/\s+/g, "");
  const seatCode = (Array.isArray(seats) ? seats : []).join("").replace(/\s+/g, "");
  const normalizedComboCount = Number(comboCount || 0);
  const comboPart = normalizedComboCount > 0 ? ` C${normalizedComboCount}` : "";
  return `CINEHUB ${sanitizedShowtimeId} ${seatCode}${comboPart}`.trim();
}

function buildVietQrImageUrl({ bankCode, accountNumber, accountName, amount, transferContent }) {
  const encodedInfo = encodeURIComponent(String(transferContent || ""));
  const encodedAccountName = encodeURIComponent(String(accountName || ""));
  const normalizedAmount = Number(amount || 0);

  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(
    accountNumber
  )}-compact2.png?amount=${normalizedAmount}&addInfo=${encodedInfo}&accountName=${encodedAccountName}`;
}
