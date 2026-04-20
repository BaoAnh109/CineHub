const COMBO_CART_KEY = "cinehub_combo_cart";

document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Combos.html")}&reason=combo`;
    return;
  }

  const featuredComboList = document.getElementById("featured-combo-list");
  const otherComboList = document.getElementById("other-combo-list");
  const comboCartSummary = document.getElementById("combo-cart-summary");
  const comboOrderForm = document.getElementById("combo-order-form");
  const customerNameInput = document.getElementById("combo-customer-name");
  const customerPhoneInput = document.getElementById("combo-customer-phone");
  const customerEmailInput = document.getElementById("combo-customer-email");
  const comboQrPaidCheck = document.getElementById("combo-qr-paid-check");
  const comboPaymentQrImage = document.getElementById("combo-payment-qr-image");
  const comboPaymentBankName = document.getElementById("combo-payment-bank-name");
  const comboPaymentBankAccount = document.getElementById("combo-payment-bank-account");
  const comboPaymentTransferContent = document.getElementById("combo-payment-transfer-content");
  const comboPaymentTransferAmount = document.getElementById("combo-payment-transfer-amount");
  const copyTransferContentButton = document.getElementById("copy-combo-transfer-content-btn");

  if (
    !featuredComboList ||
    !otherComboList ||
    !comboCartSummary ||
    !comboOrderForm ||
    !customerNameInput ||
    !customerPhoneInput ||
    !customerEmailInput
  ) {
    return;
  }

  try {
    await window.appReady;
    const combos = await getCombos();
    const comboMap = new Map(combos.map((combo) => [combo.id, combo]));
    const featuredCombos = combos.filter((combo) => combo.isFeatured);
    const otherCombos = combos.filter((combo) => !combo.isFeatured);
    const lastCustomer = getLastCustomerInfo();

    customerNameInput.value = currentUser?.fullName || lastCustomer?.customerName || "";
    customerPhoneInput.value = lastCustomer?.customerPhone || "";
    customerEmailInput.value = currentUser?.email || lastCustomer?.customerEmail || "";

    let selectedCombos = normalizeComboSelection(loadComboCart(), comboMap);

    if (combos.length === 0) {
      featuredComboList.innerHTML = renderEmptyState("Chưa có combo nổi bật", "Vui lòng quay lại sau.");
      otherComboList.innerHTML = "";
      comboOrderForm.classList.add("d-none");
      comboCartSummary.innerHTML = renderEmptyState("Chưa có dữ liệu combo", "Không thể tạo đơn hàng combo lúc này.");
      return;
    }

    featuredComboList.innerHTML = renderComboCards(featuredCombos, selectedCombos);
    otherComboList.innerHTML = renderComboCards(otherCombos, selectedCombos);
    let paymentContext = refreshCartView();

    featuredComboList.addEventListener("click", handleComboActions);
    otherComboList.addEventListener("click", handleComboActions);

    if (copyTransferContentButton) {
      copyTransferContentButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(paymentContext.transferContent);
          showAlert("combo-alert", "Đã sao chép nội dung chuyển khoản.", "success");
        } catch (error) {
          console.error(error);
          showAlert("combo-alert", "Không thể sao chép. Vui lòng sao chép thủ công nội dung chuyển khoản.", "warning");
        }
      });
    }

    comboOrderForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const customerName = customerNameInput.value.trim();
      const customerPhone = customerPhoneInput.value.trim();
      const customerEmail = customerEmailInput.value.trim();
      const orderItems = buildComboItems(selectedCombos, comboMap);
      const totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);

      if (orderItems.length === 0) {
        showAlert("combo-alert", "Bạn chưa chọn combo nào để đặt.", "danger");
        return;
      }

      if (customerName.length < 2) {
        showAlert("combo-alert", "Họ tên phải có ít nhất 2 ký tự.", "danger");
        return;
      }

      if (!/^(0|\+84)\d{8,10}$/.test(customerPhone)) {
        showAlert("combo-alert", "Số điện thoại không hợp lệ.", "danger");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
        showAlert("combo-alert", "Email không hợp lệ.", "danger");
        return;
      }

      if (comboQrPaidCheck && !comboQrPaidCheck.checked) {
        showAlert("combo-alert", "Vui lòng xác nhận đã thanh toán QR trước khi hoàn tất đặt combo.", "danger");
        return;
      }

      const orderedAt = new Date().toISOString();
      const comboOrder = {
        orderCode: generateComboOrderCode(),
        ownerId: currentUser?.id || null,
        ownerEmail: currentUser?.email || customerEmail,
        ownerName: currentUser?.fullName || customerName,
        customerName,
        customerPhone,
        customerEmail,
        items: orderItems,
        totalPrice: totalAmount,
        orderedAt,
        paymentMethod: "qr",
        paymentStatus: "paid",
        paymentTransferContent: paymentContext.transferContent,
        source: "combo-page"
      };

      addComboOrder(comboOrder);
      saveLastCustomerInfo({ customerName, customerPhone, customerEmail });

      selectedCombos = {};
      saveComboCart(selectedCombos);
      featuredComboList.innerHTML = renderComboCards(featuredCombos, selectedCombos);
      otherComboList.innerHTML = renderComboCards(otherCombos, selectedCombos);
      paymentContext = refreshCartView();

      if (comboQrPaidCheck) {
        comboQrPaidCheck.checked = false;
      }

      showAlert(
        "combo-alert",
        `Đặt combo thành công. Mã đơn của bạn là ${comboOrder.orderCode}. CineHub sẽ chuẩn bị combo trước giờ chiếu.`,
        "success"
      );

      setTimeout(() => {
        window.location.href = `Tickets.html?comboOrderCode=${encodeURIComponent(comboOrder.orderCode)}`;
      }, 1200);
    });

    function handleComboActions(event) {
      const button = event.target.closest("[data-combo-action]");

      if (!button) {
        return;
      }

      const comboId = button.dataset.comboId;
      const action = button.dataset.comboAction;

      if (!comboMap.has(comboId)) {
        return;
      }

      const currentQuantity = Number(selectedCombos[comboId] || 0);
      const nextQuantity = action === "increase" ? currentQuantity + 1 : Math.max(currentQuantity - 1, 0);

      if (nextQuantity > 0) {
        selectedCombos[comboId] = nextQuantity;
      } else {
        delete selectedCombos[comboId];
      }

      saveComboCart(selectedCombos);
      featuredComboList.innerHTML = renderComboCards(featuredCombos, selectedCombos);
      otherComboList.innerHTML = renderComboCards(otherCombos, selectedCombos);
      paymentContext = refreshCartView();
    }

    function refreshCartView() {
      const orderItems = buildComboItems(selectedCombos, comboMap);
      const totalQuantity = orderItems.reduce((total, item) => total + item.quantity, 0);
      const totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);

      comboCartSummary.innerHTML =
        orderItems.length === 0
          ? `
            <div class="empty-state py-4">
              <i class="bi bi-cart"></i>
              <h3 class="h6 mb-2">Chưa có combo trong giỏ</h3>
              <p class="mb-0">Hãy chọn combo ở danh sách bên trái.</p>
            </div>
          `
          : `
            ${orderItems
              .map(
                (item) => `
                  <div class="summary-item">
                    <span>${escapeHtml(item.name)} x${escapeHtml(String(item.quantity))}</span>
                    <strong>${escapeHtml(formatCurrency(item.totalPrice))}</strong>
                  </div>
                `
              )
              .join("")}
            <hr class="border-secondary-subtle" />
            <div class="summary-item"><span>Tổng số lượng</span><strong>${escapeHtml(String(totalQuantity))}</strong></div>
            <div class="total-box mt-2">
              <span>Tổng tiền combo</span>
              <strong>${escapeHtml(formatCurrency(totalAmount))}</strong>
            </div>
          `;

      const paymentContext = renderComboQrPayment(totalAmount, totalQuantity);
      const submitButton = comboOrderForm.querySelector('button[type="submit"]');

      if (submitButton) {
        submitButton.disabled = totalAmount <= 0;
      }

      return paymentContext;
    }

    function renderComboQrPayment(totalAmount, totalQuantity) {
      const BANK_NAME = "MB Bank (Demo)";
      const BANK_CODE = "MB";
      const ACCOUNT_NUMBER = "1900123456789";
      const ACCOUNT_NAME = "CINEHUB MOVIE";
      const transferContent = buildComboTransferContent(totalQuantity);
      const qrUrl = buildComboQrImageUrl({
        bankCode: BANK_CODE,
        accountNumber: ACCOUNT_NUMBER,
        accountName: ACCOUNT_NAME,
        amount: totalAmount,
        transferContent
      });

      if (comboPaymentQrImage) {
        comboPaymentQrImage.src = qrUrl;
        comboPaymentQrImage.alt = `Mã QR thanh toán combo ${formatCurrency(totalAmount)}`;
      }

      if (comboPaymentBankName) {
        comboPaymentBankName.textContent = BANK_NAME;
      }

      if (comboPaymentBankAccount) {
        comboPaymentBankAccount.textContent = ACCOUNT_NUMBER;
      }

      if (comboPaymentTransferContent) {
        comboPaymentTransferContent.textContent = transferContent;
      }

      if (comboPaymentTransferAmount) {
        comboPaymentTransferAmount.textContent = formatCurrency(totalAmount);
      }

      return {
        amount: totalAmount,
        transferContent
      };
    }
  } catch (error) {
    console.error(error);
    featuredComboList.innerHTML = renderEmptyState("Không thể tải dữ liệu combo", "Vui lòng thử lại sau.");
    otherComboList.innerHTML = "";
    comboOrderForm.classList.add("d-none");
  }
});

function renderComboCards(combos, selectedCombos) {
  if (!combos || combos.length === 0) {
    return renderEmptyState("Không có dữ liệu", "Vui lòng quay lại sau.");
  }

  return combos
    .map((combo) => {
      const quantity = Number(selectedCombos[combo.id] || 0);

      return `
        <div class="col-md-6">
          <article class="combo-card ${combo.isFeatured ? "combo-card-featured" : ""}">
            <div class="combo-card-head">
              <span class="combo-icon"><i class="bi ${escapeHtml(combo.icon || "bi-cup-straw")}"></i></span>
              ${combo.badge ? `<span class="badge-soft">${escapeHtml(combo.badge)}</span>` : ""}
            </div>
            <h3>${escapeHtml(combo.name)}</h3>
            <p>${escapeHtml(combo.description || "")}</p>
            <div class="summary-list mb-3">
              <div class="summary-item"><span>Phù hợp</span><strong>${escapeHtml(combo.serving || "N/A")}</strong></div>
              <div class="summary-item"><span>Giá</span><strong>${escapeHtml(formatCurrency(combo.price))}</strong></div>
            </div>
            <div class="combo-qty-control">
              <button type="button" class="btn btn-cine-outline btn-sm" data-combo-action="decrease" data-combo-id="${escapeHtml(combo.id)}">-</button>
              <span>${escapeHtml(String(quantity))}</span>
              <button type="button" class="btn btn-cine-primary btn-sm" data-combo-action="increase" data-combo-id="${escapeHtml(combo.id)}">+</button>
            </div>
          </article>
        </div>
      `;
    })
    .join("");
}

function normalizeComboSelection(rawSelection, comboMap) {
  if (!rawSelection || typeof rawSelection !== "object") {
    return {};
  }

  return Object.entries(rawSelection).reduce((result, [comboId, quantity]) => {
    const normalizedQuantity = Math.max(Number(quantity || 0), 0);

    if (comboMap.has(comboId) && normalizedQuantity > 0) {
      result[comboId] = normalizedQuantity;
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

function loadComboCart() {
  try {
    const raw = localStorage.getItem(COMBO_CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Không thể đọc giỏ combo:", error);
    return {};
  }
}

function saveComboCart(cart) {
  localStorage.setItem(COMBO_CART_KEY, JSON.stringify(cart || {}));
}

function buildComboTransferContent(totalQuantity) {
  const quantityPart = Number(totalQuantity || 0);
  return `CINEHUB COMBO C${quantityPart}`.trim();
}

function buildComboQrImageUrl({ bankCode, accountNumber, accountName, amount, transferContent }) {
  const encodedInfo = encodeURIComponent(String(transferContent || ""));
  const encodedAccountName = encodeURIComponent(String(accountName || ""));
  const normalizedAmount = Number(amount || 0);

  return `https://img.vietqr.io/image/${encodeURIComponent(bankCode)}-${encodeURIComponent(
    accountNumber
  )}-compact2.png?amount=${normalizedAmount}&addInfo=${encodedInfo}&accountName=${encodedAccountName}`;
}
