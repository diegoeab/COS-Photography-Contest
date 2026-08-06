(function () {
  function must(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`UI error: missing element #${id} in index.html`);
    return el;
  }

  let statusEl;
  let mainPhotoEl;
  let photoTitleEl;
  let photoCounterEl;
  let prevBtn;
  let nextBtn;
  let pickBtn;
  let removeBtn;
  let submitBtn;
  let top3ListEl;

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
    if (!statusEl) return;
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
    if (!res.ok) throw new Error("Could not load ./assets/data/photos.json");
    return res.json();
  }

  function currentPhoto() {
    return photos[currentIndex];
  }

  function renderViewer() {
    if (!photos.length) {
      setStatus("No photos found in photos.json", "error");
      return;
    }

    const p = currentPhoto();
    mainPhotoEl.src = p.image_url;
    mainPhotoEl.alt = "";
    photoTitleEl.textContent = `Photo ${currentIndex + 1}`;
    photoCounterEl.textContent = `Photo ${currentIndex + 1} of ${photos.length}`;

    const idx = selected.indexOf(p.id);
    if (idx >= 0) {
      pickBtn.textContent = `Already in Top 3 (${idx + 1})`;
      pickBtn.disabled = true;
      removeBtn.disabled = false;
    } else {
      pickBtn.textContent = "Add to Top 3";
      // máximo 3 fotos seleccionadas
      pickBtn.disabled = selected.length >= 3;
      removeBtn.disabled = true;
    }
  }

  function slotHTML(rank, photo) {
    if (!photo) {
      return `
        <span class="slot-rank">${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}</span>
        <div class="slot-empty">No photo selected</div>
      `;
    }

    return `
      <span class="slot-rank">${rank === 1 ? "1st" : rank === 2 ? "2nd" : "3rd"}</span>
      <div class="slot-item">
        <img src="${photo.image_url}" alt="" />
      </div>
    `;
  }

  function renderTop3() {
    const slots = top3ListEl.querySelectorAll(".slot");
    if (!slots.length) {
      throw new Error('UI error: #top3-list has no ".slot" children');
    }

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
    setStatus(
      `Added as ${selected.length === 1 ? "1st" : selected.length === 2 ? "2nd" : "3rd"} photo.`,
      "success"
    );
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
    setStatus("Photo removed from your Top 3.", "success");
    renderViewer();
    renderTop3();
  }

  async function submitVote() {
    // NUEVA REGLA:
    // - al menos 1 foto (1st) obligatoria
    // - 2nd y 3rd opcionales (máximo 3 en total)
    if (selected.length < 1) {
      setStatus("Select at least 1 photo before submitting.", "error");
      return;
    }
    if (selected.length > 3) {
      setStatus("You can select at most 3 photos.", "error");
      return;
    }

    if (!supabase) {
      setStatus("Supabase config missing in js/config.js", "error");
      return;
    }

    const favorite = selected[0];
    const second = selected[1] || null;
    const third = selected[2] || null;

    const voterToken = getVoterToken();

    try {
      const payload = {
        voter_token: voterToken,
        favorite_id: favorite,
        second_id: second,
        third_id: third
      };

      const { error } = await supabase
        .from("votes")
        .upsert(payload, { onConflict: "voter_token" });

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

  function bindDom() {
    statusEl = must("status");
    mainPhotoEl = must("main-photo");
    photoTitleEl = must("photo-title");
    photoCounterEl = must("photo-counter");
    prevBtn = must("prev-btn");
    nextBtn = must("next-btn");
    pickBtn = must("pick-btn");
    removeBtn = must("remove-btn");
    submitBtn = must("submit-vote");
    top3ListEl = must("top3-list");
  }

  async function init() {
    try {
      bindDom();

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
      if (statusEl) {
        setStatus(err.message || "Error loading page.", "error");
      } else {
        console.error(err);
        alert(err.message || "Error loading page.");
      }
    }
  }

  init();
})();
