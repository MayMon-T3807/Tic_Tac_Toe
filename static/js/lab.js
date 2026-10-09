// Lab page: watch AI vs AI, run matches, compare pruning.

const LAB_BOARD_SIZE = 300;
const LEVEL_LABELS = { easy: "Easy", medium: "Medium", hard: "Unbeatable" };

async function postJson(address, data) {
  const response = await fetch(address, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || "Something went wrong");
  }
  return result;
}

function addBar(container, label, percent, text, colorClass) {
  const row = document.createElement("div");
  row.className = "bar-row";

  const name = document.createElement("span");
  name.textContent = label;

  const track = document.createElement("div");
  track.className = "bar-track";
  const fill = document.createElement("div");
  fill.className = "bar-fill " + colorClass;
  fill.textContent = text;
  fill.style.width = "0%";

  track.appendChild(fill);
  row.appendChild(name);
  row.appendChild(track);
  container.appendChild(row);

  // Set the width after the row is on the page so the bar grows
  setTimeout(function () { fill.style.width = Math.max(percent, 4) + "%"; }, 30);
}


// ---------- 1. watch two computers ----------

let watchRun = 0; // changes every time a new game starts, so an old game stops

async function watchGame() {
  watchRun++;
  const thisRun = watchRun;

  const levels = {
    X: document.getElementById("watch-x").value,
    O: document.getElementById("watch-o").value,
  };
  const marksGroup = document.getElementById("watch-marks");
  const strikeGroup = document.getElementById("watch-strike");
  const gridGroup = document.getElementById("watch-grid");
  const log = document.getElementById("watch-log");
  const status = document.getElementById("watch-status");

  // Step 1: fresh paper
  gridGroup.innerHTML = "";
  marksGroup.innerHTML = "";
  strikeGroup.innerHTML = "";
  log.innerHTML = "";
  drawGrid(gridGroup, LAB_BOARD_SIZE);
  status.textContent = "Playing...";
  await sleep(900);

  // Step 2: keep asking the server for the next move until the game ends
  let board = Array(9).fill(" ");
  let currentPlayer = "X";
  let state = { game_over: false };

  while (!state.game_over) {
    state = await postJson("/api/ai_move", {
      board: board,
      current_player: currentPlayer,
      level: levels[currentPlayer],
    });
    if (thisRun !== watchRun) return; // a newer game was started

    // Draw the new mark and add a line to the log
    const move = state.ai.move;
    const center = cellCenter(move, LAB_BOARD_SIZE);
    drawMark(marksGroup, currentPlayer, center.x, center.y, 26, true);

    let note = currentPlayer + " (" + LEVEL_LABELS[levels[currentPlayer]] + ") took square " + (move + 1);
    if (state.ai.nodes) note += ", looked at " + state.ai.nodes.toLocaleString() + " positions";
    const item = document.createElement("li");
    item.textContent = note;
    log.appendChild(item);

    board = state.board;
    currentPlayer = state.current_player;
    await sleep(900);
    if (thisRun !== watchRun) return;
  }

  // Step 3: show the result
  if (state.winning_line) drawStrike(strikeGroup, state.winning_line, LAB_BOARD_SIZE);
  status.textContent = state.winner ? state.winner + " wins." : "A draw.";
}


// ---------- 2. run a match ----------

async function runMatch() {
  const bars = document.getElementById("bench-bars");
  const status = document.getElementById("bench-status");
  const levelX = document.getElementById("bench-x").value;
  const levelO = document.getElementById("bench-o").value;
  const games = Number(document.getElementById("bench-games").value) || 1;

  bars.innerHTML = "";
  status.textContent = "Playing " + games + " games...";

  try {
    const result = await postJson("/api/simulate", { agent1: levelX, agent2: levelO, games: games });
    const total = result.games;
    const percent = function (count) { return (100 * count) / total; };

    addBar(bars, "X wins", percent(result.agent1_wins), result.agent1_wins + " (" + percent(result.agent1_wins).toFixed(0) + "%)", "x-color");
    addBar(bars, "Draws", percent(result.draws), result.draws + " (" + percent(result.draws).toFixed(0) + "%)", "draw-color");
    addBar(bars, "O wins", percent(result.agent2_wins), result.agent2_wins + " (" + percent(result.agent2_wins).toFixed(0) + "%)", "o-color");
    status.textContent = LEVEL_LABELS[levelX] + " (X, moves first) against " + LEVEL_LABELS[levelO] + " (O), " + total + " games.";
  } catch (error) {
    status.textContent = error.message;
  }
}


// ---------- 3. pruning comparison ----------

async function comparePruning() {
  const bars = document.getElementById("prune-bars");
  const status = document.getElementById("prune-status");
  bars.innerHTML = "";
  status.textContent = "Searching both ways, this takes a few seconds...";

  try {
    const result = await postJson("/api/pruning", {});
    const withPercent = (100 * result.with_pruning) / result.without_pruning;

    addBar(bars, "Plain Minimax", 100, result.without_pruning.toLocaleString() + " positions", "slow-color");
    addBar(bars, "With Alpha-Beta", withPercent, result.with_pruning.toLocaleString() + " positions", "o-color");
    status.textContent = "Alpha-Beta skipped about " + result.saved_percent + "% of the work and chose the same move.";
  } catch (error) {
    status.textContent = error.message;
  }
}


drawGrid(document.getElementById("watch-grid"), LAB_BOARD_SIZE);

document.getElementById("watch-button").addEventListener("click", watchGame);
document.getElementById("bench-button").addEventListener("click", runMatch);
document.getElementById("prune-button").addEventListener("click", comparePruning);