import { Game } from "./game.js";
import { AIController } from "./ai.js";
import { NetClient } from "./net.js";
import { setMasterVolume, preloadSamples, initMusic, AudioFx } from "./audio.js";
import { runBalanceTests } from "./tests.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");
const connectBtn = document.getElementById("connect-btn");
const roomInput = document.getElementById("room-input");
const volRange = document.getElementById("vol-range");
const muteBtn = document.getElementById("mute-btn");
const testBtn = document.getElementById("test-btn");
const cardsContainer = document.getElementById("cards");
const elixirLabel = document.getElementById("elixir-label");
const elixirBar = document.getElementById("elixir-bar");
const overlay = document.getElementById("overlay");
const playerKingHpLabel = document.getElementById("player-king-hp");
const playerTopHpLabel = document.getElementById("player-top-hp");
const playerBottomHpLabel = document.getElementById("player-bottom-hp");
const enemyKingHpLabel = document.getElementById("enemy-king-hp");
const enemyTopHpLabel = document.getElementById("enemy-top-hp");
const enemyBottomHpLabel = document.getElementById("enemy-bottom-hp");

// New UI elements
const currentRoomLabel = document.getElementById("current-room");
const clientIdLabel = document.getElementById("client-id");
const tokenExpLabel = document.getElementById("token-exp");
const roomListDiv = document.getElementById("room-list");
const refreshRoomsBtn = document.getElementById("refresh-rooms-btn");
const muteBgmBtn = document.getElementById("mute-bgm-btn");
const muteMenuBtn = document.getElementById("mute-menu-btn");

const DECK = [
  { key: "knight", title: "Knight", cost: 3, type: "unit" },
  { key: "archer", title: "Archer", cost: 3, type: "unit" },
  { key: "tank", title: "Tank", cost: 5, type: "unit" },
  { key: "bomber", title: "Bomber", cost: 4, type: "unit" },
  { key: "fireball", title: "Fireball", cost: 4, type: "spell" },
  { key: "freeze", title: "Freeze", cost: 3, type: "spell" },
  { key: "archer", title: "Archer", cost: 3, type: "unit" },
  { key: "knight", title: "Knight", cost: 3, type: "unit" },
];

let game = null;
let ai = null;
let net = null;
let hand = [];
let deckQueue = [];
let selectedIndex = 0;
let running = false;
let lastTimestamp = 0;
let multiplayer = false;
let room = "default";

function buildCards() {
  cardsContainer.innerHTML = "";
  hand.forEach((c, idx) => {
    const el = document.createElement("div");
    el.className = `card${selectedIndex === idx ? " selected" : ""}`;
    const t = document.createElement("div");
    t.className = "title";
    t.textContent = c.title;
    const cost = document.createElement("div");
    cost.className = "cost";
    cost.textContent = `Elixir: ${c.cost}`;
    el.appendChild(t);
    el.appendChild(cost);
    el.addEventListener("click", () => {
      selectedIndex = idx;
      buildCards();
    });
    cardsContainer.appendChild(el);
  });
}

function updateUI() {
  const p = game.player;
  elixirLabel.textContent = `Elixir: ${Math.floor(p.elixir)}/10`;
  elixirBar.style.width = `${(p.elixir / 10) * 100}%`;
  playerKingHpLabel.textContent = `Siz: King ${Math.max(0, Math.floor(game.player.king.hp))}`;
  playerTopHpLabel.textContent = `Top ${Math.max(0, Math.floor(game.player.topTower.hp))}`;
  playerBottomHpLabel.textContent = `Bottom ${Math.max(0, Math.floor(game.player.bottomTower.hp))}`;
  enemyKingHpLabel.textContent = `Raqib: King ${Math.max(0, Math.floor(game.enemy.king.hp))}`;
  enemyTopHpLabel.textContent = `Top ${Math.max(0, Math.floor(game.enemy.topTower.hp))}`;
  enemyBottomHpLabel.textContent = `Bottom ${Math.max(0, Math.floor(game.enemy.bottomTower.hp))}`;
}

function handleCanvasClick(ev) {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const x = ev.clientX - rect.left;
  const y = ev.clientY - rect.top;
  const card = hand[selectedIndex];
  if (!card) return;
  if (card.type === "unit") {
    const lane = y < canvas.height / 2 ? "top" : "bottom";
    game.spawnUnit(0, lane, card.key);
    if (multiplayer && net) net.send({ t: "spawn", lane, key: card.key });
    useSelectedCard();
  } else if (card.type === "spell") {
    game.castSpell(0, card.key, x, y, card.cost);
    if (multiplayer && net) net.send({ t: "spell", key: card.key, x, y, cost: card.cost });
    useSelectedCard();
  }
}

function loop(ts) {
  if (!running) return;
  if (!lastTimestamp) lastTimestamp = ts;
  const dt = Math.min(0.05, (ts - lastTimestamp) / 1000);
  lastTimestamp = ts;
  game.update(dt);
  ai.update(dt, game);
  game.draw(ctx);
  updateUI();
  if (game.over) {
    running = false;
    restartBtn.disabled = false;
    overlay.hidden = false;
    overlay.textContent = game.winner === 0 ? "G\u2018alaba! 🎉" : "Mag\u2018lubiyat 😔";
    return;
  }
  requestAnimationFrame(loop);
}

function start() {
  game = new Game(canvas.width, canvas.height);
  ai = new AIController();

  if (multiplayer && net && net.connected) {
    ai = { update() { } };
    net.onAction = (msg) => {
      if (msg.t === "spawn") {
        game.spawnUnit(1, msg.lane, msg.key);
      } else if (msg.t === "spell") {
        game.castSpell(1, msg.key, msg.x, msg.y, msg.cost);
      } else if (msg.t === "joined") {
        currentRoomLabel.textContent = msg.room;
        clientIdLabel.textContent = msg.cid;
        tokenExpLabel.textContent = new Date(msg.exp * 1000).toLocaleTimeString();
      } else if (msg.t === "rooms") {
        updateRoomList(msg.list);
      } else if (msg.t === "error") {
        overlay.textContent = msg.m;
        overlay.hidden = false;
        setTimeout(() => overlay.hidden = true, 3000);
      }
    };
    signToken({ cid: net.cid, room }).then(token => net.join(room, token));
    net.send({ t: "list" });
  }

  if (AudioFx.tracks.bgm) {
    AudioFx.tracks.menu.audio.pause();
    AudioFx.tracks.bgm.play();
  }

  running = true;
  lastTimestamp = 0;
  overlay.hidden = true;
  restartBtn.disabled = true;
  hand = DECK.slice(0, 4);
  deckQueue = DECK.slice(4);
  selectedIndex = 0;
  game.draw(ctx);
  updateUI();
  requestAnimationFrame(loop);
}

function updateRoomList(list) {
  roomListDiv.innerHTML = "";
  list.forEach(r => {
    const el = document.createElement("div");
    el.className = "room-item";
    el.innerHTML = `<span>${r.name}</span><span>(${r.count})</span>`;
    el.onclick = () => {
      roomInput.value = r.name;
      room = r.name;
    };
    roomListDiv.appendChild(el);
  });
}

async function init() {
  await preloadSamples();
  initMusic();
  if (AudioFx.tracks.menu) AudioFx.tracks.menu.play();
  buildCards();
  setupMultiplayer();
}

function restart() {
  start();
}

canvas.addEventListener("click", handleCanvasClick);
startBtn.addEventListener("click", () => {
  if (running) return;
  start();
});
restartBtn.addEventListener("click", () => {
  restart();
});

init();

refreshRoomsBtn.addEventListener("click", () => {
  if (net && net.connected) net.send({ t: "list" });
});

muteBgmBtn.addEventListener("click", () => {
  if (AudioFx.tracks.bgm) {
    AudioFx.tracks.bgm.toggleMute();
    muteBgmBtn.textContent = AudioFx.tracks.bgm.muted ? "Unmute" : "Mute";
  }
});

muteMenuBtn.addEventListener("click", () => {
  if (AudioFx.tracks.menu) {
    AudioFx.tracks.menu.toggleMute();
    muteMenuBtn.textContent = AudioFx.tracks.menu.muted ? "Unmute" : "Mute";
  }
});

function useSelectedCard() {
  if (deckQueue.length === 0) return;
  const nextCard = deckQueue.shift();
  const used = hand[selectedIndex];
  deckQueue.push(used);
  hand[selectedIndex] = nextCard;
  buildCards();
}

function setupMultiplayer() {
  const params = new URLSearchParams(window.location.search);
  multiplayer = params.get("mp") === "1";
  room = params.get("room") || "default";
  const vol = parseFloat(params.get("vol") || "0.12");
  if (!isNaN(vol)) setMasterVolume(vol);
  if (!multiplayer) return;
  net = new NetClient("ws://localhost:8080/");
  net.connect();
}

setupMultiplayer();

canvas.addEventListener("touchstart", (ev) => {
  const t = ev.touches[0];
  if (!t) return;
  const rect = canvas.getBoundingClientRect();
  const x = t.clientX - rect.left;
  const y = t.clientY - rect.top;
  const fake = { clientX: x + rect.left, clientY: y + rect.top };
  handleCanvasClick(fake);
  ev.preventDefault();
}, { passive: false });

async function signToken(obj) {
  const exp = Math.floor(Date.now() / 1000) + 300;
  const payload = JSON.stringify({ cid: obj.cid || "", room: obj.room || "default", exp });
  const enc = new TextEncoder();
  const keyData = enc.encode("mini-royale-secret");
  const cryptoKey = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(payload));
  const arr = Array.from(new Uint8Array(sig));
  const hex = arr.map(b => b.toString(16).padStart(2, "0")).join("");
  return hex;
}

connectBtn.addEventListener("click", () => {
  const r = roomInput.value.trim() || "default";
  room = r;
  if (!net) {
    net = new NetClient("ws://localhost:8080/");
    net.connect();
  }
  start();
});

volRange.addEventListener("input", () => {
  const v = parseFloat(volRange.value);
  if (!isNaN(v)) setMasterVolume(v);
});

let muted = false;
muteBtn.addEventListener("click", () => {
  muted = !muted;
  setMasterVolume(muted ? 0 : parseFloat(volRange.value));
});

testBtn.addEventListener("click", () => {
  const res = runBalanceTests(() => new Game(canvas.width, canvas.height));
  overlay.hidden = false;
  overlay.textContent = "Test: " + res.map(r => `t${Math.floor(r.time)}s w${r.winner} p${r.pKing} e${r.eKing}`).join(" | ");
  setTimeout(() => { overlay.hidden = true; }, 3000);
});
