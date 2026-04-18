document.addEventListener("DOMContentLoaded", async () => {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginTab = document.getElementById("login-tab");
  const registerTab = document.getElementById("register-tab");
  const fillAdminButton = document.getElementById("fill-admin-btn");
  const sessionBox = document.getElementById("auth-session-box");
  const redirectPath = sanitizeRedirectPath(getQueryParam("redirect"));
  const reason = getQueryParam("reason");
  const mode = getQueryParam("mode");

  if (!loginForm || !registerForm) {
    return;
  }

  try {
    await window.appReady;
  } catch (error) {
    console.error(error);
  }

  if (mode === "register") {
    bootstrap.Tab.getOrCreateInstance(registerTab).show();
  } else {
    bootstrap.Tab.getOrCreateInstance(loginTab).show();
  }

  if (reason === "admin") {
    showAlert("auth-global-alert", "Bạn cần đăng nhập bằng tài khoản admin để vào trang quản trị.", "warning");
  }

  if (reason === "tickets") {
    showAlert("auth-global-alert", "Bạn cần đăng nhập để xem đúng danh sách vé đã mua của tài khoản này.", "warning");
  }

  renderSessionBox();

  fillAdminButton.addEventListener("click", () => {
    document.getElementById("login-email").value = DEFAULT_ADMIN_ACCOUNT.email;
    document.getElementById("login-password").value = DEFAULT_ADMIN_ACCOUNT.password;
    bootstrap.Tab.getOrCreateInstance(loginTab).show();
  });

  loginForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const result = authenticateUser(email, password);

    if (!result.success) {
      showAlert("login-alert", result.message, "danger");
      return;
    }

    showAlert("login-alert", result.message, "success");
    renderSessionBox();
    renderSiteHeader();
    renderSiteFooter();

    setTimeout(() => {
      window.location.href = getPostLoginDestination(result.user, redirectPath);
    }, 700);
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = document.getElementById("register-name").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("register-confirm-password").value;

    if (password !== confirmPassword) {
      showAlert("register-alert", "Mật khẩu nhập lại không khớp.", "danger");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("register-alert", "Email không hợp lệ.", "danger");
      return;
    }

    const result = registerUser({ fullName, email, password });

    if (!result.success) {
      showAlert("register-alert", result.message, "danger");
      return;
    }

    showAlert("register-alert", "Tạo tài khoản thành công. Hệ thống sẽ đăng nhập cho bạn.", "success");
    renderSessionBox();
    renderSiteHeader();
    renderSiteFooter();

    setTimeout(() => {
      window.location.href = getPostLoginDestination(result.user, redirectPath);
    }, 700);
  });

  function renderSessionBox() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
      sessionBox.innerHTML = `
        <div class="auth-status-box">
          <p class="mb-2">Bạn chưa đăng nhập.</p>
        </div>
      `;
      return;
    }

    sessionBox.innerHTML = `
      <div class="auth-status-box">
        <div class="demo-credential">
          <span>Họ tên</span>
          <strong>${escapeHtml(currentUser.fullName)}</strong>
        </div>
        <div class="demo-credential">
          <span>Email</span>
          <strong>${escapeHtml(currentUser.email)}</strong>
        </div>
        <div class="demo-credential">
          <span>Vai trò</span>
          <strong>${escapeHtml(currentUser.role)}</strong>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <a class="btn btn-cine-outline btn-sm" href="${isAdmin(currentUser) ? "Admin.html" : "Home.html"}">
            ${isAdmin(currentUser) ? "Vào admin" : "Về trang chủ"}
          </a>
          <button id="auth-logout-btn" type="button" class="btn btn-cine-primary btn-sm">Đăng xuất</button>
        </div>
      </div>
    `;

    document.getElementById("auth-logout-btn").addEventListener("click", () => {
      logoutUser();
      renderSessionBox();
      renderSiteHeader();
      renderSiteFooter();
      showAlert("auth-global-alert", "Đã đăng xuất thành công.", "info");
    });
  }
});
