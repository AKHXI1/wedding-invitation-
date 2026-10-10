// Envelope Logic
const envelope = document.getElementById('envelope');
document.getElementById('seal').addEventListener('click', () => {
  envelope.classList.add('open');
  document.body.classList.remove('locked');
  setTimeout(() => {
    document.querySelectorAll('.hero-container .reveal').forEach(el => el.classList.add('in'));
  }, 900);
});

// Intersection Observer for scroll animations
const observerOptions = {
  root: null,
  rootMargin: '0px',
  threshold: 0.15
};

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in');
    }
  });
}, observerOptions);

document.querySelectorAll('main .reveal').forEach((el) => {
  observer.observe(el);
});

// Countdown Logic
const clock = document.getElementById('clock');
const target = new Date(clock.dataset.date).getTime();
const pad = n => String(n).padStart(2, '0');

function tick() {
  const now = Date.now();
  const left = Math.max(0, target - now) / 1000;
  const parts = { 
    d: left / 86400, 
    h: (left / 3600) % 24, 
    m: (left / 60) % 60, 
    s: left % 60 
  };
  for (const u in parts) {
    const el = clock.querySelector(`[data-u="${u}"]`);
    if(el) el.textContent = pad(Math.floor(parts[u]));
  }
}
tick(); 
setInterval(tick, 1000);
