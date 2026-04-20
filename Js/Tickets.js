document.addEventListener("DOMContentLoaded", () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Tickets.html")}&reason=tickets`;
    return;
  }

  const tableBody = document.getElementById("tickets-table-body");
  const cardList = document.getElementById("ticket-card-list");
  const highlightedTicketCode = getQueryParam("ticketCode");
  const ticketDetailModalElement = document.getElementById("ticket-detail-modal");
  const ticketDetailTitle = document.getElementById("ticket-detail-modal-title");
  const ticketDetailSubtitle = document.getElementById("ticket-detail-modal-subtitle");
  const ticketDetailInfo = document.getElementById("ticket-detail-info");
  const ticketDetailQrImage = document.getElementById("ticket-detail-qr-image");
  const ticketDetailModal = ticketDetailModalElement ? bootstrap.Modal.getOrCreateInstance(ticketDetailModalElement) : null;

  if (!tableBody || !cardList || !ticketDetailTitle || !ticketDetailSubtitle || !ticketDetailInfo || !ticketDetailQrImage) {
    return;
  }

  renderTickets();

  tableBody.addEventListener("click", handleTicketActions);
  cardList.addEventListener("click", handleTicketActions);

  function renderTickets() {
    const bookings = getBookingsByUser(currentUser);

    if (bookings.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8">
            <div class="empty-state my-3">
              <i class="bi bi-ticket-perforated"></i>
              <h3 class="h5 mb-2">Tài khoản của bạn chưa có vé nào</h3>
              <p class="mb-0">Hãy đặt vé bằng tài khoản hiện tại để xem lịch sử mua vé của bạn.</p>
            </div>
          </td>
        </tr>
      `;
      cardList.innerHTML = renderEmptyState("Tài khoản của bạn chưa có vé nào", "Hãy quay lại trang phim để đặt vé bằng tài khoản hiện tại.");
      return;
    }

    tableBody.innerHTML = bookings
      .map((booking) => {
        const isHighlighted = booking.ticketCode === highlightedTicketCode;

        return `
          <tr class="${isHighlighted ? "ticket-highlight" : ""}">
            <td><strong>${escapeHtml(booking.ticketCode)}</strong></td>
            <td>${escapeHtml(booking.customerName)}</td>
            <td>${escapeHtml(booking.movieTitle)}</td>
            <td>${escapeHtml(formatDate(booking.date))} - ${escapeHtml(booking.time)} - ${escapeHtml(booking.room)}</td>
            <td>${escapeHtml(booking.seats.join(", "))}</td>
            <td>${escapeHtml(formatCurrency(booking.totalPrice))}</td>
            <td>${escapeHtml(formatDateTime(booking.bookedAt))}</td>
            <td>
              <div class="ticket-action-group">
                <button class="btn btn-sm btn-cine-outline show-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">
                  Mã vé
                </button>
                <button class="btn btn-sm btn-outline-danger cancel-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">
                  Hủy vé
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");

    cardList.innerHTML = bookings
      .map((booking) => {
        const isHighlighted = booking.ticketCode === highlightedTicketCode;

        return `
          <div class="col-12">
            <article class="ticket-card ${isHighlighted ? "ticket-highlight" : ""}">
              <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <span class="section-subtitle mb-2">Mã vé</span>
                  <h3 class="h5 mb-0">${escapeHtml(booking.ticketCode)}</h3>
                </div>
                <div class="ticket-action-group">
                  <button class="btn btn-sm btn-cine-outline show-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">Mã vé</button>
                  <button class="btn btn-sm btn-outline-danger cancel-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">Hủy</button>
                </div>
              </div>
              <div class="summary-list">
                <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(booking.customerName)}</strong></div>
                <div class="summary-item"><span>Phim</span><strong>${escapeHtml(booking.movieTitle)}</strong></div>
                <div class="summary-item"><span>Suất chiếu</span><strong>${escapeHtml(formatDate(booking.date))} - ${escapeHtml(booking.time)}</strong></div>
                <div class="summary-item"><span>Phòng</span><strong>${escapeHtml(booking.room)}</strong></div>
                <div class="summary-item"><span>Ghế</span><strong>${escapeHtml(booking.seats.join(", "))}</strong></div>
                <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(booking.totalPrice))}</strong></div>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  function handleTicketActions(event) {
    const showButton = event.target.closest(".show-ticket-btn");
    const cancelButton = event.target.closest(".cancel-ticket-btn");

    if (showButton) {
      const ticketCode = showButton.dataset.ticketCode;
      const ticket = getBookingsByUser(currentUser).find((booking) => booking.ticketCode === ticketCode);

      if (!ticket) {
        showAlert("tickets-alert", "Không tìm thấy thông tin vé.", "danger");
        return;
      }

      openTicketDetail(ticket);
      return;
    }

    if (!cancelButton) {
      return;
    }

    const ticketCode = cancelButton.dataset.ticketCode;
    const ticket = getBookingsByUser(currentUser).find((booking) => booking.ticketCode === ticketCode);

    if (!ticket) {
      showAlert("tickets-alert", "Bạn không có quyền thao tác với vé này.", "danger");
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn hủy vé ${ticketCode} không?`);

    if (!confirmed) {
      return;
    }

    const removed = removeBooking(ticketCode);

    if (removed) {
      showAlert("tickets-alert", `Đã hủy vé ${ticketCode} và giải phóng ghế thành công.`, "success");
      renderTickets();
    } else {
      showAlert("tickets-alert", "Không tìm thấy vé cần hủy.", "danger");
    }
  }

  function openTicketDetail(ticket) {
    const qrPayload = buildTicketQrPayload(ticket);
    ticketDetailQrImage.src = `https://quickchart.io/qr?size=280&text=${encodeURIComponent(qrPayload)}`;
    ticketDetailQrImage.alt = `QR vé ${ticket.ticketCode}`;

    ticketDetailTitle.textContent = `Mã vé: ${ticket.ticketCode}`;
    ticketDetailSubtitle.textContent = ticket.movieTitle;
    ticketDetailInfo.innerHTML = `
      <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(ticket.customerName)}</strong></div>
      <div class="summary-item"><span>Suất chiếu</span><strong>${escapeHtml(formatDate(ticket.date))} - ${escapeHtml(ticket.time)}</strong></div>
      <div class="summary-item"><span>Phòng</span><strong>${escapeHtml(ticket.room)}</strong></div>
      <div class="summary-item"><span>Ghế</span><strong>${escapeHtml(ticket.seats.join(", "))}</strong></div>
      <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(ticket.totalPrice))}</strong></div>
      <div class="summary-item"><span>Ngày đặt</span><strong>${escapeHtml(formatDateTime(ticket.bookedAt))}</strong></div>
    `;

    ticketDetailModal?.show();
  }

  function buildTicketQrPayload(ticket) {
    return [
      "CINEHUB",
      ticket.ticketCode,
      ticket.movieTitle,
      `${ticket.date} ${ticket.time}`,
      ticket.room,
      ticket.seats.join("-"),
      ticket.customerName
    ].join("|");
  }
});
