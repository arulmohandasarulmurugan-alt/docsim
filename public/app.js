const layers = Array.from(document.querySelectorAll(".layer"));
const parallaxTargets = Array.from(document.querySelectorAll(".parallax"));

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

let lastScanResults = [];

function showLayer(layerNumber) {
  layers.forEach((layer) => {
    const isActive = Number(layer.dataset.layer) === layerNumber;
    layer.classList.toggle("active", isActive);
  });
}

function setText(el, text) {
  el.textContent = text || "";
}

function clearMessages() {
  setText(uploadError, "");
  setText(uploadInfo, "");
  setText(resultsError, "");
  setText(historyError, "");
}

function updateFileCount() {
  const total = filesInput.files.length;
  if (total === 0) {
    setText(fileCount, "No files selected");
    return;
  }
  setText(fileCount, `${total} file${total > 1 ? "s" : ""} selected`);
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
    resultsGrid.innerHTML = '<article class="result-card"><h3>No comparable pairs were produced.</h3><p>Try different files.</p></article>';
    return;
  }

  const fragment = document.createDocumentFragment();

  results.forEach((item, index) => {
    const card = document.createElement("article");
    card.className = "result-card";
    card.style.animationDelay = `${Math.min(index * 0.04, 0.35)}s`;
    card.innerHTML = `
      <h3>${item.file_name_1}<br>vs<br>${item.file_name_2}</h3>
      <p>Similarity</p>
      <strong>${Number(item.similarity_percentage).toFixed(2)}%</strong>
    `;

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
    const response = await fetch("/api/scan/compare", {
      method: "POST",
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Scan request failed.");
    }

    lastScanResults = payload.results || [];
    renderResults(lastScanResults);
    showLayer(4);
  } catch (error) {
    showLayer(2);
    setText(uploadError, error.message);
  } finally {
    startScanBtn.disabled = false;
  }
}

function formatDate(dateInput) {
  const date = new Date(dateInput);
  return date.toLocaleString();
}

async function loadHistory() {
  clearMessages();
  historyTableBody.innerHTML = "";

  try {
    const response = await fetch("/api/scan/history");
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || "Unable to load repository.");
    }

    const rows = payload.history || [];

    if (!rows.length) {
      historyTableBody.innerHTML = `
        <tr>
          <td colspan="6">No stored scan records found.</td>
        </tr>
      `;
    } else {
      const fragment = document.createDocumentFragment();
      rows.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>${row.id}</td>
          <td>${row.file_name_1}</td>
          <td>${row.file_name_2}</td>
          <td>${Number(row.similarity).toFixed(2)}%</td>
          <td>${formatDate(row.created_at)}</td>
        `;
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

function bindEvents() {
  enterSystemBtn.addEventListener("click", () => showLayer(2));
  returnHomeBtn.addEventListener("click", () => showLayer(1));
  backToUploadBtn.addEventListener("click", () => showLayer(2));
  returnResultsBtn.addEventListener("click", () => showLayer(4));
  startScanBtn.addEventListener("click", startScan);
  openRepositoryBtn.addEventListener("click", loadHistory);
  filesInput.addEventListener("change", () => {
    updateFileCount();
    clearMessages();
  });
}

function initParallax() {
  window.addEventListener("mousemove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 16;
    const y = (event.clientY / window.innerHeight - 0.5) * 16;

    parallaxTargets.forEach((item, index) => {
      const depth = (index + 1) * 0.45;
      item.style.transform = `translate3d(${(-x * depth).toFixed(2)}px, ${(-y * depth).toFixed(2)}px, 0)`;
    });
  });
}

bindEvents();
updateFileCount();
initParallax();
showLayer(1);
