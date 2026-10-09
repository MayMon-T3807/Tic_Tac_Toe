# Tic-Tac-Toe game engine: board, moves, winner and draw checks.
#
# The board is a list of 9 cells, numbered like this:
#
#   0 | 1 | 2
#   3 | 4 | 5
#   6 | 7 | 8

PLAYER_X = 'X'
PLAYER_O = 'O'
EMPTY = ' '

# Every way to win: 3 rows, 3 columns, 2 diagonals
WIN_LINES = [
    (0, 1, 2), (3, 4, 5), (6, 7, 8),
    (0, 3, 6), (1, 4, 7), (2, 5, 8),
    (0, 4, 8), (2, 4, 6),
]


def other_player(player):
    if player == PLAYER_X:
        return PLAYER_O
    return PLAYER_X


class TicTacToe:
    def __init__(self, board=None, current_player=None):
        # Step 1: start with an empty board unless one is given
        if board is None:
            self.board = [EMPTY] * 9
        else:
            self.board = list(board)

        # Step 2: work out whose turn it is if it was not given
        if current_player is None:
            x_count = self.board.count(PLAYER_X)
            o_count = self.board.count(PLAYER_O)
            if x_count <= o_count:
                current_player = PLAYER_X
            else:
                current_player = PLAYER_O
        self.current_player = current_player

        # Step 3: remember moves so undo_move can restore the turn
        self.history = []

    def get_available_moves(self):
        # Positions of all empty cells
        moves = []
        for position in range(9):
            if self.board[position] == EMPTY:
                moves.append(position)
        return moves

    def is_valid_move(self, position):
        if not isinstance(position, int):
            return False
        if position < 0 or position > 8:
            return False
        return self.board[position] == EMPTY

    def make_move(self, position, player=None):
        # Step 1: use the current player if none is given
        if player is None:
            player = self.current_player

        # Step 2: refuse illegal moves
        if not self.is_valid_move(position):
            return False

        # Step 3: save the old turn, place the mark, pass the turn on
        self.history.append((position, self.current_player))
        self.board[position] = player
        self.current_player = other_player(player)
        return True

    def undo_move(self, position):
        # Step 1: nothing to undo on an empty cell or a bad position
        if not isinstance(position, int) or position < 0 or position > 8:
            return False
        if self.board[position] == EMPTY:
            return False

        # Step 2: give the turn back
        last_move_matches = len(self.history) > 0 and self.history[-1][0] == position
        if last_move_matches:
            self.current_player = self.history.pop()[1]
        else:
            self.current_player = self.board[position]

        # Step 3: clear the cell
        self.board[position] = EMPTY
        return True

    def get_winning_line(self):
        # Check each of the 8 lines: 3 equal marks that are not empty
        for line in WIN_LINES:
            first, second, third = line
            mark = self.board[first]
            if mark != EMPTY and mark == self.board[second] and mark == self.board[third]:
                return line
        return None

    def check_winner(self):
        line = self.get_winning_line()
        if line is None:
            return None
        return self.board[line[0]]

    def is_draw(self):
        # Board full and nobody won
        no_winner = self.check_winner() is None
        board_full = len(self.get_available_moves()) == 0
        return no_winner and board_full

    def is_game_over(self):
        has_winner = self.check_winner() is not None
        board_full = len(self.get_available_moves()) == 0
        return has_winner or board_full

    def copy(self):
        return TicTacToe(self.board, self.current_player)

    def __str__(self):
        rows = []
        for start in (0, 3, 6):
            rows.append(' | '.join(self.board[start:start + 3]))
        return '\n---------\n'.join(rows)