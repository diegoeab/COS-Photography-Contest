(function () {
  const statusEl = document.getElementById("status");
  const bodyEl = document.getElementById("results-body");

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

  async function loadFallbackPhotos() {
    const res = await fetch("./assets/data/photos.json");
    if (!res.ok) throw new Error("Could not load local catalog.");
    return res.json();
  }

  function renderRows(rows) {
    bodyEl.innerHTML = rows
      .map(
        (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${r.title || r.photo_id}</td>
            <td>${r.points}</td>
          </tr>
        `
      )
      .join("");
  }

  async function loadResults() {
    if (!supabase) {
      const photos = await loadFallbackPhotos();
      const demoRows = photos.map((p) => ({ photo_id: p.id, title: p.title, points: 0 }));
      renderRows(demoRows);
      setStatus("Demo mode without Supabase: all scores are 0.", "warn");
      return;
    }

    const { data, error } = await supabase
      .from("photo_scores")
      .select("photo_id,title,points")
      .order("points", { ascending: false })
      .order("photo_id", { ascending: true });

    if (error) throw error;

    renderRows(data || []);
    setStatus("Results updated.", "success");
  }

  loadResults().catch((err) => {
    setStatus(err?.message || "Error loading results.", "error");
  });
})();
