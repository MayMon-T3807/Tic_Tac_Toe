// Home page: remember the two choices, draw the little marks, start the game.

let chosenMark = "X";
let chosenOpponent = "hard";

const OPPONENT_NAMES = {
  easy: "Easy",
  medium: "Medium",
  hard: "Unbeatable",
  friend: "a friend",
};

function drawDecorations() {
  // Underline under the title
  drawLine(document.getElementById("title-underline"), 4, 14, 410, 10, PENCIL.X, 5, 300, 700, true);

  // The X and O pictures on the two mark buttons
  document.querySelectorAll("[data-mark]").forEach(function (group) {
    drawMark(group, group.dataset.mark, 50, 50, 28, true);
  });
}

function selectChoice(container, clickedButton) {
  container.querySelectorAll(".choice").forEach(function (button) {
    const isChosen = button === clickedButton;
    button.classList.toggle("selected", isChosen);
    button.setAttribute("aria-pressed", isChosen);
  });
}

function updateSummary() {
  const summary = document.getElementById("summary");
  if (chosenOpponent === "friend") {
    summary.textContent = "Two players, X goes first.";
  } else {
    summary.textContent = "You play " + chosenMark + " against " + OPPONENT_NAMES[chosenOpponent] + ".";
  }
}

function setupChoices() {
  const markBox = document.getElementById("mark-choices");
  const opponentBox = document.getElementById("opponent-choices");

  markBox.addEventListener("click", function (event) {
    const button = event.target.closest(".choice");
    if (!button) return;
    chosenMark = button.dataset.value;
    selectChoice(markBox, button);
    updateSummary();
  });

  opponentBox.addEventListener("click", function (event) {
    const button = event.target.closest(".choice");
    if (!button) return;
    chosenOpponent = button.dataset.value;
    selectChoice(opponentBox, button);
    updateSummary();
  });
}

function startGame() {
  let address;
  if (chosenOpponent === "friend") {
    address = "/play?mode=friend";
  } else {
    address = "/play?mode=ai&level=" + chosenOpponent + "&mark=" + chosenMark;
  }
  window.location.href = address;
}

setupChoices();
updateSummary();
drawDecorations();
document.getElementById("start-button").addEventListener("click", startGame);