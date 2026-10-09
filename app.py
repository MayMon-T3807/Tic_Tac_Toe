# Flask server: connects the game engine and AI agents to the web page.
# The server keeps no game state. The page sends the board every time.
import os

from flask import Flask, jsonify, render_template, request

from agent import MinimaxAgent, make_agent, simulate_match
from game import EMPTY, PLAYER_O, PLAYER_X, TicTacToe

app = Flask(__name__)

MAX_SIM_GAMES = 200


# ---------- helpers ----------

def game_from_request(data):
    # Build a TicTacToe from the board the page sent
    board = data.get("board") or [EMPTY] * 9

    if len(board) != 9:
        raise ValueError("board must have 9 cells")
    for cell in board:
        if cell not in (PLAYER_X, PLAYER_O, EMPTY):
            raise ValueError("cells must be X, O or a space")

    return TicTacToe(board=board, current_player=data.get("current_player"))


def describe_game(game):
    # Everything the page needs to draw the board
    line = game.get_winning_line()
    return {
        "board": game.board,
        "current_player": game.current_player,
        "winner": game.check_winner(),
        "winning_line": list(line) if line else None,
        "draw": game.is_draw(),
        "game_over": game.is_game_over(),
    }


def ask_ai_for_move(game, level, player):
    # Returns the chosen move and info for the visualizer
    agent = make_agent(level, player)
    move = agent.get_move(game)

    info = {"move": move, "level": level, "scores": None, "nodes": None}

    # Only Minimax has scores and a node count to show
    if isinstance(agent, MinimaxAgent):
        info["scores"] = {str(pos): score for pos, score in agent.move_scores.items()}
        info["nodes"] = agent.nodes_visited

    return move, info


@app.errorhandler(ValueError)
def handle_bad_request(error):
    return jsonify({"error": str(error)}), 400


# ---------- pages ----------

@app.route("/")
def index():
    # Page 1: home (choose mark and level)
    return render_template("index.html")


@app.route("/play")
def play():
    # Page 2: the game board
    return render_template("game.html")


@app.route("/lab")
def lab():
    # Page 3: watch AI vs AI, benchmarks and pruning comparison
    return render_template("lab.html")


# ---------- game API ----------

@app.route("/api/new", methods=["POST"])
def new_game():
    return jsonify(describe_game(TicTacToe()))


@app.route("/api/move", methods=["POST"])
def human_move():
    # Human plays a move, then the AI (if one is chosen) replies
    data = request.get_json(force=True)
    game = game_from_request(data)
    ai_level = data.get("level")
    ai_player = data.get("ai_player", PLAYER_O)

    # Step 1: play the human move
    moved = game.make_move(data.get("move"))
    if not moved:
        raise ValueError("illegal move")

    # Step 2: let the AI reply if it is its turn and the game is not over
    ai_info = None
    ai_turn = game.current_player == ai_player
    if ai_level and ai_turn and not game.is_game_over():
        move, ai_info = ask_ai_for_move(game, ai_level, ai_player)
        game.make_move(move)

    # Step 3: send back the new state
    result = describe_game(game)
    result["ai"] = ai_info
    return jsonify(result)


@app.route("/api/ai_move", methods=["POST"])
def ai_move():
    # One AI move for whoever's turn it is (used for AI vs AI)
    data = request.get_json(force=True)
    game = game_from_request(data)

    if game.is_game_over():
        raise ValueError("game is already over")

    level = data.get("level", "hard")
    move, ai_info = ask_ai_for_move(game, level, game.current_player)
    game.make_move(move)

    result = describe_game(game)
    result["ai"] = ai_info
    return jsonify(result)


@app.route("/api/scores", methods=["POST"])
def scores():
    # Minimax scores for every move, without playing one
    data = request.get_json(force=True)
    game = game_from_request(data)

    if game.is_game_over():
        raise ValueError("game is already over")

    _, ai_info = ask_ai_for_move(game, "hard", game.current_player)
    return jsonify(ai_info)


@app.route("/api/simulate", methods=["POST"])
def simulate():
    # Bot vs bot benchmark
    data = request.get_json(force=True)

    games = int(data.get("games", 50))
    games = max(1, min(games, MAX_SIM_GAMES))

    agent1 = make_agent(data.get("agent1", "hard"), PLAYER_X)
    agent2 = make_agent(data.get("agent2", "easy"), PLAYER_O)

    result = simulate_match(agent1, agent2, games)
    result["agent1"] = agent1.name
    result["agent2"] = agent2.name
    return jsonify(result)


pruning_cache = {}


@app.route("/api/pruning", methods=["POST"])
def pruning():
    # Compare nodes searched on an empty board: plain Minimax vs Alpha-Beta
    if not pruning_cache:
        for use_pruning in (True, False):
            agent = MinimaxAgent(player=PLAYER_X, use_alpha_beta=use_pruning)
            agent.get_move(TicTacToe())
            pruning_cache[use_pruning] = agent.nodes_visited

    with_pruning = pruning_cache[True]
    without_pruning = pruning_cache[False]
    saved = round(100 * (without_pruning - with_pruning) / without_pruning, 1)

    return jsonify({
        "with_pruning": with_pruning,
        "without_pruning": without_pruning,
        "saved_percent": saved,
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)