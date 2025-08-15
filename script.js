// --- Elements
const settingsPanel = document.getElementById('settingsPanel');
const gamePanel     = document.getElementById('gamePanel');
const resultsPanel  = document.getElementById('resultsPanel');

const bubbleSizeEl  = document.getElementById('bubbleSize');
const sizeVal       = document.getElementById('sizeVal');
const durationEl    = document.getElementById('duration');
const difficultyEl  = document.getElementById('difficulty');

const startBtn      = document.getElementById('startBtn');
const openSettings  = document.getElementById('openSettings');
const backSettings  = document.getElementById('backSettings');
const restartBtn    = document.getElementById('restart');
const endEarlyBtn   = document.getElementById('endEarly');

const gameArea      = document.getElementById('gameArea');
const cursorEl      = document.getElementById('cursor');
const countdownEl   = document.getElementById('countdown');
const countNumEl    = document.getElementById('countNum');

const scoreEl       = document.getElementById('score');
const timeLeftEl    = document.getElementById('timeLeft');

const rScore        = document.getElementById('rScore');
const rBreakdown    = document.getElementById('rBreakdown');
const rTargets      = document.getElementById('rTargets');
const rTargetsNote  = document.getElementById('rTargetsNote');
const rAccuracy     = document.getElementById('rAccuracy');
const rAccuracyNote = document.getElementById('rAccuracyNote');

// --- State
let config = {
  bubbleSize: 60,
  duration: 60,
  difficulty: 'medium'
};
let timers = {
  spawn: null,
  game: null,
  countdown: null
};
let state = {
  running: false,
  timeLeft: 0,
  score: 0,
  targets: 0,
  hits: 0,
  clicks: 0
};

// Difficulty presets
const DIFF = {
  easy:   { spawnEvery: 900,  life: 1800 },
  medium: { spawnEvery: 650,  life: 1300 },
  hard:   { spawnEvery: 520,  life: 1000 }
};

// --- UI Wiring
sizeVal.textContent = `${bubbleSizeEl.value} px`;
bubbleSizeEl.addEventListener('input', e=>{
  sizeVal.textContent = `${e.target.value} px`;
});

// document.querySelectorAll('.bubble').forEach(bubble => {
//     bubble.addEventListener('click', () => {
//         // First, remove any previous fade classes
//         document.querySelectorAll('.bubble').forEach(b => b.classList.remove('fade'));

//         // Add fade class to all except the clicked one
//         document.querySelectorAll('.bubble').forEach(b => {
//             if (b !== bubble) {
//                 b.classList.add('fade');
//             }
//         });
//     });
// });


function removeBubble(bubbleElement) {
  // Add the fade-out class
  bubbleElement.classList.add('fade-out');

  // Wait for animation to finish, then remove from DOM
  setTimeout(() => {
    bubbleElement.remove();
  }, 250); // Matches the CSS transition time
}

openSettings.addEventListener('click', ()=> {
  resultsPanel.classList.add('hide');
  gamePanel.classList.add('hide');
  settingsPanel.classList.remove('hide');
});

if (backSettings) backSettings.addEventListener('click', ()=> {
  resultsPanel.classList.add('hide');
  settingsPanel.classList.remove('hide');
});

if (restartBtn) restartBtn.addEventListener('click', ()=> {
  resultsPanel.classList.add('hide');
  settingsPanel.classList.remove('hide');
});

startBtn.addEventListener('click', async ()=>{
  // read config
  config.bubbleSize = parseInt(bubbleSizeEl.value, 10);
  config.duration   = parseInt(durationEl.value, 10);
  config.difficulty = difficultyEl.value;

  // swap panels
  settingsPanel.classList.add('hide');
  gamePanel.classList.remove('hide');

  // init session
  resetState();
  timeLeftEl.textContent = state.timeLeft;
  scoreEl.textContent = state.score;

  // 3-2-1 countdown
  await runCountdown();
  startGame();
});

endEarlyBtn.addEventListener('click', endGame);

// custom crosshair inside game area
gameArea.addEventListener('mousemove', (e)=>{
  const rect = gameArea.getBoundingClientRect();
  cursorEl.style.left = `${e.clientX - rect.left}px`;
  cursorEl.style.top  = `${e.clientY - rect.top }px`;
});
gameArea.addEventListener('mouseenter', ()=> cursorEl.style.display='block');
gameArea.addEventListener('mouseleave', ()=> cursorEl.style.display='none');

// capture clicks for accuracy (misses)
gameArea.addEventListener('click', (e)=>{
  // if not a bubble, it's a miss
  if (!e.target.classList.contains('bubble')) {
    state.clicks++;
    // small miss flicker ring
    spawnRing(e.offsetX, e.offsetY, 24);
  }
});

// --- Game flow
function resetState(){
  clearTimers();
  state.running = false;
  state.timeLeft = config.duration;
  state.score = 0;
  state.targets = 0;
  state.hits = 0;
  state.clicks = 0;
  gameArea.innerHTML = ''; // clears any bubbles/rings
}

function runCountdown(){
  return new Promise(resolve=>{
    countdownEl.classList.remove('hide');
    let n = 3;
    countNumEl.textContent = n;
    timers.countdown = setInterval(()=>{
      n--;
      if (n > 0) {
        countNumEl.textContent = n;
      } else {
        clearInterval(timers.countdown);
        countdownEl.classList.add('hide');
        resolve();
      }
    }, 700);
  });
}

function startGame(){
  state.running = true;
  // spawn timer
  const { spawnEvery, life } = DIFF[config.difficulty];
  timers.spawn = setInterval(()=> spawnBubble(life), spawnEvery);

  // game countdown
  timers.game = setInterval(()=>{
    state.timeLeft--;
    timeLeftEl.textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }, 1000);
}

function endGame(){
  if (!state.running) return;
  state.running = false;
  clearTimers();

  // compute stats
  const accuracy = state.clicks ? Math.round((state.hits / state.clicks) * 100) : (state.hits?100:0);
  // “targets” are bubbles spawned; efficiency is hits/targets
  const efficiency = state.targets ? Math.round((state.hits / state.targets) * 100) : 0;

  // results UI
  rScore.textContent = state.score;
  rBreakdown.textContent = `${state.hits} Hits`;
  rTargets.textContent = state.targets;
  rTargetsNote.textContent = `${state.hits} Hits / ${state.targets} Targets • ${efficiency}% Efficiency`;
  rAccuracy.textContent = `${accuracy}%`;
  rAccuracyNote.textContent = `${state.hits} / ${state.clicks || 0} Hits/Clicks`;

  // swap panels
  gamePanel.classList.add('hide');
  resultsPanel.classList.remove('hide');
}

function clearTimers(){
  if (timers.spawn) clearInterval(timers.spawn);
  if (timers.game) clearInterval(timers.game);
  if (timers.countdown) clearInterval(timers.countdown);
  timers.spawn = timers.game = timers.countdown = null;
}

// --- Bubbles
function spawnBubble(lifeMs){
  const size = config.bubbleSize;
  const rect = gameArea.getBoundingClientRect();
  const maxX = rect.width  - size;
  const maxY = rect.height - size;

  // random position
  const x = Math.max(0, Math.floor(Math.random() * maxX));
  const y = Math.max(0, Math.floor(Math.random() * maxY));

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.style.width  = `${size}px`;
  bubble.style.height = `${size}px`;
  bubble.style.left   = `${x}px`;
  bubble.style.top    = `${y}px`;

  state.targets++;

  // click handler (hit)
  bubble.addEventListener('click', (e)=>{
    e.stopPropagation(); // do not count as miss
    state.hits++;
    state.clicks++;  // a click happened
    state.score += 1;
    scoreEl.textContent = state.score;

    // Ripple ring from center of bubble
    const rectB = bubble.getBoundingClientRect();
    const gx = rectB.left - rect.left + size/2;
    const gy = rectB.top  - rect.top  + size/2;
    spawnRing(gx, gy, size);

    // Pop animation + remove
    bubble.classList.add('pop');
    setTimeout(()=> bubble.remove(), 320);
  }, { once:true });

  gameArea.appendChild(bubble);

  // auto-remove (missed)
  setTimeout(()=>{
    if (bubble.isConnected){
      bubble.remove();
    }
  }, lifeMs);
}

// --- Visual ring on hit/miss
function spawnRing(x, y, base){
  const ring = document.createElement('div');
  ring.className = 'ring';
  ring.style.left = `${x}px`;
  ring.style.top  = `${y}px`;
  ring.style.width  = `${base}px`;
  ring.style.height = `${base}px`;
  gameArea.appendChild(ring);
  setTimeout(()=> ring.remove(), 500);
}
