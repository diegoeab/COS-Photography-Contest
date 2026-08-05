(function () {
  const statusEl = document.getElementById("status");
  const galleryEl = document.getElementById("gallery");
  const submitBtn = document.getElementById("submit-vote");
  const summaryEl = document.getElementById("selection-summary");

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG || {};
  const hasSupabaseConfig =
    SUPABASE_URL && !SUPABASE_URL.includes("YOUR_PROJECT") &&
    SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR_PUBLIC");

  const supabase = hasSupabaseConfig
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

  let photos = [];
  let selected = [];

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

  function selectionRank(photoId) {
    const idx = selected.indexOf(photoId);
    return idx === -1 ? null : idx + 1;
  }

  function updateSummary() {
    if (selected.length === 0) {
      summaryEl.textContent = "No photos selected yet.";
      return;
    }
    const lines = selected.map((id, i) => {
      const p = photos.find((x) => x.id === id);
      return `#${i + 1}: ${p ? p.title : id}`;
    });
    summaryEl.textContent = lines.join(" | ");
  }

  function renderGallery() {
    galleryEl.innerHTML = photos.map((p) => {
      const rank = selectionRank(p.id);
      return `
        <article class="card ${rank ? "selected" : ""}" data-photo-id="${p.id}">
          <img src="${p.image_url}" alt="${p.title}" loading="lazy" />
          <h3>${p.title}</h3>
          <p>ID: ${p.id}</p>
          ${rank ? `<span class="rank-badge">Pick #${rank}</span>` : ""}
        </article>
      `;
    }).join("");

    galleryEl.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("click", () => {
        const photoId = card.dataset.photoId;
        const existing = selected.indexOf(photoId);

        if (existing >= 0) {
          selected.splice(existing, 1);
        } else {
          if (selected.length >= 3) {
            setStatus("You can only select 3 photos.", "warn");
            return;
          }
          selected.push(photoId);
        }

        setStatus("", "info");
        renderGallery();
        updateSummary();
      });
    });
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
      photos = await loadPhotos();
      renderGallery();
      updateSummary();

      if (!hasSupabaseConfig) {
        setStatus("Demo mode: configure Supabase in js/config.js to store real votes.", "warn");
      }

      submitBtn.addEventListener("click", async () => {
        if (selected.length !== 3) {
          setStatus("Select exactly 3 photos before submitting.", "error");
          return;
        }

        const [favorite, second, third] = selected;
        const voterToken = getVoterToken();

        try {
          await submitVote({
            voter_token: voterToken,
            favorite_id: favorite,
            second_id: second,
            third_id: third
          });
          setStatus("Vote submitted successfully.", "success");
          selected = [];
          renderGallery();
          updateSummary();
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
