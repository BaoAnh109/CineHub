document.addEventListener("DOMContentLoaded", () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Tickets.html")}&reason=tickets`;
    return;
  }

  const ticketTableBody = document.getElementById("tickets-table-body");
  const ticketCardList = document.getElementById("ticket-card-list");
  const comboTableBody = document.getElementById("combo-orders-table-body");
  const comboCardList = document.getElementById("combo-order-card-list");
  const highlightedTicketCode = getQueryParam("ticketCode");
  const highlightedComboOrderCode = getQueryParam("comboOrderCode");

  const ticketDetailModalElement = document.getElementById("ticket-detail-modal");
  const ticketDetailTitle = document.getElementById("ticket-detail-modal-title");
  const ticketDetailSubtitle = document.getElementById("ticket-detail-modal-subtitle");
  const ticketDetailInfo = document.getElementById("ticket-detail-info");
  const ticketDetailQrImage = document.getElementById("ticket-detail-qr-image");
  const ticketDetailModal = ticketDetailModalElement
    ? bootstrap.Modal.getOrCreateInstance(ticketDetailModalElement)
    : null;

  if (
    !ticketTableBody ||
    !ticketCardList ||
    !comboTableBody ||
    !comboCardList ||
    !ticketDetailTitle ||
    !ticketDetailSubtitle ||
    !ticketDetailInfo ||
    !ticketDetailQrImage
  ) {
    return;
  }

  renderTickets();
  renderComboOrders();

  ticketTableBody.addEventListener("click", handleTicketActions);
  ticketCardList.addEventListener("click", handleTicketActions);
  comboTableBody.addEventListener("click", handleComboOrderActions);
  comboCardList.addEventListener("click", handleComboOrderActions);

  function renderTickets() {
    const bookings = getBookingsByUser(currentUser);

    if (bookings.length === 0) {
      ticketTableBody.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="empty-state my-3">
              <i class="bi bi-ticket-perforated"></i>
              <h3 class="h5 mb-2">Tài khoản của bạn chưa có vé nào</h3>
              <p class="mb-0">Hãy đặt vé bằng tài khoản hiện tại để xem lịch sử mua vé của bạn.</p>
            </div>
          </td>
        </tr>
      `;
      ticketCardList.innerHTML = renderEmptyState(
        "Tài khoản của bạn chưa có vé nào",
        "Hãy quay lại trang phim để đặt vé bằng tài khoản hiện tại."
      );
      return;
    }

    ticketTableBody.innerHTML = bookings
      .map((booking) => {
        const isHighlighted = booking.ticketCode === highlightedTicketCode;

        return `
          <tr class="${isHighlighted ? "ticket-highlight" : ""}">
            <td><strong>${escapeHtml(booking.ticketCode)}</strong></td>
            <td>${escapeHtml(booking.customerName)}</td>
            <td>${escapeHtml(booking.movieTitle)}</td>
            <td>${escapeHtml(formatDate(booking.date))} - ${escapeHtml(booking.time)} - ${escapeHtml(booking.room)}</td>
            <td>${escapeHtml(booking.seats.join(", "))}</td>
            <td>${escapeHtml(formatComboLabel(booking))}</td>
            <td>${escapeHtml(formatCurrency(getBookingTotalPrice(booking)))}</td>
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

    ticketCardList.innerHTML = bookings
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
                <div class="summary-item"><span>Combo</span><strong>${escapeHtml(formatComboLabel(booking))}</strong></div>
                <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(getBookingTotalPrice(booking)))}</strong></div>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  function renderComboOrders() {
    const comboOrders = getComboOrdersByUser(currentUser);

    if (comboOrders.length === 0) {
      comboTableBody.innerHTML = `
        <tr>
          <td colspan="6">
            <div class="empty-state my-3">
              <i class="bi bi-cup-straw"></i>
              <h3 class="h5 mb-2">Bạn chưa có đơn combo nào</h3>
              <p class="mb-0">Hãy vào trang combo để đặt combo riêng và nhận mã QR lấy combo.</p>
            </div>
          </td>
        </tr>
      `;
      comboCardList.innerHTML = renderEmptyState(
        "Bạn chưa có đơn combo nào",
        "Hãy vào trang combo để đặt combo riêng và nhận mã QR lấy combo."
      );
      return;
    }

    comboTableBody.innerHTML = comboOrders
      .map((order) => {
        const isHighlighted = order.orderCode === highlightedComboOrderCode;

        return `
          <tr class="${isHighlighted ? "ticket-highlight" : ""}">
            <td><strong>${escapeHtml(order.orderCode)}</strong></td>
            <td>${escapeHtml(order.customerName || currentUser.fullName || "")}</td>
            <td>${escapeHtml(formatComboOrderItemsLabel(order))}</td>
            <td>${escapeHtml(formatCurrency(getComboOrderTotalPrice(order)))}</td>
            <td>${escapeHtml(formatDateTime(order.orderedAt))}</td>
            <td>
              <button class="btn btn-sm btn-cine-outline show-combo-order-btn" data-order-code="${escapeHtml(order.orderCode)}">
                Mã combo
              </button>
            </td>
          </tr>
        `;
      })
      .join("");

    comboCardList.innerHTML = comboOrders
      .map((order) => {
        const isHighlighted = order.orderCode === highlightedComboOrderCode;

        return `
          <div class="col-12">
            <article class="ticket-card ${isHighlighted ? "ticket-highlight" : ""}">
              <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
                <div>
                  <span class="section-subtitle mb-2">Mã combo</span>
                  <h3 class="h5 mb-0">${escapeHtml(order.orderCode)}</h3>
                </div>
                <button class="btn btn-sm btn-cine-outline show-combo-order-btn" data-order-code="${escapeHtml(order.orderCode)}">
                  Mã combo
                </button>
              </div>
              <div class="summary-list">
                <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(order.customerName || currentUser.fullName || "")}</strong></div>
                <div class="summary-item"><span>Chi tiết combo</span><strong>${escapeHtml(formatComboOrderItemsLabel(order))}</strong></div>
                <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(getComboOrderTotalPrice(order)))}</strong></div>
                <div class="summary-item"><span>Ngày đặt</span><strong>${escapeHtml(formatDateTime(order.orderedAt))}</strong></div>
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

  function handleComboOrderActions(event) {
    const showButton = event.target.closest(".show-combo-order-btn");

    if (!showButton) {
      return;
    }

    const orderCode = showButton.dataset.orderCode;
    const order = getComboOrdersByUser(currentUser).find((item) => item.orderCode === orderCode);

    if (!order) {
      showAlert("tickets-alert", "Không tìm thấy thông tin đơn combo.", "danger");
      return;
    }

    openComboOrderDetail(order);
  }

  function openTicketDetail(ticket) {
    const qrPayload = buildTicketQrPayload(ticket);
    ticketDetailQrImage.src = `https://quickchart.io/qr?size=280&text=${encodeURIComponent(qrPayload)}`;
    ticketDetailQrImage.alt = `QR vé ${ticket.ticketCode}`;

    ticketDetailTitle.textContent = `Mã vé: ${ticket.ticketCode}`;
    ticketDetailSubtitle.textContent = ticket.movieTitle;
    const comboSummary = formatComboLabel(ticket);

    ticketDetailInfo.innerHTML = `
      <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(ticket.customerName)}</strong></div>
      <div class="summary-item"><span>Suất chiếu</span><strong>${escapeHtml(formatDate(ticket.date))} - ${escapeHtml(ticket.time)}</strong></div>
      <div class="summary-item"><span>Phòng</span><strong>${escapeHtml(ticket.room)}</strong></div>
      <div class="summary-item"><span>Ghế</span><strong>${escapeHtml(ticket.seats.join(", "))}</strong></div>
      <div class="summary-item"><span>Tiền vé</span><strong>${escapeHtml(formatCurrency(ticket.seatTotalPrice || ticket.totalPrice || 0))}</strong></div>
      <div class="summary-item"><span>Combo</span><strong>${escapeHtml(comboSummary)}</strong></div>
      <div class="summary-item"><span>Tiền combo</span><strong>${escapeHtml(formatCurrency(ticket.comboTotalPrice || 0))}</strong></div>
      <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(getBookingTotalPrice(ticket)))}</strong></div>
      <div class="summary-item"><span>Ngày đặt</span><strong>${escapeHtml(formatDateTime(ticket.bookedAt))}</strong></div>
    `;

    ticketDetailModal?.show();
  }

  function openComboOrderDetail(order) {
    const qrPayload = buildComboOrderQrPayload(order);
    const comboLabel = formatComboOrderItemsLabel(order);

    ticketDetailQrImage.src = `https://quickchart.io/qr?size=280&text=${encodeURIComponent(qrPayload)}`;
    ticketDetailQrImage.alt = `QR đơn combo ${order.orderCode}`;

    ticketDetailTitle.textContent = `Mã combo: ${order.orderCode}`;
    ticketDetailSubtitle.textContent = "Quét mã tại quầy để nhận combo";

    ticketDetailInfo.innerHTML = `
      <div class="summary-item"><span>Khách hàng</span><strong>${escapeHtml(order.customerName || currentUser.fullName || "")}</strong></div>
      <div class="summary-item"><span>Số điện thoại</span><strong>${escapeHtml(order.customerPhone || "Không có")}</strong></div>
      <div class="summary-item"><span>Email</span><strong>${escapeHtml(order.customerEmail || "Không có")}</strong></div>
      <div class="summary-item"><span>Chi tiết combo</span><strong>${escapeHtml(comboLabel)}</strong></div>
      <div class="summary-item"><span>Tổng tiền</span><strong>${escapeHtml(formatCurrency(getComboOrderTotalPrice(order)))}</strong></div>
      <div class="summary-item"><span>Ngày đặt</span><strong>${escapeHtml(formatDateTime(order.orderedAt))}</strong></div>
    `;

    ticketDetailModal?.show();
  }

  function buildTicketQrPayload(ticket) {
    return [
      "CINEHUB_TICKET",
      ticket.ticketCode,
      ticket.movieTitle,
      `${ticket.date} ${ticket.time}`,
      ticket.room,
      ticket.seats.join("-"),
      formatComboLabel(ticket),
      ticket.customerName
    ].join("|");
  }

  function buildComboOrderQrPayload(order) {
    return [
      "CINEHUB_COMBO",
      order.orderCode,
      order.customerName || "",
      order.customerPhone || "",
      formatComboOrderItemsLabel(order),
      getComboOrderTotalPrice(order)
    ].join("|");
  }
});

function formatComboLabel(booking) {
  const combos = Array.isArray(booking.combos) ? booking.combos : [];

  if (combos.length === 0) {
    return "Không";
  }

  return combos.map((combo) => `${combo.name} x${combo.quantity}`).join(", ");
}

function getBookingTotalPrice(booking) {
  if (typeof booking.totalPrice === "number") {
    return booking.totalPrice;
  }

  const seatTotal = Number(booking.seatTotalPrice || 0);
  const comboTotal = Number(booking.comboTotalPrice || 0);
  return seatTotal + comboTotal;
}

function formatComboOrderItemsLabel(order) {
  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    return "Không có dữ liệu";
  }

  return items.map((item) => `${item.name} x${item.quantity}`).join(", ");
}

function getComboOrderTotalPrice(order) {
  if (typeof order.totalPrice === "number") {
    return order.totalPrice;
  }

  const items = Array.isArray(order.items) ? order.items : [];
  return items.reduce((total, item) => {
    const unitPrice = Number(item.unitPrice || 0);
    const quantity = Number(item.quantity || 0);
    return total + unitPrice * quantity;
  }, 0);
}
