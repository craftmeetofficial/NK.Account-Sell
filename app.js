(function () {
  "use strict";

  const STORAGE_LISTINGS = "nk_account_sell_listings";
  const STORAGE_FAVORITES = "nk_account_sell_favorites";
  const STORAGE_SESSION = "nk_account_sell_session";

  // —— State ——
  let listings = loadListings();
  let favorites = loadFavorites();
  let session = loadSession(); // { displayName } or null

  // —— DOM ——
  const pages = {
    home: document.getElementById("page-home"),
    listings: document.getElementById("page-listings"),
    create: document.getElementById("page-create"),
    favorites: document.getElementById("page-favorites"),
    about: document.getElementById("page-about"),
  };

  const listingsGrid = document.getElementById("listings-grid");
  const listingsEmpty = document.getElementById("listings-empty");
  const favoritesGrid = document.getElementById("favorites-grid");
  const favoritesEmpty = document.getElementById("favorites-empty");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const listingForm = document.getElementById("listing-form");
  const formTitle = document.getElementById("form-title");
  const formMessage = document.getElementById("form-message");
  const editIdInput = document.getElementById("edit-id");
  const userStatus = document.getElementById("user-status");
  const btnAuth = document.getElementById("btn-auth");
  const authModal = document.getElementById("auth-modal");
  const authForm = document.getElementById("auth-form");
  const authMessage = document.getElementById("auth-message");
  const detailModal = document.getElementById("detail-modal");
  const detailContent = document.getElementById("detail-content");
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");

  // —— Storage helpers ——
  function loadListings() {
    try {
      const raw = localStorage.getItem(STORAGE_LISTINGS);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveListings() {
    localStorage.setItem(STORAGE_LISTINGS, JSON.stringify(listings));
  }

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_FAVORITES);
      if (!raw) return [];
      const data = JSON.parse(raw);
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favorites));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_SESSION);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data && typeof data.displayName === "string" && data.displayName.trim()) {
        return { displayName: data.displayName.trim() };
      }
      return null;
    } catch {
      return null;
    }
  }

  function saveSession() {
    if (session) {
      localStorage.setItem(STORAGE_SESSION, JSON.stringify({ displayName: session.displayName }));
    } else {
      localStorage.removeItem(STORAGE_SESSION);
    }
  }

  // —— UI helpers ——
  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = "message " + type;
    el.classList.remove("hidden");
  }

  function hideMessage(el) {
    el.classList.add("hidden");
    el.textContent = "";
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function formatPrice(n) {
    const num = Number(n);
    if (isNaN(num)) return "Not provided";
    return "$" + num.toFixed(2);
  }

  function formatDate(iso) {
    if (!iso) return "Not provided";
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Not provided";
    }
  }

  // —— Navigation ——
  function showPage(name) {
    Object.keys(pages).forEach(function (key) {
      pages[key].classList.toggle("active", key === name);
    });
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-page") === name);
    });
    mainNav.classList.remove("open");
    if (name === "listings") renderListings();
    if (name === "favorites") renderFavorites();
    if (name === "create" && !editIdInput.value) resetForm();
    window.scrollTo(0, 0);
  }

  document.querySelectorAll("[data-page]").forEach(function (el) {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      const page = el.getAttribute("data-page");
      if (pages[page]) showPage(page);
    });
  });

  document.getElementById("nav-home").addEventListener("click", function (e) {
    e.preventDefault();
    showPage("home");
  });

  navToggle.addEventListener("click", function () {
    mainNav.classList.toggle("open");
  });

  // —— Session UI ——
  function updateUserStatus() {
    if (session) {
      userStatus.textContent = "Demo session: " + session.displayName;
      btnAuth.textContent = "Demo account";
    } else {
      userStatus.textContent = "Demo mode — not logged in";
      btnAuth.textContent = "Login / Register";
    }
  }

  btnAuth.addEventListener("click", function () {
    hideMessage(authMessage);
    authModal.classList.remove("hidden");
    document.getElementById("auth-name").value = session ? session.displayName : "";
    document.getElementById("auth-pass").value = "";
  });

  document.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", function () {
      const which = el.getAttribute("data-close");
      if (which === "auth") authModal.classList.add("hidden");
      if (which === "detail") detailModal.classList.add("hidden");
    });
  });

  authForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const name = document.getElementById("auth-name").value.trim();
    // Password is intentionally ignored and never stored
    document.getElementById("auth-pass").value = "";
    if (!name) {
      showMessage(authMessage, "Please enter a display name.", "error");
      return;
    }
    session = { displayName: name };
    saveSession();
    updateUserStatus();
    showMessage(
      authMessage,
      "Demo session started as “" + name + "”. Password was discarded and not saved. This is not real authentication.",
      "success"
    );
    setTimeout(function () {
      authModal.classList.add("hidden");
    }, 1200);
  });

  document.getElementById("auth-logout").addEventListener("click", function () {
    session = null;
    saveSession();
    updateUserStatus();
    showMessage(authMessage, "Demo session cleared.", "success");
  });

  // —— Listings ——
  function getFilteredListings() {
    const q = (searchInput.value || "").trim().toLowerCase();
    const cat = categoryFilter.value;
    return listings.filter(function (item) {
      if (cat && item.category !== cat) return false;
      if (!q) return true;
      const title = (item.title || "").toLowerCase();
      const desc = (item.description || "").toLowerCase();
      return title.includes(q) || desc.includes(q);
    });
  }

  function createCard(item, options) {
    options = options || {};
    const card = document.createElement("article");
    card.className = "listing-card";
    card.dataset.id = item.id;

    let imgHtml;
    if (item.imageUrl) {
      imgHtml =
        '<img class="listing-img" src="' +
        escapeHtml(item.imageUrl) +
        '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.classList.remove(\'hidden\')" />' +
        '<div class="listing-img-placeholder hidden">No image</div>';
    } else {
      imgHtml = '<div class="listing-img-placeholder">No image provided</div>';
    }

    const owner = item.ownerName || "Not provided";
    const isOwner = session && session.displayName === item.ownerName;
    const isFav = favorites.indexOf(item.id) !== -1;

    card.innerHTML =
      imgHtml +
      '<div class="listing-body">' +
      '<span class="listing-cat">' +
      escapeHtml(item.category || "Other") +
      "</span>" +
      '<h3 class="listing-title">' +
      escapeHtml(item.title || "Untitled") +
      "</h3>" +
      '<div class="listing-price">' +
      formatPrice(item.price) +
      "</div>" +
      '<div class="listing-meta">Listed by: ' +
      escapeHtml(owner) +
      "</div>" +
      "</div>" +
      '<div class="listing-actions">' +
      '<button type="button" class="btn btn-outline btn-sm btn-view">View</button>' +
      '<button type="button" class="btn btn-outline btn-sm btn-fav">' +
      (isFav ? "★ Favorited" : "☆ Favorite") +
      "</button>" +
      (isOwner
        ? '<button type="button" class="btn btn-outline btn-sm btn-edit">Edit</button>' +
          '<button type="button" class="btn btn-danger btn-sm btn-delete">Delete</button>'
        : "") +
      "</div>";

    card.querySelector(".btn-view").addEventListener("click", function () {
      openDetail(item.id);
    });
    card.querySelector(".btn-fav").addEventListener("click", function () {
      toggleFavorite(item.id);
      if (options.fromFavorites) renderFavorites();
      else renderListings();
    });
    const editBtn = card.querySelector(".btn-edit");
    if (editBtn) {
      editBtn.addEventListener("click", function () {
        startEdit(item.id);
      });
    }
    const delBtn = card.querySelector(".btn-delete");
    if (delBtn) {
      delBtn.addEventListener("click", function () {
        deleteListing(item.id);
      });
    }

    return card;
  }

  function renderListings() {
    const filtered = getFilteredListings();
    listingsGrid.innerHTML = "";
    if (filtered.length === 0) {
      listingsEmpty.classList.remove("hidden");
      listingsEmpty.textContent =
        listings.length === 0
          ? "No listings available yet."
          : "No listings match your search or filter.";
    } else {
      listingsEmpty.classList.add("hidden");
      filtered.forEach(function (item) {
        listingsGrid.appendChild(createCard(item));
      });
    }
  }

  function renderFavorites() {
    const favItems = listings.filter(function (item) {
      return favorites.indexOf(item.id) !== -1;
    });
    favoritesGrid.innerHTML = "";
    if (favItems.length === 0) {
      favoritesEmpty.classList.remove("hidden");
    } else {
      favoritesEmpty.classList.add("hidden");
      favItems.forEach(function (item) {
        favoritesGrid.appendChild(createCard(item, { fromFavorites: true }));
      });
    }
  }

  searchInput.addEventListener("input", renderListings);
  categoryFilter.addEventListener("change", renderListings);

  // —— Create / Edit ——
  function resetForm() {
    listingForm.reset();
    editIdInput.value = "";
    formTitle.textContent = "Create Listing";
    document.getElementById("form-submit").textContent = "Save Listing";
    hideMessage(formMessage);
  }

  function startEdit(id) {
    const item = listings.find(function (l) {
      return l.id === id;
    });
    if (!item) return;
    if (!session || session.displayName !== item.ownerName) {
      showMessage(formMessage, "Only the listing owner (demo session name) can edit.", "error");
      showPage("create");
      return;
    }
    editIdInput.value = item.id;
    document.getElementById("f-title").value = item.title || "";
    document.getElementById("f-category").value = item.category || "";
    document.getElementById("f-description").value = item.description || "";
    document.getElementById("f-price").value = item.price != null ? item.price : "";
    document.getElementById("f-image").value = item.imageUrl || "";
    formTitle.textContent = "Edit Listing";
    document.getElementById("form-submit").textContent = "Update Listing";
    hideMessage(formMessage);
    showPage("create");
  }

  document.getElementById("form-cancel").addEventListener("click", function () {
    resetForm();
    showPage("listings");
  });

  listingForm.addEventListener("submit", function (e) {
    e.preventDefault();
    hideMessage(formMessage);

    if (!session) {
      showMessage(
        formMessage,
        "Start a demo session (Login / Register) first so this listing can be tied to a display name on this device. This is not real authentication.",
        "error"
      );
      return;
    }

    const title = document.getElementById("f-title").value.trim();
    const category = document.getElementById("f-category").value;
    const description = document.getElementById("f-description").value.trim();
    const priceRaw = document.getElementById("f-price").value;
    const imageUrl = document.getElementById("f-image").value.trim();
    const price = parseFloat(priceRaw);

    if (!title || !category || !description || isNaN(price) || price < 0) {
      showMessage(formMessage, "Please fill in all required fields with valid values.", "error");
      return;
    }

    const editId = editIdInput.value;

    if (editId) {
      const idx = listings.findIndex(function (l) {
        return l.id === editId;
      });
      if (idx === -1) {
        showMessage(formMessage, "Listing not found.", "error");
        return;
      }
      if (listings[idx].ownerName !== session.displayName) {
        showMessage(formMessage, "You can only edit your own listings in this demo session.", "error");
        return;
      }
      listings[idx] = {
        ...listings[idx],
        title: title,
        category: category,
        description: description,
        price: price,
        imageUrl: imageUrl || "",
        updatedAt: new Date().toISOString(),
      };
      saveListings();
      showMessage(formMessage, "Listing updated (saved in this browser only).", "success");
    } else {
      const newItem = {
        id: "lst_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8),
        title: title,
        category: category,
        description: description,
        price: price,
        imageUrl: imageUrl || "",
        ownerName: session.displayName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      listings.unshift(newItem);
      saveListings();
      showMessage(formMessage, "Listing created (saved in this browser only). Not visible to other devices or users.", "success");
    }

    resetForm();
    setTimeout(function () {
      showPage("listings");
    }, 800);
  });

  function deleteListing(id) {
    const item = listings.find(function (l) {
      return l.id === id;
    });
    if (!item) return;
    if (!session || session.displayName !== item.ownerName) {
      alert("Only the listing owner (matching demo session name) can delete this listing.");
      return;
    }
    if (!confirm("Delete this listing? This only affects data stored in this browser.")) return;
    listings = listings.filter(function (l) {
      return l.id !== id;
    });
    favorites = favorites.filter(function (fid) {
      return fid !== id;
    });
    saveListings();
    saveFavorites();
    detailModal.classList.add("hidden");
    renderListings();
    renderFavorites();
  }

  function toggleFavorite(id) {
    const i = favorites.indexOf(id);
    if (i === -1) favorites.push(id);
    else favorites.splice(i, 1);
    saveFavorites();
  }

  // —— Detail modal ——
  function openDetail(id) {
    const item = listings.find(function (l) {
      return l.id === id;
    });
    if (!item) return;

    const isOwner = session && session.displayName === item.ownerName;
    const isFav = favorites.indexOf(item.id) !== -1;

    let imgBlock;
    if (item.imageUrl) {
      imgBlock =
        '<img class="detail-img" src="' +
        escapeHtml(item.imageUrl) +
        '" alt="" onerror="this.replaceWith(Object.assign(document.createElement(\'div\'),{className:\'detail-img-placeholder\',textContent:\'Image failed to load\'}))" />';
    } else {
      imgBlock = '<div class="detail-img-placeholder">No image provided</div>';
    }

    detailContent.innerHTML =
      imgBlock +
      "<h2 id=\"detail-title\">" +
      escapeHtml(item.title || "Untitled") +
      "</h2>" +
      '<div class="listing-cat">' +
      escapeHtml(item.category || "Not provided") +
      "</div>" +
      '<p class="detail-price">' +
      formatPrice(item.price) +
      "</p>" +
      '<div class="detail-meta">' +
      "Listed by: " +
      escapeHtml(item.ownerName || "Not provided") +
      "<br />Created: " +
      escapeHtml(formatDate(item.createdAt)) +
      (item.updatedAt && item.updatedAt !== item.createdAt
        ? "<br />Updated: " + escapeHtml(formatDate(item.updatedAt))
        : "") +
      "</div>" +
      '<div class="detail-desc">' +
      escapeHtml(item.description || "Not provided") +
      "</div>" +
      '<p class="hint">Price is display-only. This demo has no payment or transfer system.</p>' +
      '<div class="detail-actions">' +
      '<button type="button" class="btn btn-outline btn-sm" id="detail-fav">' +
      (isFav ? "★ Remove favorite" : "☆ Add favorite") +
      "</button>" +
      (isOwner
        ? '<button type="button" class="btn btn-outline btn-sm" id="detail-edit">Edit</button>' +
          '<button type="button" class="btn btn-danger btn-sm" id="detail-delete">Delete</button>'
        : "") +
      "</div>";

    document.getElementById("detail-fav").addEventListener("click", function () {
      toggleFavorite(item.id);
      openDetail(item.id);
      renderListings();
      renderFavorites();
    });
    const de = document.getElementById("detail-edit");
    if (de) {
      de.addEventListener("click", function () {
        detailModal.classList.add("hidden");
        startEdit(item.id);
      });
    }
    const dd = document.getElementById("detail-delete");
    if (dd) {
      dd.addEventListener("click", function () {
        deleteListing(item.id);
      });
    }

    detailModal.classList.remove("hidden");
  }

  // —— Init ——
  updateUserStatus();
  showPage("home");
})();