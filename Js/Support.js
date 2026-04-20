document.addEventListener("DOMContentLoaded", () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Support.html")}&reason=support`;
    return;
  }

  const supportForm = document.getElementById("support-form");
  const requestList = document.getElementById("support-request-list");
  const fullNameInput = document.getElementById("support-full-name");
  const emailInput = document.getElementById("support-email");
  const phoneInput = document.getElementById("support-phone");
  const ticketCodeInput = document.getElementById("support-ticket-code");
  const subjectInput = document.getElementById("support-subject");
  const messageInput = document.getElementById("support-message");

  if (
    !supportForm ||
    !requestList ||
    !fullNameInput ||
    !emailInput ||
    !phoneInput ||
    !ticketCodeInput ||
    !subjectInput ||
    !messageInput
  ) {
    return;
  }

  preloadUserInfo();
  renderRequests();

  supportForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const ticketCode = ticketCodeInput.value.trim().toUpperCase();
    const subject = subjectInput.value.trim();
    const message = messageInput.value.trim();

    if (fullName.length < 2) {
      showAlert("support-alert", "Họ tên phải có ít nhất 2 ký tự.", "danger");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("support-alert", "Email không hợp lệ.", "danger");
      return;
    }

    if (!/^(0|\+84)\d{8,10}$/.test(phone)) {
      showAlert("support-alert", "Số điện thoại không hợp lệ.", "danger");
      return;
    }

    if (!subject) {
      showAlert("support-alert", "Vui lòng chọn chủ đề hỗ trợ.", "danger");
      return;
    }

    if (message.length < 10) {
      showAlert("support-alert", "Nội dung yêu cầu cần tối thiểu 10 ký tự.", "danger");
      return;
    }

    addSupportRequest({
      requestCode: generateSupportRequestCode(),
      ownerId: currentUser.id,
      ownerEmail: currentUser.email,
      fullName,
      email,
      phone,
      ticketCode,
      subject,
      message,
      status: "Mới tiếp nhận",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
      resolvedBy: null
    });

    renderRequests();

    supportForm.reset();
    fullNameInput.value = fullName;
    emailInput.value = email;
    phoneInput.value = phone;

    showAlert("support-alert", "Đã gửi yêu cầu thành công. CineHub sẽ liên hệ bạn sớm nhất.", "success");
  });

  function preloadUserInfo() {
    const lastCustomer = getLastCustomerInfo();

    fullNameInput.value = currentUser?.fullName || lastCustomer?.customerName || "";
    emailInput.value = currentUser?.email || lastCustomer?.customerEmail || "";
    phoneInput.value = lastCustomer?.customerPhone || "";
  }

  function renderRequests() {
    const requests = getSupportRequestsByUser(currentUser);

    if (requests.length === 0) {
      requestList.innerHTML = `
        <div class="empty-state">
          <i class="bi bi-chat-dots"></i>
          <h3 class="h5 mb-2">Chưa có yêu cầu hỗ trợ nào</h3>
          <p class="mb-0">Biểu mẫu bên trên sẽ giúp bạn gửi yêu cầu nhanh tới CineHub.</p>
        </div>
      `;
      return;
    }

    requestList.innerHTML = requests
      .map(
        (request) => `
          <article class="support-request-item">
            <div class="support-request-head">
              <strong>${escapeHtml(request.requestCode)}</strong>
              <span class="badge-soft">${escapeHtml(request.status || "Mới tiếp nhận")}</span>
            </div>
            <div class="summary-list">
              <div class="summary-item"><span>Chủ đề</span><strong>${escapeHtml(request.subject)}</strong></div>
              <div class="summary-item"><span>Mã vé</span><strong>${escapeHtml(request.ticketCode || "Không có")}</strong></div>
              <div class="summary-item"><span>Thời gian gửi</span><strong>${escapeHtml(formatDateTime(request.createdAt))}</strong></div>
              ${
                request.resolvedAt
                  ? `<div class="summary-item"><span>Cập nhật lần cuối</span><strong>${escapeHtml(
                      formatDateTime(request.resolvedAt)
                    )}</strong></div>`
                  : ""
              }
            </div>
            <p class="mb-0 mt-2">${escapeHtml(request.message)}</p>
          </article>
        `
      )
      .join("");
  }
});

function generateSupportRequestCode() {
  const timePart = Date.now().toString().slice(-7);
  const randomPart = Math.floor(100 + Math.random() * 900).toString();
  return `YC${timePart}${randomPart}`;
}
