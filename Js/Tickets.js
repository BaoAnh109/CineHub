document.addEventListener("DOMContentLoaded", () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Tickets.html")}&reason=tickets`;
    return;
  }

  const tableBody = document.getElementById("tickets-table-body");
  const cardList = document.getElementById("ticket-card-list");
  const highlightedTicketCode = getQueryParam("ticketCode");

  if (!tableBody || !cardList) {
    return;
  }

  renderTickets();

  tableBody.addEventListener("click", handleCancelTicket);
  cardList.addEventListener("click", handleCancelTicket);

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
              <button class="btn btn-sm btn-outline-danger cancel-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">
                Hủy vé
              </button>
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
                <button class="btn btn-sm btn-outline-danger cancel-ticket-btn" data-ticket-code="${escapeHtml(booking.ticketCode)}">Huy</button>
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

  function handleCancelTicket(event) {
    const button = event.target.closest(".cancel-ticket-btn");

    if (!button) {
      return;
    }

    const ticketCode = button.dataset.ticketCode;
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
});
