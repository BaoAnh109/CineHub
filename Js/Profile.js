document.addEventListener("DOMContentLoaded", async () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = `${buildAuthPageUrl("login", "Profile.html")}&reason=profile`;
    return;
  }

  const profileForm = document.getElementById("profile-form");
  const passwordForm = document.getElementById("password-form");
  const fullNameInput = document.getElementById("profile-full-name");
  const emailInput = document.getElementById("profile-email");
  const heroName = document.getElementById("profile-hero-name");
  const heroEmail = document.getElementById("profile-hero-email");
  const statGrid = document.getElementById("profile-stat-grid");

  if (!profileForm || !passwordForm || !fullNameInput || !emailInput || !heroName || !heroEmail || !statGrid) {
    return;
  }

  try {
    await window.appReady;
  } catch (error) {
    console.error(error);
  }

  renderProfile();

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const result = updateUserProfile(currentUser.id, {
      fullName: fullNameInput.value,
      email: emailInput.value
    });

    if (!result.success) {
      showAlert("profile-alert", result.message, "danger");
      return;
    }

    showAlert("profile-alert", result.message, "success");
    renderSiteHeader();
    renderSiteFooter();
    renderProfile();
  });

  passwordForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (newPassword !== confirmPassword) {
      showAlert("profile-alert", "Mật khẩu mới nhập lại không khớp.", "danger");
      return;
    }

    const result = changeUserPassword(currentUser.id, currentPassword, newPassword);

    if (!result.success) {
      showAlert("profile-alert", result.message, "danger");
      return;
    }

    passwordForm.reset();
    showAlert("profile-alert", result.message, "success");
  });

  function renderProfile() {
    const sessionUser = getCurrentUser();
    const userRecord = findUserById(sessionUser.id) || sessionUser;
    const bookings = getBookingsByUser(sessionUser);

    fullNameInput.value = userRecord.fullName || "";
    emailInput.value = userRecord.email || "";

    heroName.textContent = userRecord.fullName || "Tài khoản CineHub";
    heroEmail.textContent = userRecord.email || "";

    statGrid.innerHTML = `
      <article class="profile-stat">
        <span>Vai trò</span>
        <strong>${escapeHtml(userRecord.role || "user")}</strong>
      </article>
      <article class="profile-stat">
        <span>Vé đã đặt</span>
        <strong>${escapeHtml(String(bookings.length))}</strong>
      </article>
      <article class="profile-stat">
        <span>Thành viên từ</span>
        <strong>${escapeHtml(formatDate(userRecord.createdAt || new Date().toISOString()))}</strong>
      </article>
    `;
  }
});
