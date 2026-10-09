// Helpers that draw X, O, grid lines and win lines so they look hand-drawn.
// Every stroke is an SVG path that is "drawn" by animating its dash offset.

const SVG_NS = "http://www.w3.org/2000/svg";
const PENCIL = { X: "#2b2b2b", O: "#2f5d9e", STRIKE: "#c0392b" };

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function sleep(milliseconds) {
  return new Promise(function (resolve) { setTimeout(resolve, milliseconds); });
}

function addStroke(group, pathData, color, width, delay, duration, animate) {
  // Step 1: make the path
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", pathData);
  path.setAttribute("class", "pencil-stroke");
  path.setAttribute("stroke", color);
  path.setAttribute("stroke-width", width);
  group.appendChild(path);

  // Step 2: if no animation is wanted, leave it fully drawn
  if (!animate) {
    return path;
  }

  // Step 3: hide the whole line, then slowly reveal it
  const length = path.getTotalLength();
  path.style.strokeDasharray = length;
  path.style.strokeDashoffset = length;
  path.getBoundingClientRect(); // forces the browser to apply the hidden state first
  path.style.transition = "stroke-dashoffset " + duration + "ms ease-out " + delay + "ms";
  path.style.strokeDashoffset = 0;

  // Step 4: when finished, remove the dashes so the line stays solid at any size
  path.addEventListener("transitionend", function () {
    path.style.strokeDasharray = "none";
  });
  return path;
}

function drawLine(group, x1, y1, x2, y2, color, width, delay, duration, animate) {
  // A slightly bent line: the middle point is nudged to the side
  const middleX = (x1 + x2) / 2 + randomBetween(-3, 3);
  const middleY = (y1 + y2) / 2 + randomBetween(-3, 3);
  const pathData = "M " + x1 + " " + y1 + " Q " + middleX + " " + middleY + " " + x2 + " " + y2;
  return addStroke(group, pathData, color, width, delay, duration, animate);
}

function drawX(group, centerX, centerY, size, animate) {
  const jitter = function () { return randomBetween(-3, 3); };
  drawLine(group,
    centerX - size + jitter(), centerY - size + jitter(),
    centerX + size + jitter(), centerY + size + jitter(),
    PENCIL.X, 5, 0, 260, animate);
  drawLine(group,
    centerX + size + jitter(), centerY - size + jitter(),
    centerX - size + jitter(), centerY + size + jitter(),
    PENCIL.X, 5, 260, 260, animate);
}

function drawO(group, centerX, centerY, radius, animate) {
  // Walk around a circle a bit more than once, growing slightly,
  // so the start and end do not meet perfectly (like a real pencil O).
  const startAngle = randomBetween(0, Math.PI * 2);
  const totalTurn = Math.PI * 2 * 1.08;
  const steps = 48;
  let pathData = "";

  for (let step = 0; step <= steps; step++) {
    const progress = step / steps;
    const angle = startAngle + totalTurn * progress;
    const currentRadius = radius + progress * 4 + randomBetween(-0.8, 0.8);
    const x = centerX + Math.cos(angle) * currentRadius;
    const y = centerY + Math.sin(angle) * currentRadius;
    pathData += (step === 0 ? "M " : " L ") + x.toFixed(1) + " " + y.toFixed(1);
  }
  addStroke(group, pathData, PENCIL.O, 5, 0, 520, animate);
}

function drawMark(group, mark, centerX, centerY, size, animate) {
  if (mark === "X") {
    drawX(group, centerX, centerY, size, animate);
  } else {
    drawO(group, centerX, centerY, size, animate);
  }
}

function drawGrid(group, boardSize) {
  // Two vertical and two horizontal lines
  const third = boardSize / 3;
  const margin = 10;
  for (let i = 1; i <= 2; i++) {
    const position = third * i + randomBetween(-2, 2);
    drawLine(group, position, margin, position + randomBetween(-2, 2), boardSize - margin, PENCIL.X, 4, i * 120, 450, true);
    drawLine(group, margin, position, boardSize - margin, position + randomBetween(-2, 2), PENCIL.X, 4, 240 + i * 120, 450, true);
  }
}

function cellCenter(index, boardSize) {
  const cell = boardSize / 3;
  const column = index % 3;
  const row = Math.floor(index / 3);
  return { x: column * cell + cell / 2, y: row * cell + cell / 2 };
}

function drawStrike(group, winningLine, boardSize) {
  // A red line through the three winning cells, a bit longer at both ends
  const start = cellCenter(winningLine[0], boardSize);
  const end = cellCenter(winningLine[2], boardSize);
  const dx = (end.x - start.x) * 0.18;
  const dy = (end.y - start.y) * 0.18;
  drawLine(group, start.x - dx, start.y - dy, end.x + dx, end.y + dy, PENCIL.STRIKE, 7, 100, 500, true);
}