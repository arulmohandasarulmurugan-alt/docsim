/* ═══════════════════════════════════════════════
   DocSim — Application Logic (Cinematic)
   ═══════════════════════════════════════════════ */

// ── Watermark Exterminator ──
(function exterminateWatermarks() {
    const targetTexts = ['Made with', 'unicorn.studio'];

    const hideNode = (node) => {
        if (!node || node.nodeType !== 1) return;
        const text = (node.innerText || node.textContent || '').toLowerCase();
        const isBadge = targetTexts.some(t => text.includes(t.toLowerCase())) ||
            node.classList.contains('unicorn-studio-badge') ||
            (node.tagName === 'A' && node.href && node.href.includes('unicorn.studio'));

        if (isBadge) {
            node.style.setProperty('display', 'none', 'important');
            node.style.setProperty('opacity', '0', 'important');
            node.style.setProperty('visibility', 'hidden', 'important');
            node.style.setProperty('pointer-events', 'none', 'important');
            // node.remove(); // Sometimes removal triggers re-injection
        }

        // Check Shadow DOM
        if (node.shadowRoot) {
            node.shadowRoot.childNodes.forEach(hideNode);
        }

        // Recursive check for children
        node.childNodes.forEach(hideNode);
    };

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(m => m.addedNodes.forEach(hideNode));
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // Periodic deep sweep
    setInterval(() => {
        hideNode(document.body);
        hideNode(document.documentElement);
    }, 1000);
})();

// Set this to your live Backend URL
const API_BASE = "https://web-production-54120.up.railway.app";
// const API_BASE = window.location.origin; 


// ── State ──
let currentLayer = 'layer-hero';
let currentMode = 'double';

// ══════════════════════════════════════════════
//  CINEMATIC INTRO
// ══════════════════════════════════════════════
window.addEventListener('load', () => {
    const introSweep = document.getElementById('introSweep');
    const unicornBg = document.getElementById('unicornBg');

    // 1. Reveal from black
    setTimeout(() => {
        introSweep.classList.add('reveal');
        // 2. Growth effect for background
        unicornBg.classList.add('active');
    }, 400);
});

// ══════════════════════════════════════════════
//  LAYER NAVIGATION
// ══════════════════════════════════════════════
async function goToLayer(targetId) {
    if (targetId === currentLayer) return;

    const transitionSweep = document.getElementById('transitionSweep');
    const unicornBg = document.getElementById('unicornBg');
    const isResult = (targetId === 'layer-results');

    // ── Ultra-Premium Parallax Orchestration ──
    const directions = {
        'layer-hero': 'scale(1) translate3d(0, 0, 0)',
        'layer-upload': 'scale(1.05) translate3d(0, -2%, 0)',
        'layer-scanning': 'scale(1.1) translate3d(0, -4%, 0)',
        'layer-results': 'scale(1.15) translate3d(0, -6%, 0)',
        'layer-repo': 'scale(1.08) translate3d(0, -3%, 0)'
    };

    if (unicornBg) {
        unicornBg.style.transform = directions[targetId] || 'scale(1)';
    }

    // Cinematic Side Sweep for Results
    if (isResult) {
        transitionSweep.classList.add('active');
        await new Promise(r => setTimeout(r, 600));
    }

    // Switch layers
    document.querySelectorAll('.layer').forEach(l => l.classList.remove('active'));
    document.getElementById(targetId).classList.add('active');

    currentLayer = targetId;

    if (isResult) {
        setTimeout(() => transitionSweep.classList.remove('active'), 1200);
    }

    if (targetId === 'layer-repo') loadRecords();
}

// ══════════════════════════════════════════════
//  PARTICLE BACKGROUND (Simplified)
// ══════════════════════════════════════════════
(function initParticles() {
    const canvas = document.getElementById('particleCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let particles = [];
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.r = Math.random() * 1.5;
            this.alpha = Math.random() * 0.2;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(168, 85, 247, ${this.alpha})`;
            ctx.fill();
        }
    }
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(animate);
    }
    resize();
    window.addEventListener('resize', resize);
    for (let i = 0; i < 40; i++) particles.push(new Particle());
    animate();
})();

// ══════════════════════════════════════════════
//  UPLOAD LOGIC
// ══════════════════════════════════════════════
function switchTab(mode) {
    currentMode = mode;
    document.getElementById('tabDouble').classList.toggle('active', mode === 'double');
    document.getElementById('tabBulk').classList.toggle('active', mode === 'bulk');
    document.getElementById('doubleUpload').classList.toggle('hidden', mode !== 'double');
    document.getElementById('bulkUpload').classList.toggle('hidden', mode !== 'bulk');
    updateScanBtn();
}

function handleFileSelect(input, targetId) {
    const span = document.getElementById(targetId);
    if (input.files.length) {
        span.textContent = input.files[0].name;
        input.closest('.drop-card').classList.add('has-file');
    } else {
        span.textContent = '';
        input.closest('.drop-card').classList.remove('has-file');
    }
    updateScanBtn();
}

function handleBulkSelect(input) {
    const container = document.getElementById('bulkFileNames');
    container.innerHTML = '';
    if (input.files.length >= 2) {
        input.closest('.drop-card').classList.add('has-file');
        Array.from(input.files).forEach(f => {
            const chip = document.createElement('span');
            chip.className = 'chip'; chip.textContent = f.name;
            container.appendChild(chip);
        });
    } else {
        input.closest('.drop-card').classList.remove('has-file');
    }
    updateScanBtn();
}

function updateScanBtn() {
    const btn = document.getElementById('scanBtn');
    if (currentMode === 'double') {
        const f1 = document.getElementById('file1').files.length;
        const f2 = document.getElementById('file2').files.length;
        btn.disabled = !(f1 && f2);
    } else {
        const bf = document.getElementById('bulkFiles').files.length;
        btn.disabled = bf < 2;
    }
}

// ══════════════════════════════════════════════
//  SCANNING & API
// ══════════════════════════════════════════════
async function startScan() {
    goToLayer('layer-scanning');
    const pb = document.getElementById('progressBar');
    const status = document.getElementById('scanStatus');

    pb.style.width = '0%';
    const steps = [
        { p: 20, t: 'Extracting text...' },
        { p: 50, t: 'Calculating Jaccard Similarity...' },
        { p: 80, t: 'Finalizing scores...' }
    ];

    let i = 0;
    const interval = setInterval(() => {
        if (i < steps.length) {
            pb.style.width = steps[i].p + '%';
            status.textContent = steps[i].t;
            i++;
        }
    }, 800);

    try {
        let results;
        if (currentMode === 'double') {
            results = await compareDouble();
        } else {
            results = await compareBulk();
        }

        clearInterval(interval);
        pb.style.width = '100%';
        status.textContent = 'Ready!';

        setTimeout(() => {
            renderResults(Array.isArray(results) ? results : [results]);
            goToLayer('layer-results');
        }, 1000);

    } catch (err) {
        clearInterval(interval);
        status.textContent = 'Error: ' + err.message;
        setTimeout(() => goToLayer('layer-upload'), 2000);
    }
}

async function compareDouble() {
    const fd = new FormData();
    fd.append('file1', document.getElementById('file1').files[0]);
    fd.append('file2', document.getElementById('file2').files[0]);
    const res = await fetch(`${API_BASE}/api/compare`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

async function compareBulk() {
    const fd = new FormData();
    Array.from(document.getElementById('bulkFiles').files).forEach(f => fd.append('files', f));
    const res = await fetch(`${API_BASE}/api/bulk-compare`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('API Error');
    return res.json();
}

// ══════════════════════════════════════════════
//  RESULTS RENDERING (Cinematic Ace Cards)
// ══════════════════════════════════════════════
function renderResults(results) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = '';

    results.forEach((r, i) => {
        const level = r.similarity >= 70 ? 'high' : r.similarity >= 40 ? 'medium' : 'low';
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-back">
                    <div class="ace-design">♠</div>
                    <div class="ace-text">ACE OF SIMILARITY</div>
                </div>
                <div class="card-front">
                    <div class="files">
                        <span>${escHtml(r.file1)}</span> vs <span>${escHtml(r.file2)}</span>
                    </div>
                    <div class="similarity-value ${level}">${r.similarity}%</div>
                    <div class="similarity-bar-outer">
                        <div class="similarity-bar-inner ${level}" id="bar-${i}"></div>
                    </div>
                </div>
            </div>
        `;
        container.appendChild(card);

        // Sequence Reveal
        setTimeout(() => {
            card.classList.add('revealed');
            const bar = document.getElementById(`bar-${i}`);
            if (bar) bar.style.width = r.similarity + '%';
        }, 500 + (i * 400));
    });
}

function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

// ══════════════════════════════════════════════
//  RECORDS
// ══════════════════════════════════════════════
async function loadRecords() {
    const tbody = document.getElementById('repoBody');
    tbody.innerHTML = '<tr><td colspan="5">Loading...</td></tr>';
    try {
        const res = await fetch(`${API_BASE}/api/records`);
        const data = await res.json();
        tbody.innerHTML = '';
        data.forEach(rec => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${rec.id}</td>
                <td>${escHtml(rec.fileName1)}</td>
                <td>${escHtml(rec.fileName2)}</td>
                <td>${rec.similarityPercentage}%</td>
                <td>${new Date(rec.dateTime).toLocaleDateString()}</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5">Failed to load</td></tr>';
    }
}
