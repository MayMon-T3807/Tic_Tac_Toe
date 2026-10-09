// Game page: draws the board, sends moves to the server, shows the computer's notes.

const BOARD_SIZE = 300;
const MARK_SIZE = 26;

// Settings come from the address, for example /play?mode=ai&level=hard&mark=X
const params = new URLSearchParams(window.location.search);
const mode = params.get("mode") === "friend" ? "friend" : "ai";
const level = params.get("level") || "hard";
const humanMark = params.get("mark") === "O" ? "O" : "X";
const computerMark = humanMark === "X" ? "O" : "X";

const LEVEL_NAMES = { easy: "Easy", medium: "Medium", hard: "Unbeatable" };

// Game state
let board = [];
let currentPlayer = "X";
let gameOver = false;
let waiting = false; // true while the computer is thinking

// Page elements
const gridGroup = document.getElementById("grid");
const marksGroup = document.getElementById("marks");
const strikeGroup = document.getElementById("strike");
const hitGroup = document.getElementById("hit-areas");
const statusText = document.getElementById("status");


// ---------- talking to the server ----------

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


// ---------- drawing ----------

function buildBoard() {
  // Step 1: clear everything from the last game
  gridGroup.innerHTML = "";
  marksGroup.innerHTML = "";
  strikeGroup.innerHTML = "";
  hitGroup.innerHTML = "";

  // Step 2: draw the grid lines
  drawGrid(gridGroup, BOARD_SIZE);

  // Step 3: add one invisible square on top of each cell to catch clicks
  const cell = BOARD_SIZE / 3;
  for (let index = 0; index < 9; index++) {
    const square = document.createElementNS(SVG_NS, "rect");
    square.setAttribute("x", (index % 3) * cell);
    square.setAttribute("y", Math.floor(index / 3) * cell);
    square.setAttribute("width", cell);
    square.setAttribute("height", cell);
    square.setAttribute("class", "hit");
    square.setAttribute("tabindex", "0");
    square.setAttribute("role", "button");
    square.setAttribute("aria-label", "Square " + (index + 1));
    square.dataset.index = index;
    square.addEventListener("click", function () { playCell(index); });
    square.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        playCell(index);
      }
    });
    hitGroup.appendChild(square);
  }
}

function putMark(index, mark) {
  const center = cellCenter(index, BOARD_SIZE);
  drawMark(marksGroup, mark, center.x, center.y, MARK_SIZE, true);
  hitGroup.children[index].classList.add("taken");
}

function showNewMarks(newBoard) {
  // Draw only the marks that were not on the page yet
  for (let index = 0; index < 9; index++) {
    if (newBoard[index] !== " " && board[index] === " ") {
      putMark(index, newBoard[index]);
    }
  }
  board = newBoard.slice();
}

function showStatus(state) {
  if (state.winner) {
    statusText.textContent = describeWinner(state.winner);
  } else if (state.draw) {
    statusText.textContent = "A draw. Nobody got three in a row.";
  } else if (mode === "friend") {
    statusText.textContent = "Player " + state.current_player + ", it is your turn.";
  } else if (state.current_player === humanMark) {
    statusText.textContent = "Your turn. You are " + humanMark + ".";
  } else {
    statusText.textContent = "The computer is thinking...";
  }
}

function describeWinner(winner) {
  if (mode === "friend") return "Player " + winner + " wins!";
  if (winner === humanMark) return "You win!";
  return "The computer wins this one.";
}

function showNotes(ai) {
  // Fill the computer's notebook with the scores it just calculated
  const grid = document.getElementById("score-grid");
  const help = document.getElementById("note-help");
  grid.innerHTML = "";

  if (!ai) return;

  if (!ai.scores) {
    help.textContent = "This level does not search ahead, so it has no scores to show. Try Unbeatable to see them.";
    document.getElementById("note-chosen").textContent = "It chose square " + (ai.move + 1) + ".";
    document.getElementById("note-nodes").textContent = "";
    return;
  }

  help.textContent = "Scores before the computer's last move:";
  for (let index = 0; index < 9; index++) {
    const cell = document.createElement("div");
    cell.className = "score-cell";
    const score = ai.scores[String(index)];

    if (score === undefined) {
      cell.textContent = "-";
    } else {
      cell.textContent = score;
      if (score > 0) cell.classList.add("good");
      if (score < 0) cell.classList.add("bad");
    }
    if (index === ai.move) cell.classList.add("chosen");
    grid.appendChild(cell);
  }

  document.getElementById("note-chosen").textContent = "It chose square " + (ai.move + 1) + ", score " + ai.scores[String(ai.move)] + ".";
  document.getElementById("note-nodes").textContent = "Positions it looked at: " + ai.nodes.toLocaleString() + ".";
}

function finishIfOver(state) {
  if (!state.game_over) return;
  gameOver = true;
  if (state.winning_line) {
    drawStrike(strikeGroup, state.winning_line, BOARD_SIZE);
  }
}


// ---------- playing ----------

async function playCell(index) {
  // Step 1: ignore clicks that should not count
  if (gameOver || waiting || board[index] !== " ") return;
  if (mode === "ai" && currentPlayer !== humanMark) return;

  // Step 2: draw the player's mark right away
  const markToPlay = currentPlayer;
  putMark(index, markToPlay);
  board[index] = markToPlay;

  // Step 3: tell the server, and wait for the computer's answer
  waiting = true;
  try {
    const request = { board: boardBeforeMove(index), current_player: markToPlay, move: index };
    if (mode === "ai") {
      request.level = level;
      request.ai_player = computerMark;
      statusText.textContent = "The computer is thinking...";
    }
    const state = await postJson("/api/move", request);

    // Step 4: show the computer's reply a moment later, like a real turn
    if (state.ai) await sleep(500);
    showNewMarks(state.board);
    currentPlayer = state.current_player;
    showNotes(state.ai);
    showStatus(state);
    finishIfOver(state);
  } catch (error) {
    statusText.textContent = error.message;
  }
  waiting = false;
}

function boardBeforeMove(index) {
  const copy = board.slice();
  copy[index] = " ";
  return copy;
}

async function computerOpens() {
  // When the player is O, the computer (X) draws first
  waiting = true;
  statusText.textContent = "The computer is thinking...";
  try {
    const state = await postJson("/api/ai_move", { board: board, current_player: "X", level: level });
    await sleep(500);
    showNewMarks(state.board);
    currentPlayer = state.current_player;
    showNotes(state.ai);
    showStatus(state);
  } catch (error) {
    statusText.textContent = error.message;
  }
  waiting = false;
}

function startGame() {
  board = Array(9).fill(" ");
  currentPlayer = "X";
  gameOver = false;
  waiting = false;

  buildBoard();
  document.getElementById("score-grid").innerHTML = "";
  document.getElementById("note-chosen").textContent = "";
  document.getElementById("note-nodes").textContent = "";

  if (mode === "friend") {
    document.getElementById("who").textContent = "Two players on one screen. X goes first.";
    document.getElementById("notebook").hidden = true;
    showStatus({ current_player: "X" });
  } else {
    document.getElementById("who").textContent = "You are " + humanMark + ". The computer is " + computerMark + " (" + LEVEL_NAMES[level] + ").";
    showStatus({ current_player: "X" });
    if (computerMark === "X") computerOpens();
  }
}

document.getElementById("new-game").addEventListener("click", startGame);
startGame();