window.appReady = syncBaseData();

function escapeHtml(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatCurrency(amount) {
  return Number(amount || 0).toLocaleString("vi-VN", {
    style: "currency",
    currency: "VND"
  });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString("vi-VN");
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function getCurrentPagePath() {
  const path = window.location.pathname.split("/").pop();
  return path || "Home.html";
}

function sanitizeRedirectPath(path) {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("//")) {
    return "";
  }

  return path;
}

function buildAuthPageUrl(mode = "login", redirectPath = "") {
  const params = new URLSearchParams();
  params.set("mode", mode);

  if (redirectPath) {
    params.set("redirect", sanitizeRedirectPath(redirectPath));
  }

  return `Auth.html?${params.toString()}`;
}

function getPostLoginDestination(user, redirectPath = "") {
  const safeRedirect = sanitizeRedirectPath(redirectPath);

  if (safeRedirect && (!safeRedirect.includes("Admin.html") || isAdmin(user))) {
    return safeRedirect;
  }

  return isAdmin(user) ? "Admin.html" : "Home.html";
}

function resolvePageKey() {
  const page = document.body.dataset.page || "home";

  if (["movie-detail", "showtime", "seat-selection", "booking"].includes(page)) {
    return "movies";
  }

  return page;
}

function showAlert(target, message, type = "success") {
  const container = typeof target === "string" ? document.getElementById(target) : target;

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="alert alert-${type}" role="alert">
      ${escapeHtml(message)}
    </div>
  `;
}

function renderEmptyState(message, description = "") {
  return `
    <div class="col-12">
      <div class="empty-state">
        <i class="bi bi-film"></i>
        <h3 class="h4 mb-2">${escapeHtml(message)}</h3>
        <p class="mb-0">${escapeHtml(description)}</p>
      </div>
    </div>
  `;
}

function getImagePath(path, fallbackPath) {
  return path && path.trim() ? path : fallbackPath;
}

function createMovieCard(movie) {
  return `
    <div class="col-sm-6 col-xl-4">
      <article class="movie-card">
        <div class="card-image">
          <img src="${escapeHtml(getImagePath(movie.poster, "../Assets/Images/Posters/DefaultPoster.svg"))}" alt="${escapeHtml(movie.title)}" />
        </div>
        <div class="card-body">
          <span class="badge-soft mb-3">${escapeHtml(movie.genre)}</span>
          <h3>${escapeHtml(movie.title)}</h3>
          <div class="meta-row">
            <span class="meta-chip"><i class="bi bi-clock"></i> ${escapeHtml(movie.duration)} phút</span>
            <span class="meta-chip"><i class="bi bi-calendar-event"></i> ${escapeHtml(formatDate(movie.releaseDate))}</span>
          </div>
          <p>${escapeHtml(movie.description.slice(0, 120))}...</p>
          <div class="btn-group-custom">
            <a class="btn btn-cine-outline" href="MovieDetail.html?id=${encodeURIComponent(movie.id)}">Xem chi tiết</a>
            <a class="btn btn-cine-primary" href="Showtime.html?id=${encodeURIComponent(movie.id)}">Đặt vé</a>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderSiteHeader() {
  const header = document.getElementById("site-header");

  if (!header) {
    return;
  }

  const activePage = resolvePageKey();
  const currentUser = getCurrentUser();
  const ticketsLink = currentUser ? "Tickets.html" : buildAuthPageUrl("login", "Tickets.html");
  const authActionHtml = currentUser
    ? `
      <div class="navbar-auth ms-lg-3">
        <span class="user-pill ${isAdmin(currentUser) ? "admin" : ""}">
          <i class="bi bi-person-circle"></i>
          ${escapeHtml(currentUser.fullName)}
        </span>
        <button class="btn btn-cine-outline btn-sm" id="logout-btn" type="button">Đăng xuất</button>
      </div>
    `
    : `
      <div class="navbar-auth ms-lg-3">
        <a class="btn btn-cine-outline btn-sm" href="${buildAuthPageUrl("login")}">Đăng nhập</a>
        <a class="btn btn-cine-primary btn-sm" href="${buildAuthPageUrl("register")}">Tạo tài khoản</a>
      </div>
    `;

  header.innerHTML = `
    <nav class="navbar navbar-expand-lg fixed-top cine-navbar">
      <div class="container">
        <a href="Home.html">
          <img
            class="navbar-brand mb-0 h1 me-0 brand-logo"
            src="../Assets/Images/Brand/Logo.png"
            alt="CineHub Logo"
            style="max-width: 80px;"
          />
          <span style="font-weight: bold;
                font-size: 1.5rem;
                color: #17273f;
                text-shadow: 0 0 1px rgba(90, 120, 180, 0.25);">CINE</span>
          <span style="font-weight: larger;
                color: #2d79d7;
                font-size: 1.5rem;">HUB</span>
        </a>
        <button class="navbar-toggler btn btn-cine-outline px-3" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <i class="bi bi-list"></i>
        </button>
        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav ms-auto align-items-lg-center gap-lg-2">
            <li class="nav-item"><a class="nav-link ${activePage === "home" ? "active" : ""}" href="Home.html">Trang chủ</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === "movies" ? "active" : ""}" href="Movies.html">Phim</a></li>
            <li class="nav-item"><a class="nav-link ${activePage === "tickets" ? "active" : ""}" href="${ticketsLink}">Vé đã đặt</a></li>
            ${isAdmin(currentUser) ? `<li class="nav-item"><a class="nav-link ${activePage === "admin" ? "active" : ""}" href="Admin.html">Quản lý rạp</a></li>` : ""}
          </ul>
          ${authActionHtml}
        </div>
      </div>
    </nav>
  `;

  const logoutButton = document.getElementById("logout-btn");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logoutUser();

      if (resolvePageKey() === "admin") {
        window.location.href = buildAuthPageUrl("login", "Admin.html");
        return;
      }

      window.location.reload();
    });
  }
}

function renderSiteFooter() {
  const footer = document.getElementById("site-footer");

  if (!footer) {
    return;
  }

  const currentUser = getCurrentUser();
  const ticketsLink = currentUser ? "Tickets.html" : buildAuthPageUrl("login", "Tickets.html");

  footer.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="row g-4">
          <div class="col-12 col-md-4 text-center text-md-start">
            <img
              class="footer-logo brand-logo mb-3"
              src="../Assets/Images/Brand/Banner.png"
              alt="CineHub Logo"
              style="max-width: 200px;"
            />
            <p class="mb-0 footer-title">
              CineHub - Trang web đặt vé xem phim nhanh chóng, tiện lợi và hiện đại.
            </p>
          </div>
          <div class="col-12 col-md-4 text-center text-md-start">
            <h5 class="footer-title mb-3">Khám phá</h5>
            <ul class="list-unstyled mb-0">
              <li class="mb-2">
                <a href="Home.html" class="footer-link text-decoration-none">Trang chủ</a>
              </li>
              <li class="mb-2">
                <a href="Movies.html" class="footer-link text-decoration-none">Danh sách phim</a>
              </li>
              <li class="mb-2">
                <a href="${ticketsLink}" class="footer-link text-decoration-none">Vé đã đặt</a>
              </li>
              <li class="mb-2">
                ${
                  isAdmin(currentUser)
                    ? '<a href="Admin.html" class="footer-link text-decoration-none">Quản lý rạp</a>'
                    : `<a href="${buildAuthPageUrl("login")}" class="footer-link text-decoration-none">Đăng nhập</a>`
                }
              </li>
            </ul>
          </div>
          <div class="col-12 col-md-4 text-center text-md-start">
              <h5 class="footer-title mb-3">Liên hệ</h5>
              <ul class="list-unstyled mb-0">
                <li class="mb-2">
                  <i class="bi bi-geo-alt me-2"></i>
                  140 Lê Trọng Tấn, Tân Phú, TP.HCM
                </li>
                <li class="mb-2">
                  <i class="bi bi-telephone me-2"></i>
                  077 999 9999
                </li>
                <li class="mb-2">
                  <i class="bi bi-envelope me-2"></i>
                  <a href="mailto:anh011009@gmail.com" class="footer-title">anh011009@gmail.com</a>
                </li>
                <li class="mb-2">
                  <i class="bi bi-clock me-2"></i>
                  Hỗ trợ: 08:00 - 22:00
                </li>
                <li>
                  <a href="https://www.facebook.com/b.hhhna" target="_blank" class="social-link me-2"><i class="bi bi-facebook"></i></a>
                  <a href="https://www.instagram.com/b.hhhna/" target="_blank" class="social-link me-2"><i class="bi bi-instagram"></i></a>
                  <a href="https://github.com/BaoAnh109" target="_blank" class="social-link"><i class="bi bi-github"></i></a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="border-top mt-4 pt-3">
        <div class="row">
          <div class="col-12 text-center mb-2">
            <small>© 2025 CineHub. All rights reserved</small>
          </div>
        </div>
      </div>
    </footer>
  `;
}

async function initHomePage() {
  const featuredBanner = document.getElementById("featured-banner");
  const homeMovies = document.getElementById("home-movies");

  if (!featuredBanner || !homeMovies) {
    return;
  }

  const movies = await getMovies();

  if (movies.length === 0) {
    featuredBanner.innerHTML = renderEmptyState("Chưa có phim nào", "Hãy thêm dữ liệu phim trong file JSON hoặc trang admin.");
    return;
  }

  const featuredMovies = movies.slice(0, 3);

  featuredBanner.innerHTML = `
    <section class="hero-banner overflow-hidden" style="height: 300px;">
      <div id="carouselMovieHot" class="carousel slide h-100" data-bs-ride="carousel" data-bs-interval="3000">
        <div class="carousel-indicators">
          <button type="button" data-bs-target="#carouselMovieHot" data-bs-slide-to="0" class="active" aria-current="true" aria-label="Slide 1"></button>
          <button type="button" data-bs-target="#carouselMovieHot" data-bs-slide-to="1" aria-label="Slide 2"></button>
          <button type="button" data-bs-target="#carouselMovieHot" data-bs-slide-to="2" aria-label="Slide 3"></button>
        </div>

        <div class="carousel-inner h-100">
          ${featuredMovies.map((movie, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''} h-100">
              <div class="w-100 h-100 d-flex align-items-center justify-content-center bg-black">
                <img
                  src="${escapeHtml(getImagePath(movie.banner, "../Assets/Images/Banners/DefaultBanner.svg"))}"
                  alt="${escapeHtml(movie.title)}"
                  class="d-block w-100 h-100"
                  style="object-fit: contain;"
                >
              </div>
            </div>
          `).join("")}
        </div>

        <button class="carousel-control-prev" type="button" data-bs-target="#carouselMovieHot" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>

        <button class="carousel-control-next" type="button" data-bs-target="#carouselMovieHot" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
    </section>
  `;

  homeMovies.innerHTML = movies.slice(0, 6).map(createMovieCard).join("");
}



document.addEventListener("DOMContentLoaded", async () => {
  renderSiteHeader();
  renderSiteFooter();

  try {
    await window.appReady;

    if (document.body.dataset.page === "home") {
      await initHomePage();
    }
  } catch (error) {
    console.error(error);
    const featuredBanner = document.getElementById("featured-banner");

    if (featuredBanner) {
      featuredBanner.innerHTML = renderEmptyState(
        "Không tải được dữ liệu",
        "Hãy chạy dự án bằng local server để fetch() đọc được file JSON."
      );
    }
  }
});
