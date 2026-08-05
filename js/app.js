(function () {
  const statusEl = document.getElementById("status");
  const mainPhotoEl = document.getElementById("main-photo");
  const photoTitleEl = document.getElementById("photo-title");
  const photoCounterEl = document.getElementById("photo-counter");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const pickBtn = document.getElementById("pick-btn");
  const removeBtn = document.getElementById("remove-btn");
  const submitBtn = document.getElementById("submit-vote");
  const top3ListEl = document.getElementById("top3-list");

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG || {};
  const hasSupabaseConfig =
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR_PROJECT") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("YOUR_PUBLIC");

  const supabase = hasSupabaseConfig
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  let photos = [];
  let currentIndex = 0;
  let selected = [];

  function setStatus(msg, type = "info") {
    statusEl.textContent = msg || "";
    statusEl.dataset.type = type;
  }

  function getVoterToken() {
    const key = "cos_voter_token";
    let token = localStorage.getItem(key);
    if (!token) {
      token =
        (crypto.randomUUID && crypto.randomUUID()) ||
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, token);
    }
    return token;
  }

  async function loadPhotos() {
    const res = await fetch("./assets/data/photos.json");
    if (!res.ok) throw new Error("Could not load photos.json");
    return res.json();
  }

  function currentPhoto() {
    return photos[currentIndex];
  }

  function renderViewer() {
    if (!photos.length) return;

    const p = currentPhoto();
    mainPhotoEl.src = p.image_url;
    mainPhotoEl.alt = p.title;
    photoTitleEl.textContent = p.title;
    photoCounterEl.textContent = `Photo ${currentIndex + 1} of ${photos.length} • ID: ${p.id}`;

    const idx = selected.indexOf(p.id);
    if (idx >= 0) {
      pickBtn.textContent = `Already in Top 3 (#${idx + 1})`;
      pickBtn.disabled = true;
      removeBtn.disabled = false;
    } else {
      pickBtn.textContent = "Add to Top 3";
      pickBtn.disabled = selected.length >= 3;
      removeBtn.disabled = true;
    }
  }

  function slotHTML(rank, photo) {
    if (!photo) {
      return `
        <span class="slot-rank">#${rank}</span>
        <div class="slot-empty">No photo selected</div>
      `;
    }

    return `
      <span class="slot-rank">#${rank}</span>
      <div class="slot-item">
        <img src="${photo.image_url}" alt="${photo.title}" />
        <p class="slot-title">${photo.title}</p>
      </div>
    `;
  }

  function renderTop3() {
    const slots = top3ListEl.querySelectorAll(".slot");
    slots.forEach((slot, i) => {
      const id = selected[i];
      const photo = photos.find((x) => x.id === id);
      slot.innerHTML = slotHTML(i + 1, photo);
    });
  }

  function prevPhoto() {
    if (!photos.length) return;
    currentIndex = (currentIndex - 1 + photos.length) % photos.length;
    renderViewer();
  }

  function nextPhoto() {
    if (!photos.length) return;
    currentIndex = (currentIndex + 1) % photos.length;
    renderViewer();
  }

  function pickCurrent() {
    const p = currentPhoto();
    if (!p) return;

    if (selected.includes(p.id)) {
      setStatus("This photo is already in your Top 3.", "warn");
      return;
    }
    if (selected.length >= 3) {
      setStatus("You already selected 3 photos.", "warn");
      return;
    }

    selected.push(p.id);
    setStatus(`Added as #${selected.length}: ${p.title}`, "success");
    renderViewer();
    renderTop3();
  }

  function removeCurrent() {
    const p = currentPhoto();
    if (!p) return;

    const idx = selected.indexOf(p.id);
    if (idx === -1) {
      setStatus("This photo is not in your Top 3.", "warn");
      return;
    }

    selected.splice(idx, 1);
    setStatus(`Removed: ${p.title}`, "success");
    renderViewer();
    renderTop3();
  }

  async function submitVote() {
    if (selected.length !== 3) {
      setStatus("Select exactly 3 photos before submitting.", "error");
      return;
    }

    if (!supabase) {
      setStatus("Supabase config missing in js/config.js", "error");
      return;
    }

    const [favorite, second, third] = selected;
    const voterToken = getVoterToken();

    try {
      const { error } = await supabase.from("votes").insert({
        voter_token: voterToken,
        favorite_id: favorite,
        second_id: second,
        third_id: third
      });

      if (error) throw error;

      setStatus("Vote submitted successfully. Thank you!", "success");
      submitBtn.disabled = true;
      pickBtn.disabled = true;
      removeBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } catch (err) {
      setStatus(err.message || "Could not submit vote.", "error");
    }
  }

  async function init() {
    try {
      photos = await loadPhotos();
      renderViewer();
      renderTop3();

      prevBtn.addEventListener("click", prevPhoto);
      nextBtn.addEventListener("click", nextPhoto);
      pickBtn.addEventListener("click", pickCurrent);
      removeBtn.addEventListener("click", removeCurrent);
      submitBtn.addEventListener("click", submitVote);

      document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") prevPhoto();
        if (e.key === "ArrowRight") nextPhoto();
      });
    } catch (err) {
      setStatus(err.message || "Error loading page.", "error");
    }
  }

  init();
})();
