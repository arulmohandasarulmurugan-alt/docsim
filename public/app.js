const layers = Array.from(document.querySelectorAll(".layer"));
const parallaxTargets = Array.from(document.querySelectorAll(".parallax"));
const revealTargets = Array.from(document.querySelectorAll(".reveal"));

const enterSystemBtn = document.getElementById("enterSystemBtn");
const startScanBtn = document.getElementById("startScanBtn");
const returnHomeBtn = document.getElementById("returnHomeBtn");
const openRepositoryBtn = document.getElementById("openRepositoryBtn");
const backToUploadBtn = document.getElementById("backToUploadBtn");
const returnResultsBtn = document.getElementById("returnResultsBtn");

const filesInput = document.getElementById("filesInput");
const fileCount = document.getElementById("fileCount");
const uploadError = document.getElementById("uploadError");
const uploadInfo = document.getElementById("uploadInfo");
const resultsError = document.getElementById("resultsError");
const historyError = document.getElementById("historyError");
const resultsGrid = document.getElementById("resultsGrid");
const historyTableBody = document.getElementById("historyTableBody");

const featureCarousel = document.getElementById("featureCarousel");
const carouselPrev = document.getElementById("carouselPrev");
const carouselNext = document.getElementById("carouselNext");
const bookElement = document.querySelector(".book");
const heroTitle = document.getElementById("heroTitle");
const heroPanel = document.querySelector("#layer1 .panel-scroll");

let pointerX = 0;
let pointerY = 0;
let bookScrollOffset = 0;

function showLayer(layerNumber) {
  layers.forEach((layer) => {
    layer.classList.toggle("active", Number(layer.dataset.layer) === layerNumber);
  });

  const activeLayer = layers.find((layer) => Number(layer.dataset.layer) === layerNumber);
  playLayerReveals(activeLayer);
  if (layerNumber === 1) {
    playHeroReveal();
    window.setTimeout(() => {
      if (heroPanel) {
        heroPanel.scrollTop = 0;
      }
    }, 0);
  }
}

function setText(el, text) {
  if (el) {
    el.textContent = text || "";
  }
}

function clearMessages() {
  setText(uploadError, "");
  setText(uploadInfo, "");
  setText(resultsError, "");
  setText(historyError, "");
}

function updateFileCount() {
  const total = filesInput.files.length;
  setText(fileCount, total ? `${total} file${total > 1 ? "s" : ""} selected` : "No files selected");
}

function validateFiles(files) {
  if (!files || files.length < 2) {
    return "Upload at least 2 files.";
  }

  if (files.length > 100) {
    return "You can upload up to 100 files only.";
  }

  const allowedExt = new Set(["txt", "pdf", "docx"]);
  for (const file of files) {
    const extension = file.name.split(".").pop().toLowerCase();
    if (!allowedExt.has(extension)) {
      return `Unsupported file type: ${file.name}. Allowed: TXT, PDF, DOCX.`;
    }
  }

  return null;
}

function renderResults(results) {
  resultsGrid.innerHTML = "";

  if (!results.length) {
    const emptyCard = document.createElement("article");
    emptyCard.className = "result-card";
    const title = document.createElement("h3");
    title.textContent = "No comparable pairs were produced.";
    const subtitle = document.createElement("p");
    subtitle.textContent = "Try different files.";
    emptyCard.appendChild(title);
    emptyCard.appendChild(subtitle);
    resultsGrid.appendChild(emptyCard);
    return;
  }

  const fragment = document.createDocumentFragment();
  results.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.style.animationDelay = `${Math.min(index * 0.045, 0.35)}s`;
    const title = document.createElement("h3");
    title.append(
      document.createTextNode(item.file_name_1),
      document.createElement("br"),
      document.createTextNode("vs"),
      document.createElement("br"),
      document.createTextNode(item.file_name_2)
    );
    const label = document.createElement("p");
    label.textContent = "Similarity";
    const score = document.createElement("strong");
    score.textContent = `${Number(item.similarity_percentage).toFixed(2)}%`;
    card.append(title, label, score);

    card.addEventListener("mousemove", (event) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const rotateY = ((event.clientX - cx) / rect.width) * 10;
      const rotateX = ((cy - event.clientY) / rect.height) * 10;
      card.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translate3d(0,0,0)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translate3d(0,0,0)";
    });

    fragment.appendChild(card);
  });

  resultsGrid.appendChild(fragment);
}

async function startScan() {
  clearMessages();
  const files = Array.from(filesInput.files);
  const validationError = validateFiles(files);

  if (validationError) {
    setText(uploadError, validationError);
    return;
  }

  showLayer(3);
  startScanBtn.disabled = true;

  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const response = await fetch("/api/scan/compare", { method: "POST", body: formData });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMessage = payload.error ? `${payload.message} ${payload.error}` : (payload.message || "Scan request failed.");
      throw new Error(errorMessage);
    }

    renderResults(payload.results || []);
    if (Array.isArray(payload.skipped_files) && payload.skipped_files.length > 0) {
      setText(
        resultsError,
        `Processed ${payload.total_files} readable file(s). Skipped: ${payload.skipped_files.map((item) => item.file).join(", ")}`
      );
    } else {
      setText(resultsError, "");
    }
    showLayer(4);
  } catch (error) {
    showLayer(2);
    setText(uploadError, error.message);
  } finally {
    startScanBtn.disabled = false;
  }
}

function formatDate(dateInput) {
  return new Date(dateInput).toLocaleString();
}

async function loadHistory() {
  clearMessages();
  historyTableBody.innerHTML = "";

  try {
    const response = await fetch("/api/scan/history");
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load repository.");
    }

    const rows = payload.history || [];
    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "No stored scan records found.";
      tr.appendChild(td);
      historyTableBody.appendChild(tr);
    } else {
      const fragment = document.createDocumentFragment();
      rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        const cells = [
          String(index + 1),
          String(row.id ?? "-"),
          String(row.file_name_1 ?? ""),
          String(row.file_name_2 ?? ""),
          `${Number(row.similarity).toFixed(2)}%`,
          formatDate(row.created_at)
        ];

        cells.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.appendChild(td);
        });
        fragment.appendChild(tr);
      });
      historyTableBody.appendChild(fragment);
    }

    showLayer(5);
  } catch (error) {
    setText(historyError, error.message);
    showLayer(5);
  }
}

function playLayerReveals(layer) {
  if (!layer) {
    return;
  }

  const targets = Array.from(layer.querySelectorAll(".reveal"));
  targets.forEach((target) => target.classList.remove("in"));

  targets.forEach((target, index) => {
    window.setTimeout(() => {
      target.classList.add("in");
    }, index * 85);
  });
}

function playHeroReveal() {
  if (!heroTitle) {
    return;
  }

  const text = heroTitle.dataset.text || heroTitle.textContent || "DocSim";
  heroTitle.textContent = "";

  text.split("").forEach((char, index) => {
    const span = document.createElement("span");
    span.className = "hero-letter";
    span.textContent = char;
    span.style.animationDelay = `${index * 0.08}s`;
    heroTitle.appendChild(span);
  });
}

function renderBookTransform() {
  if (!bookElement) {
    return;
  }

  const rx = 63 + pointerY * 0.12 - bookScrollOffset * 4.2;
  const rz = -14 + pointerX * 0.08;
  const tx = pointerX * 0.55;
  const ty = 7 + pointerY * 0.07 - bookScrollOffset * 8;
  bookElement.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}vh, 0)`;
}

function initCarousel() {
  if (!featureCarousel) {
    return;
  }

  const step = () => Math.max(featureCarousel.clientWidth * 0.72, 260);
  carouselPrev?.addEventListener("click", () => featureCarousel.scrollBy({ left: -step(), behavior: "smooth" }));
  carouselNext?.addEventListener("click", () => featureCarousel.scrollBy({ left: step(), behavior: "smooth" }));

  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  featureCarousel.addEventListener("pointerdown", (event) => {
    isDown = true;
    startX = event.clientX;
    startScroll = featureCarousel.scrollLeft;
    featureCarousel.setPointerCapture(event.pointerId);
  });

  featureCarousel.addEventListener("pointermove", (event) => {
    if (!isDown) {
      return;
    }
    const delta = event.clientX - startX;
    featureCarousel.scrollLeft = startScroll - delta;
  });

  const stopDrag = () => {
    isDown = false;
  };

  featureCarousel.addEventListener("pointerup", stopDrag);
  featureCarousel.addEventListener("pointercancel", stopDrag);
  featureCarousel.addEventListener("pointerleave", stopDrag);
}

function initParallax() {
  window.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 20;
    const y = (event.clientY / window.innerHeight - 0.5) * 20;
    pointerX = x;
    pointerY = y;

    parallaxTargets.forEach((item, index) => {
      const depth = (index + 1) * 0.42;
      item.style.transform = `translate3d(${(-x * depth).toFixed(2)}px, ${(-y * depth).toFixed(2)}px, 0)`;
    });

    renderBookTransform();
  });
}

function initHeroScrollParallax() {
  if (!heroPanel) {
    return;
  }

  heroPanel.addEventListener("scroll", () => {
    const maxScroll = heroPanel.scrollHeight - heroPanel.clientHeight;
    bookScrollOffset = maxScroll > 0 ? heroPanel.scrollTop / maxScroll : 0;
    renderBookTransform();
  });
}

function bindEvents() {
  enterSystemBtn?.addEventListener("click", () => showLayer(2));
  returnHomeBtn?.addEventListener("click", () => showLayer(1));
  backToUploadBtn?.addEventListener("click", () => showLayer(2));
  returnResultsBtn?.addEventListener("click", () => showLayer(4));
  startScanBtn?.addEventListener("click", startScan);
  openRepositoryBtn?.addEventListener("click", loadHistory);
  filesInput?.addEventListener("change", () => {
    updateFileCount();
    clearMessages();
  });
}

bindEvents();
updateFileCount();
initParallax();
initCarousel();
initHeroScrollParallax();
playHeroReveal();
showLayer(1);
