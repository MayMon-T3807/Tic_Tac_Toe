# AI players: Random (easy), Heuristic (medium), Minimax (unbeatable),
# plus a helper to play many games between two agents.
import random

from game import TicTacToe, PLAYER_X, PLAYER_O, other_player

CENTER = 4
CORNERS = [0, 2, 6, 8]
EDGES = [1, 3, 5, 7]

# Look at the center first, then corners, then edges (helps pruning)
MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7]


class RandomAgent:
    name = "Random"

    def __init__(self, player=PLAYER_X):
        self.player = player

    def get_move(self, game):
        # Pick any empty cell
        return random.choice(game.get_available_moves())


class HeuristicAgent:
    name = "Heuristic"

    def __init__(self, player=PLAYER_X):
        self.player = player

    def find_winning_move(self, game, player):
        # Try each empty cell and see if it wins the game for this player
        for move in game.get_available_moves():
            game.make_move(move, player)
            wins = game.check_winner() == player
            game.undo_move(move)
            if wins:
                return move
        return None

    def get_move(self, game):
        available = game.get_available_moves()

        # Rule 1: win right now if possible
        move = self.find_winning_move(game, self.player)
        if move is not None:
            return move

        # Rule 2: block the opponent if they could win next turn
        move = self.find_winning_move(game, other_player(self.player))
        if move is not None:
            return move

        # Rule 3: take the center
        if CENTER in available:
            return CENTER

        # Rule 4: take a corner
        free_corners = [m for m in CORNERS if m in available]
        if free_corners:
            return random.choice(free_corners)

        # Rule 5: take an edge
        free_edges = [m for m in EDGES if m in available]
        return random.choice(free_edges)


class MinimaxAgent:
    name = "Minimax"

    def __init__(self, player=PLAYER_O, use_alpha_beta=True):
        self.player = player
        self.opponent = other_player(player)
        self.use_alpha_beta = use_alpha_beta
        self.nodes_visited = 0
        self.move_scores = {}

    def get_move(self, game):
        self.nodes_visited = 0
        self.move_scores = {}

        best_move = None
        best_score = float('-inf')

        for move in self.ordered_moves(game):
            # step 1: try the move
            game.make_move(move, self.player)

            # step 2: score it, assuming the opponent plays next
            score = self.min_value(game, 1, float('-inf'), float('inf'))

            # step 3: take the move back
            game.undo_move(move)

            # step 4: remember the score and keep the best move so far
            self.move_scores[move] = score
            if score > best_score:
                best_score = score
                best_move = move

        return best_move

    def ordered_moves(self, game):
        available = game.get_available_moves()
        return [m for m in MOVE_ORDER if m in available]

    def final_score(self, game, depth):
        # returns None when the game is not over yet
        winner = game.check_winner()
        if winner == self.player:
            return 10 - depth
        if winner == self.opponent:
            return depth - 10
        if not game.get_available_moves():
            return 0
        return None

    def max_value(self, game, depth, alpha, beta):
        # our turn: pick the highest score
        self.nodes_visited += 1

        score = self.final_score(game, depth)
        if score is not None:
            return score

        best = float('-inf')
        for move in self.ordered_moves(game):
            game.make_move(move, self.player)
            best = max(best, self.min_value(game, depth + 1, alpha, beta))
            game.undo_move(move)

            alpha = max(alpha, best)
            if self.use_alpha_beta and alpha >= beta:
                break
        return best

    def min_value(self, game, depth, alpha, beta):
        # opponent's turn: assume they pick the lowest score for us
        self.nodes_visited += 1

        score = self.final_score(game, depth)
        if score is not None:
            return score

        best = float('inf')
        for move in self.ordered_moves(game):
            game.make_move(move, self.opponent)
            best = min(best, self.max_value(game, depth + 1, alpha, beta))
            game.undo_move(move)

            beta = min(beta, best)
            if self.use_alpha_beta and alpha >= beta:
                break
        return best


def make_agent(level, player):
    # Turn a level name from the web page into an agent
    level = level.lower()
    if level in ("easy", "random"):
        return RandomAgent(player=player)
    if level in ("medium", "heuristic"):
        return HeuristicAgent(player=player)
    if level in ("hard", "unbeatable", "minimax"):
        return MinimaxAgent(player=player)
    raise ValueError("Unknown agent level: " + level)


def simulate_match(agent1, agent2, num_games=100):
    # Play num_games full games and count the results
    results = {"agent1_wins": 0, "agent2_wins": 0, "draws": 0, "games": num_games}
    agent_for_mark = {agent1.player: agent1, agent2.player: agent2}

    for _ in range(num_games):
        game = TicTacToe()

        # Whoever's mark is up next chooses the move
        while not game.is_game_over():
            agent = agent_for_mark[game.current_player]
            game.make_move(agent.get_move(game))

        winner = game.check_winner()
        if winner is None:
            results["draws"] += 1
        elif winner == agent1.player:
            results["agent1_wins"] += 1
        else:
            results["agent2_wins"] += 1

    return results