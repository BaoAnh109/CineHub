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

  if (!loginForm || !registerForm || !loginTab || !registerTab || !fillAdminButton || !sessionBox) {
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
    showAlert("auth-global-alert", "Ban can dang nhap bang tai khoan admin de vao trang quan tri.", "warning");
  }

  if (reason === "tickets") {
    showAlert("auth-global-alert", "Ban can dang nhap de xem dung danh sach ve da mua cua tai khoan nay.", "warning");
  }

  if (reason === "profile") {
    showAlert("auth-global-alert", "Ban can dang nhap de xem va chinh sua thong tin tai khoan.", "warning");
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
      showAlert("register-alert", "Mat khau nhap lai khong khop.", "danger");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert("register-alert", "Email khong hop le.", "danger");
      return;
    }

    const result = registerUser({ fullName, email, password });

    if (!result.success) {
      showAlert("register-alert", result.message, "danger");
      return;
    }

    showAlert("register-alert", "Tao tai khoan thanh cong. He thong se dang nhap cho ban.", "success");
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
          <p class="mb-2">Ban chua dang nhap.</p>
        </div>
      `;
      return;
    }

    sessionBox.innerHTML = `
      <div class="auth-status-box">
        <div class="demo-credential">
          <span>Ho ten</span>
          <strong>${escapeHtml(currentUser.fullName)}</strong>
        </div>
        <div class="demo-credential">
          <span>Email</span>
          <strong>${escapeHtml(currentUser.email)}</strong>
        </div>
        <div class="demo-credential">
          <span>Vai tro</span>
          <strong>${escapeHtml(currentUser.role)}</strong>
        </div>
        <div class="d-flex flex-wrap gap-2 mt-3">
          <a class="btn btn-cine-outline btn-sm" href="Profile.html">Tai khoan</a>
          <a class="btn btn-cine-outline btn-sm" href="${isAdmin(currentUser) ? "Admin.html" : "Home.html"}">
            ${isAdmin(currentUser) ? "Vao admin" : "Ve trang chu"}
          </a>
          <button id="auth-logout-btn" type="button" class="btn btn-cine-primary btn-sm">Dang xuat</button>
        </div>
      </div>
    `;

    document.getElementById("auth-logout-btn").addEventListener("click", () => {
      logoutUser();
      renderSessionBox();
      renderSiteHeader();
      renderSiteFooter();
      showAlert("auth-global-alert", "Da dang xuat thanh cong.", "info");
    });
  }
});
