(function () {
  function must(id) {
    const el = document.getElementById(id);

    if (!el) {
      throw new Error(
        `UI error: missing element #${id} in index.html`
      );
    }

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

  const {
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  } = window.SUPABASE_CONFIG || {};

  const hasSupabaseConfig =
    SUPABASE_URL &&
    !SUPABASE_URL.includes("YOUR_PROJECT") &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_ANON_KEY.includes("YOUR_PUBLIC");

  const supabase = hasSupabaseConfig
    ? window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      )
    : null;

  let photos = [];
  let currentIndex = 0;
  let selected = [];

  const VOTER_TOKEN_KEY = "cos_voter_token";
  const HAS_VOTED_KEY = "cos_has_voted";

  function setStatus(message, type = "info") {
    if (!statusEl) return;

    statusEl.textContent = message || "";
    statusEl.dataset.type = type;
  }

  function getVoterToken() {
    let token = localStorage.getItem(VOTER_TOKEN_KEY);

    if (!token) {
      token =
        window.crypto && window.crypto.randomUUID
          ? window.crypto.randomUUID()
          : `${Date.now()}-${Math.random()
              .toString(16)
              .slice(2)}`;

      localStorage.setItem(VOTER_TOKEN_KEY, token);
    }

    return token;
  }

  async function loadPhotos() {
    if (!supabase) {
      throw new Error(
        "Supabase config missing in js/config.js"
      );
    }

    const { data, error } = await supabase
      .from("photos")
      .select("id, title, image_url")
      .order("created_at", {
        ascending: true
      });

    if (error) {
      console.error(
        "Error loading photos from Supabase:",
        error
      );

      throw error;
    }

    return data || [];
  }

  function currentPhoto() {
    return photos[currentIndex];
  }

  function renderViewer() {
    if (!photos.length) {
      setStatus(
        "No photos found in Supabase.",
        "error"
      );

      mainPhotoEl.removeAttribute("src");
      photoTitleEl.textContent = `Photo ${currentIndex + 1}`;
      photoCounterEl.textContent = "";

      return;
    }

    const photo = currentPhoto();

    mainPhotoEl.src = photo.image_url;
    mainPhotoEl.alt = photo.title || "Contest photo";

    photoTitleEl.textContent =
      photo.title || `Photo ${currentIndex + 1}`;

    photoCounterEl.textContent =
      `Photo ${currentIndex + 1} of ${photos.length}`;

    const selectedIndex = selected.indexOf(photo.id);

    if (selectedIndex >= 0) {
      pickBtn.textContent =
        `Already in Top 3 (${selectedIndex + 1})`;

      pickBtn.disabled = true;
      removeBtn.disabled = false;
    } else {
      pickBtn.textContent = "Add to Top 3";
      pickBtn.disabled = selected.length >= 3;
      removeBtn.disabled = true;
    }
  }

  function slotHTML(rank, photo) {
    const rankText =
      rank === 1
        ? "1st"
        : rank === 2
        ? "2nd"
        : "3rd";

    if (!photo) {
      return `
        <span class="slot-rank">${rankText}</span>
        <div class="slot-empty">No photo selected</div>
      `;
    }

    return `
      <span class="slot-rank">${rankText}</span>
      <div class="slot-item">
        <img
          src="${photo.image_url}"
          alt="${photo.title || "Selected photo"}"
        />
      </div>
    `;
  }

  function renderTop3() {
    const slots = top3ListEl.querySelectorAll(".slot");

    if (!slots.length) {
      throw new Error(
        'UI error: #top3-list has no ".slot" children'
      );
    }

    slots.forEach((slot, index) => {
      const photoId = selected[index];

      const photo = photos.find(
        (item) => item.id === photoId
      );

      slot.innerHTML = slotHTML(index + 1, photo);
    });
  }

  function prevPhoto() {
    if (!photos.length) return;

    currentIndex =
      (currentIndex - 1 + photos.length) %
      photos.length;

    renderViewer();
  }

  function nextPhoto() {
    if (!photos.length) return;

    currentIndex =
      (currentIndex + 1) % photos.length;

    renderViewer();
  }

  function pickCurrent() {
    const photo = currentPhoto();

    if (!photo) return;

    if (selected.includes(photo.id)) {
      setStatus(
        "This photo is already in your Top 3.",
        "warn"
      );

      return;
    }

    if (selected.length >= 3) {
      setStatus(
        "You already selected 3 photos.",
        "warn"
      );

      return;
    }

    selected.push(photo.id);

    const position =
      selected.length === 1
        ? "1st"
        : selected.length === 2
        ? "2nd"
        : "3rd";

    setStatus(
      `Added as ${position} photo.`,
      "success"
    );

    renderViewer();
    renderTop3();
  }

  function removeCurrent() {
    const photo = currentPhoto();

    if (!photo) return;

    const selectedIndex = selected.indexOf(photo.id);

    if (selectedIndex === -1) {
      setStatus(
        "This photo is not in your Top 3.",
        "warn"
      );

      return;
    }

    selected.splice(selectedIndex, 1);

    setStatus(
      "Photo removed from your Top 3.",
      "success"
    );

    renderViewer();
    renderTop3();
  }

  async function submitVote() {
    if (selected.length < 1) {
      setStatus(
        "Select at least 1 photo before submitting.",
        "error"
      );

      return;
    }

    if (selected.length > 3) {
      setStatus(
        "You can select at most 3 photos.",
        "error"
      );

      return;
    }

    if (!supabase) {
      setStatus(
        "Supabase config missing in js/config.js",
        "error"
      );

      return;
    }

    const favorite = selected[0];
    const second = selected[1] || null;
    const third = selected[2] || null;
    const voterToken = getVoterToken();

    const payload = {
      voter_token: voterToken,
      favorite_id: favorite,
      second_id: second,
      third_id: third
    };

    try {
      const { error } = await supabase
        .from("votes")
        .upsert(payload, {
          onConflict: "voter_token"
        });

      if (error) {
        throw error;
      }

      localStorage.setItem(HAS_VOTED_KEY, "1");

      setStatus(
        "Thanks for voting!",
        "success"
      );

      submitBtn.disabled = true;
      pickBtn.disabled = true;
      removeBtn.disabled = true;
      prevBtn.disabled = true;
      nextBtn.disabled = true;
    } catch (error) {
      console.error("Error submitting vote:", error);

      setStatus(
        error.message || "Could not submit vote.",
        "error"
      );
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

  function disableVoting() {
    submitBtn.disabled = true;
    pickBtn.disabled = true;
    removeBtn.disabled = true;
    prevBtn.disabled = true;
    nextBtn.disabled = true;
  }

  async function init() {
    try {
      bindDom();

      const hasVoted =
        localStorage.getItem(HAS_VOTED_KEY) === "1";

      photos = await loadPhotos();

      renderViewer();
      renderTop3();

      if (hasVoted) {
        setStatus(
          "You already voted.",
          "warn"
        );

        disableVoting();

        return;
      }

      prevBtn.addEventListener(
        "click",
        prevPhoto
      );

      nextBtn.addEventListener(
        "click",
        nextPhoto
      );

      pickBtn.addEventListener(
        "click",
        pickCurrent
      );

      removeBtn.addEventListener(
        "click",
        removeCurrent
      );

      submitBtn.addEventListener(
        "click",
        submitVote
      );

      document.addEventListener(
        "keydown",
        (event) => {
          if (event.key === "ArrowLeft") {
            prevPhoto();
          }

          if (event.key === "ArrowRight") {
            nextPhoto();
          }
        }
      );
    } catch (error) {
      console.error(error);

      if (statusEl) {
        setStatus(
          error.message || "Error loading page.",
          "error"
        );
      } else {
        alert(
          error.message || "Error loading page."
        );
      }
    }
  }

  init();
})();
