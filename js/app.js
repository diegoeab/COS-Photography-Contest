(function () {
  const statusEl = document.getElementById("status");
  const galleryEl = document.getElementById("gallery");
  const formEl = document.getElementById("vote-form");
  const favoriteEl = document.getElementById("favorite");
  const secondEl = document.getElementById("second");
  const thirdEl = document.getElementById("third");

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG || {};
  const hasSupabaseConfig =
    SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT") &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_PUBLIC");

  const supabase = hasSupabaseConfig
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  function setStatus(msg, type = "info") {
    statusEl.textContent = msg;
    statusEl.dataset.type = type;
  }

  function getVoterToken() {
    const key = "cos_voter_token";
    let token = localStorage.getItem(key);
    if (!token) {
      token = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(key, token);
    }
    return token;
  }

  async function loadPhotos() {
    const res = await fetch("./assets/data/photos.json");
    if (!res.ok) throw new Error("Could not load sample photos.");
    return res.json();
  }

  function renderGallery(photos) {
    galleryEl.innerHTML = photos
      .map(
        (p) => `
        <article class="card">
          <img src="${p.image_url}" alt="${p.title}" loading="lazy" />
          <h3>${p.title}</h3>
          <p>ID: ${p.id}</p>
        </article>
      `
      )
      .join("");
  }

  function populateSelect(select, photos) {
    select.innerHTML = `<option value="">Select a photo</option>` +
      photos.map((p) => `<option value="${p.id}">${p.title} (${p.id})</option>`).join("");
  }

  function validateSelection(favorite, second, third) {
    if (!favorite || !second || !third) return "You must choose 3 photos.";
    const set = new Set([favorite, second, third]);
    if (set.size !== 3) return "All 3 selections must be different.";
    return null;
  }

  async function submitVote(payload) {
    if (!supabase) {
      throw new Error("Supabase is not configured in js/config.js");
    }

    const { data, error } = await supabase.from("votes").insert(payload).select("id").single();
    if (error) throw error;
    return data;
  }

  async function init() {
    try {
      const photos = await loadPhotos();
      renderGallery(photos);
      [favoriteEl, secondEl, thirdEl].forEach((s) => populateSelect(s, photos));

      if (!hasSupabaseConfig) {
        setStatus("Demo mode: configure Supabase in js/config.js to store real votes.", "warn");
      }

      formEl.addEventListener("submit", async (e) => {
        e.preventDefault();

        const favorite = favoriteEl.value;
        const second = secondEl.value;
        const third = thirdEl.value;

        const validationError = validateSelection(favorite, second, third);
        if (validationError) {
          setStatus(validationError, "error");
          return;
        }

        const voterToken = getVoterToken();

        try {
          await submitVote({
            voter_token: voterToken,
            favorite_id: favorite,
            second_id: second,
            third_id: third
          });
          setStatus("Vote submitted successfully.", "success");
          formEl.reset();
        } catch (err) {
          const message = err?.message || "Could not submit vote.";
          setStatus(message, "error");
        }
      });
    } catch (err) {
      setStatus(err.message || "Error loading page.", "error");
    }
  }

  init();
})();
