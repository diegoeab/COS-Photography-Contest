(function () {
  const loginPanel = document.getElementById("login-panel");
  const resultsPanel = document.getElementById("results-panel");
  const passwordInput = document.getElementById("admin-password");
  const unlockBtn = document.getElementById("unlock-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const loginStatus = document.getElementById("login-status");
  const resultsStatus = document.getElementById("results-status");
  const resultsBody = document.getElementById("results-body");

  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.SUPABASE_CONFIG || {};
  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Cambia este valor (mínimo 12+ caracteres)
  const ADMIN_PASSWORD = "Parangaricutirimicuaro";

  function setStatus(el, msg, type = "info") {
    el.textContent = msg || "";
    el.dataset.type = type;
  }

  async function loadResults() {
    setStatus(resultsStatus, "Loading results...", "warn");

    const { data, error } = await supabase
      .from("photo_scores")
      .select("photo_id,title,points")
      .order("points", { ascending: false })
      .order("photo_id", { ascending: true });

    if (error) {
      setStatus(resultsStatus, error.message || "Could not load results", "error");
      return;
    }

    resultsBody.innerHTML = data
      .map((row, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${row.title} <span class="muted">(${row.photo_id})</span></td>
          <td><strong>${row.points}</strong></td>
        </tr>
      `)
      .join("");

    setStatus(resultsStatus, `Loaded ${data.length} photos.`, "success");
  }

  unlockBtn.addEventListener("click", async () => {
    const value = passwordInput.value || "";
    if (value !== ADMIN_PASSWORD) {
      setStatus(loginStatus, "Incorrect password.", "error");
      return;
    }

    sessionStorage.setItem("cos_admin_unlocked", "1");
    loginPanel.classList.add("hidden");
    resultsPanel.classList.remove("hidden");
    await loadResults();
  });

  refreshBtn.addEventListener("click", loadResults);

  (async function init() {
    const unlocked = sessionStorage.getItem("cos_admin_unlocked") === "1";
    if (unlocked) {
      loginPanel.classList.add("hidden");
      resultsPanel.classList.remove("hidden");
      await loadResults();
    }
  })();
})();
