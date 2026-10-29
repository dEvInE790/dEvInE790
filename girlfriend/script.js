/* =========================================================
   Romantic "Will you be my girlfriend?" — behaviour
   ========================================================= */

/* ---------- Easy-to-edit settings ---------- */
const CONFIG = {
  heartEmojis: ["💗", "💖", "💕", "❤️", "💓", "🌸", "💞"],
  heartsPerSecond: 3,           // background hearts on normal screens
  celebrationHeartsPerSecond: 9,
  // Playful lines shown each time the No button dodges
  noMessages: [
    "Hmm, are you sure? 🥺",
    "Oops, too slow! 😜",
    "That button is shy… 🙈",
    "Think about it again 💭",
    "The YES button is right there 👀",
    "Pretty please? 🥹",
    "My heart can't take this 💔",
  ],
  // After this many dodges the No button lets itself be clicked
  dodgesBeforeGivingUp: 7,
  noAcceptedMessage: "That's okay… thank you for being honest. 💛 (You can still change your mind!) Tap below to let him know.",
};

/* ---------- Elements ---------- */
const $ = (id) => document.getElementById(id);
const screens = {
  intro: $("screen-intro"),
  question: $("screen-question"),
  yes: $("screen-yes"),
};
const btnContinue = $("btn-continue");
const btnYes = $("btn-yes");
const btnNo = $("btn-no");
const btnRestart = $("btn-restart");
const hint = $("hint");
const heartsLayer = $("hearts");
const waNo = $("wa-no");

/* ---------- Screen switching ---------- */
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
  document.body.classList.toggle("celebrating", name === "yes");
}

/* ---------- Floating hearts ---------- */
let heartTimer = null;

function spawnHeart() {
  const heart = document.createElement("span");
  heart.className = "heart";
  heart.textContent = CONFIG.heartEmojis[Math.floor(Math.random() * CONFIG.heartEmojis.length)];
  const size = 12 + Math.random() * 22;
  const duration = 7 + Math.random() * 7;
  heart.style.left = Math.random() * 100 + "vw";
  heart.style.fontSize = size + "px";
  heart.style.animationDuration = duration + "s";
  heart.style.setProperty("--drift", (Math.random() * 80 - 40) + "px");
  heart.style.setProperty("--o", (0.4 + Math.random() * 0.5).toFixed(2));
  heartsLayer.appendChild(heart);
  setTimeout(() => heart.remove(), duration * 1000);
}

function startHearts(perSecond) {
  clearInterval(heartTimer);
  heartTimer = setInterval(spawnHeart, 1000 / perSecond);
}

/* ---------- Runaway "No" button ---------- */
let dodges = 0;
let noGaveUp = false;

function moveNoButton() {
  if (noGaveUp) return;

  const rect = btnNo.getBoundingClientRect();
  // First dodge: lift the button out of the layout at its current spot
  if (!btnNo.classList.contains("runaway")) {
    btnNo.style.left = rect.left + "px";
    btnNo.style.top = rect.top + "px";
    btnNo.classList.add("runaway");
    // Move to <body> so the card's backdrop-filter doesn't trap position: fixed
    document.body.appendChild(btnNo);
    void btnNo.offsetWidth; // let the start position apply before animating
  }

  const margin = 16;
  const maxX = window.innerWidth - rect.width - margin;
  const maxY = window.innerHeight - rect.height - margin;
  const yesRect = btnYes.getBoundingClientRect();

  // Pick a spot that's a decent jump away and doesn't cover the YES button
  let x, y, tries = 0;
  do {
    x = margin + Math.random() * Math.max(0, maxX - margin);
    y = margin + Math.random() * Math.max(0, maxY - margin);
    tries++;
  } while (
    tries < 30 &&
    (Math.hypot(x - rect.left, y - rect.top) < 120 ||
      (x < yesRect.right + 10 && x + rect.width > yesRect.left - 10 &&
       y < yesRect.bottom + 10 && y + rect.height > yesRect.top - 10))
  );

  btnNo.style.left = x + "px";
  btnNo.style.top = y + "px";

  dodges++;
  hint.textContent = CONFIG.noMessages[(dodges - 1) % CONFIG.noMessages.length];

  // The YES button grows a little more tempting each time
  btnYes.style.transform = `scale(${Math.min(1 + dodges * 0.08, 1.6)})`;

  if (dodges >= CONFIG.dodgesBeforeGivingUp) {
    noGaveUp = true;
    hint.textContent = "Okay okay, I'll stop running… 😅";
  }
}

function onNoClick(e) {
  if (!noGaveUp) {
    // Clicked via keyboard or a lucky tap — dodge instead
    e.preventDefault();
    moveNoButton();
    return;
  }
  // Respect the answer, but keep it gentle and leave YES available
  btnNo.classList.add("shake");
  setTimeout(() => btnNo.classList.remove("shake"), 400);
  hint.textContent = CONFIG.noAcceptedMessage;
  waNo.hidden = false;
}

function resetNoButton() {
  dodges = 0;
  noGaveUp = false;
  btnNo.classList.remove("runaway");
  $("buttons").appendChild(btnNo);
  btnNo.style.left = "";
  btnNo.style.top = "";
  btnYes.style.transform = "";
  hint.textContent = "";
  waNo.hidden = true;
}

/* ---------- Confetti ---------- */
const canvas = $("confetti");
const ctx = canvas.getContext("2d");
let confetti = [];
let confettiFrame = null;
const confettiColors = ["#ffffff", "#ffd1dc", "#ff4d7d", "#ffe066", "#a0e7e5", "#ffb3c6", "#c77dff"];

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function burstConfetti(count = 180) {
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    confetti.push({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3,
      y: window.innerHeight * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 4,
      size: 6 + Math.random() * 6,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      life: 0,
    });
  }
  if (!confettiFrame) animateConfetti();
}

function animateConfetti() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  confetti.forEach((p) => {
    p.vy += 0.3;          // gravity
    p.vx *= 0.99;         // air drag
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life++;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    ctx.restore();
  });
  confetti = confetti.filter((p) => p.y < window.innerHeight + 40 && p.life < 400);
  confettiFrame = confetti.length ? requestAnimationFrame(animateConfetti) : null;
  if (!confettiFrame) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

function stopConfetti() {
  cancelAnimationFrame(confettiFrame);
  confettiFrame = null;
  confetti = [];
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

let confettiTimers = [];

/* ---------- Button wiring ---------- */
btnContinue.addEventListener("click", () => showScreen("question"));

btnYes.addEventListener("click", () => {
  resetNoButton();
  showScreen("yes");
  startHearts(CONFIG.celebrationHeartsPerSecond);
  burstConfetti();
  confettiTimers = [700, 1500, 2600].map((t) => setTimeout(() => burstConfetti(120), t));
});

btnRestart.addEventListener("click", () => {
  confettiTimers.forEach(clearTimeout);
  stopConfetti();
  resetNoButton();
  startHearts(CONFIG.heartsPerSecond);
  showScreen("intro");
});

// Desktop: dodge when the cursor gets close
btnNo.addEventListener("mouseenter", moveNoButton);
// Mobile: dodge on touch (preventDefault stops the tap from becoming a click)
btnNo.addEventListener("touchstart", (e) => {
  if (noGaveUp) return;
  e.preventDefault();
  moveNoButton();
}, { passive: false });
btnNo.addEventListener("click", onNoClick);

// Keep the runaway button on-screen if the window resizes / phone rotates
window.addEventListener("resize", () => {
  resizeCanvas();
  if (btnNo.classList.contains("runaway")) {
    const r = btnNo.getBoundingClientRect();
    btnNo.style.left = Math.min(r.left, window.innerWidth - r.width - 16) + "px";
    btnNo.style.top = Math.min(r.top, window.innerHeight - r.height - 16) + "px";
  }
});

/* ---------- Start ---------- */
resizeCanvas();
startHearts(CONFIG.heartsPerSecond);
for (let i = 0; i < 8; i++) setTimeout(spawnHeart, i * 150);
