const STORAGE_KEYS = {
  movies: "cinehub_movies",
  showtimes: "cinehub_showtimes",
  bookings: "cinehub_bookings",
  bookedSeats: "cinehub_booked_seats",
  bookingDraft: "cinehub_booking_draft",
  lastCustomer: "cinehub_last_customer",
  users: "cinehub_users",
  currentUser: "cinehub_current_user",
  theme: "cinehub_theme"
};

const DEFAULT_ADMIN_ACCOUNT = {
  id: "admin_default",
  fullName: "CineHub Admin",
  email: "admin@cinehub.local",
  password: "admin123",
  role: "admin",
  createdAt: "2026-04-17T00:00:00.000Z"
};

async function fetchJsonData(path) {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Khong the tai du lieu tu ${path}`);
  }

  return response.json();
}

function readStorage(key, fallbackValue) {
  try {
    const rawValue = localStorage.getItem(key);
    return rawValue ? JSON.parse(rawValue) : fallbackValue;
  } catch (error) {
    console.error(`Loi doc localStorage voi key ${key}:`, error);
    return fallbackValue;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toSessionUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: user.role || "user",
    createdAt: user.createdAt || new Date().toISOString()
  };
}

async function initializeCollection(key, jsonPath) {
  const storedData = readStorage(key, null);

  if (storedData !== null) {
    return storedData;
  }

  // Lan dau mo website, du lieu duoc lay tu file JSON roi luu vao localStorage.
  const data = await fetchJsonData(jsonPath);
  writeStorage(key, data);
  return data;
}

async function getMovies() {
  return initializeCollection(STORAGE_KEYS.movies, "../Data/Movies.json");
}

function saveMovies(movies) {
  writeStorage(STORAGE_KEYS.movies, movies);
}

async function getShowtimes() {
  return initializeCollection(STORAGE_KEYS.showtimes, "../Data/Showtimes.json");
}

function saveShowtimes(showtimes) {
  writeStorage(STORAGE_KEYS.showtimes, showtimes);
}

function getBookings() {
  return readStorage(STORAGE_KEYS.bookings, []);
}

function saveBookings(bookings) {
  writeStorage(STORAGE_KEYS.bookings, bookings);
}

function getBookedSeatsMap() {
  return readStorage(STORAGE_KEYS.bookedSeats, {});
}

function buildShowtimeKey(showtime) {
  return `${showtime.movieId}_${showtime.date}_${showtime.time}_${showtime.room}`;
}

function getBookedSeats(showtimeKey) {
  const seatMap = getBookedSeatsMap();
  return seatMap[showtimeKey] || [];
}

function saveBookedSeats(showtimeKey, seats) {
  const seatMap = getBookedSeatsMap();
  seatMap[showtimeKey] = Array.from(new Set(seats)).sort();
  writeStorage(STORAGE_KEYS.bookedSeats, seatMap);
}

function releaseBookedSeats(showtimeKey, seatsToRelease) {
  const seatMap = getBookedSeatsMap();
  const currentSeats = seatMap[showtimeKey] || [];
  const updatedSeats = currentSeats.filter((seat) => !seatsToRelease.includes(seat));

  if (updatedSeats.length > 0) {
    seatMap[showtimeKey] = updatedSeats;
  } else {
    delete seatMap[showtimeKey];
  }

  writeStorage(STORAGE_KEYS.bookedSeats, seatMap);
}

function addBooking(booking) {
  const bookings = getBookings();
  bookings.unshift(booking);
  saveBookings(bookings);
}

function getBookingsByUser(user) {
  if (!user) {
    return [];
  }

  const normalizedSessionEmail = normalizeEmail(user.email);

  return getBookings().filter((booking) => {
    if (booking.ownerId) {
      return booking.ownerId === user.id;
    }

    if (booking.ownerEmail) {
      return normalizeEmail(booking.ownerEmail) === normalizedSessionEmail;
    }

    return normalizeEmail(booking.customerEmail) === normalizedSessionEmail;
  });
}

function removeBooking(ticketCode) {
  const bookings = getBookings();
  const bookingToRemove = bookings.find((booking) => booking.ticketCode === ticketCode);

  if (!bookingToRemove) {
    return false;
  }

  const updatedBookings = bookings.filter((booking) => booking.ticketCode !== ticketCode);
  saveBookings(updatedBookings);

  if (bookingToRemove.showtimeKey && Array.isArray(bookingToRemove.seats)) {
    releaseBookedSeats(bookingToRemove.showtimeKey, bookingToRemove.seats);
  }

  return true;
}

function setBookingDraft(draft) {
  writeStorage(STORAGE_KEYS.bookingDraft, draft);
}

function getBookingDraft() {
  return readStorage(STORAGE_KEYS.bookingDraft, null);
}

function clearBookingDraft() {
  localStorage.removeItem(STORAGE_KEYS.bookingDraft);
}

function getLastCustomerInfo() {
  return readStorage(STORAGE_KEYS.lastCustomer, null);
}

function saveLastCustomerInfo(customerInfo) {
  writeStorage(STORAGE_KEYS.lastCustomer, customerInfo);
}

function getUsers() {
  return readStorage(STORAGE_KEYS.users, []);
}

function saveUsers(users) {
  writeStorage(STORAGE_KEYS.users, users);
}

function ensureDefaultAdminAccount() {
  const users = getUsers();
  const adminExists = users.some(
    (user) =>
      user.id === DEFAULT_ADMIN_ACCOUNT.id ||
      normalizeEmail(user.email) === normalizeEmail(DEFAULT_ADMIN_ACCOUNT.email)
  );

  if (!adminExists) {
    users.push({ ...DEFAULT_ADMIN_ACCOUNT });
    saveUsers(users);
  }

  return getUsers();
}

function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  return getUsers().find((user) => normalizeEmail(user.email) === normalizedEmail) || null;
}

function findUserById(userId) {
  return getUsers().find((user) => user.id === userId) || null;
}

function syncBookingsForUser(userId, { fullName, email }) {
  const normalizedEmail = normalizeEmail(email);
  const bookings = getBookings();
  const updatedBookings = bookings.map((booking) => {
    if (booking.ownerId === userId) {
      return {
        ...booking,
        ownerName: fullName,
        ownerEmail: normalizedEmail
      };
    }

    return booking;
  });

  saveBookings(updatedBookings);
}

function syncLastCustomerInfo(previousEmail, nextUser) {
  const lastCustomer = getLastCustomerInfo();

  if (!lastCustomer) {
    return;
  }

  if (normalizeEmail(lastCustomer.customerEmail) !== normalizeEmail(previousEmail)) {
    return;
  }

  saveLastCustomerInfo({
    ...lastCustomer,
    customerName: nextUser.fullName,
    customerEmail: nextUser.email
  });
}

function registerUser({ fullName, email, password }) {
  const trimmedName = String(fullName || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const trimmedPassword = String(password || "").trim();

  if (!trimmedName || !normalizedEmail || !trimmedPassword) {
    return {
      success: false,
      message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu."
    };
  }

  if (trimmedPassword.length < 6) {
    return {
      success: false,
      message: "Mật khẩu phải có ít nhất 6 ký tự."
    };
  }

  if (findUserByEmail(normalizedEmail)) {
    return {
      success: false,
      message: "Email này đã tồn tại. Hãy dùng email khác."
    };
  }

  const users = getUsers();
  const newUser = {
    id: generateId("us"),
    fullName: trimmedName,
    email: normalizedEmail,
    password: trimmedPassword,
    role: "user",
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  saveCurrentUser(toSessionUser(newUser));

  return {
    success: true,
    message: "Tạo tài khoản thành công.",
    user: toSessionUser(newUser)
  };
}

function authenticateUser(email, password) {
  const user = findUserByEmail(email);

  if (!user || user.password !== String(password || "").trim()) {
    return {
      success: false,
      message: "Email hoặc mật khẩu không đúng."
    };
  }

  const sessionUser = toSessionUser(user);
  saveCurrentUser(sessionUser);

  return {
    success: true,
    message: "Đăng nhập thành công.",
    user: sessionUser
  };
}

function updateUserProfile(userId, { fullName, email }) {
  const trimmedName = String(fullName || "").trim();
  const normalizedEmail = normalizeEmail(email);

  if (!trimmedName || !normalizedEmail) {
    return {
      success: false,
      message: "Vui lòng nhập đầy đủ họ tên và email."
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return {
      success: false,
      message: "Email không hợp lệ."
    };
  }

  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    return {
      success: false,
      message: "Không tìm thấy tài khoản cần cập nhật."
    };
  }

  const currentUserRecord = users[userIndex];
  const duplicatedUser = users.find(
    (user) => user.id !== userId && normalizeEmail(user.email) === normalizedEmail
  );

  if (duplicatedUser) {
    return {
      success: false,
      message: "Email này đã được sử dụng cho tài khoản khác."
    };
  }

  const updatedUser = {
    ...currentUserRecord,
    fullName: trimmedName,
    email: normalizedEmail
  };

  users[userIndex] = updatedUser;
  saveUsers(users);
  saveCurrentUser(toSessionUser(updatedUser));
  syncBookingsForUser(userId, updatedUser);
  syncLastCustomerInfo(currentUserRecord.email, updatedUser);

  return {
    success: true,
    message: "Cập nhật thông tin tài khoản thành công.",
    user: toSessionUser(updatedUser)
  };
}

function changeUserPassword(userId, currentPassword, newPassword) {
  const trimmedCurrentPassword = String(currentPassword || "").trim();
  const trimmedNewPassword = String(newPassword || "").trim();
  const users = getUsers();
  const userIndex = users.findIndex((user) => user.id === userId);

  if (userIndex < 0) {
    return {
      success: false,
      message: "Không tìm thấy tài khoản cần đổi mật khẩu."
    };
  }

  if (users[userIndex].password !== trimmedCurrentPassword) {
    return {
      success: false,
      message: "Mật khẩu hiện tại không đúng."
    };
  }

  if (trimmedNewPassword.length < 6) {
    return {
      success: false,
      message: "Mật khẩu mới phải có ít nhất 6 ký tự."
    };
  }

  if (trimmedCurrentPassword === trimmedNewPassword) {
    return {
      success: false,
      message: "Mật khẩu mới phải khác mật khẩu hiện tại."
    };
  }

  users[userIndex] = {
    ...users[userIndex],
    password: trimmedNewPassword
  };
  saveUsers(users);

  return {
    success: true,
    message: "Đổi mật khẩu thành công."
  };
}

function getCurrentUser() {
  return readStorage(STORAGE_KEYS.currentUser, null);
}

function saveCurrentUser(user) {
  writeStorage(STORAGE_KEYS.currentUser, user);
}

function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.currentUser);
}

function getThemePreference() {
  return readStorage(STORAGE_KEYS.theme, "dark");
}

function saveThemePreference(theme) {
  writeStorage(STORAGE_KEYS.theme, theme);
}

function isAdmin(user = getCurrentUser()) {
  return Boolean(user && user.role === "admin");
}

function generateId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function generateTicketCode() {
  const timePart = Date.now().toString().slice(-6);
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `VE${timePart}${randomPart}`;
}

async function syncBaseData() {
  ensureDefaultAdminAccount();
  await Promise.all([getMovies(), getShowtimes()]);
}
