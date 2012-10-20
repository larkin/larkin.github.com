/* ============================================================================
game.js:
    Pete's minesweeper.
    
    Tested with Chrome-latest: other browsers may not work.
    
    `new_game()` creates a new game.  When a game has been created, the 
    following functions are defined:
        `validate_game()` checks if game is complete and fails if not.
        `cheat()` shows mine locations with flag.
        
    A game board is by default 8 tiles wide by 8 tiles high, with ten randomly
    placed mines.  I use two systems for referring to specific tiles:
    
    1) as a pair of cartesian (x,y) coordinates.  ex: a 2x2 game board
        
        (1,1)   (2,1)
        (2,1)   (2,2)
    
    2) as a position in a 1-dimensional array.  ex: a 2x2 game board
    
        1   2
        3   4

    For determining neighbors of clicked tile, I use cartesian coordinates.
    For everything else -- UI, mine placement -- I use a 1-dimensional array.ns
    
============================================================================ */

/* Configuration: 
Note: In order to change the board size, You must define new CSS rules to
display the board correctly. */

var NUM_MINES = 10;
var BOARD_SIZE = 8;
var BOARD_LEN = BOARD_SIZE * BOARD_SIZE;

function new_game() {
    var checked_positions = new Array();
    var game_over = false;
    var cheater = false;
    var mine_array = generate_mine_array(BOARD_LEN, NUM_MINES);
    
    // inject results if does not exist, remove children if it does exist.
    var results = document.getElementById('results');
    if (results == undefined) {
        results = document.createElement('div');
        results.setAttribute('id', 'results');
        document.body.appendChild(results);
    } else {
        while (results.hasChildNodes()) {
            results.removeChild(results.lastChild);
        }
    }
    
    // inject board if does not exist, remove children if it does exist.
    var board = document.getElementById('board');
    if (board == undefined) {
        board = document.createElement('div');
        board.setAttribute('id', 'board');
        document.body.appendChild(board);
    }
    while (board.hasChildNodes()) {
        board.removeChild(board.lastChild);
    }
    
    var lose_game = function(){
        // Explode all mines
        if (game_over) return false;
        mine_array.map(function(mine_loc) {
            set_tile_text(get_coordinate_from_position(mine_loc), '☀', ' boom')
        });
        if (cheater) {
            results.appendChild(document.createTextNode('You were cheating and you still lost!'));
        } else {
            results.appendChild(document.createTextNode('You Lose!'));
        }
        game_over = true;
    }
    
    var win_game = function(){
        // Set results.
        if (game_over) return false;
        if (cheater) {
            results.appendChild(document.createTextNode('You Win... Cheater!'));
        } else {
            results.appendChild(document.createTextNode('You Win!'));
        }
        game_over = true;
    }
    
    already_checked = function(position) {
        // utility function for preventing infinite recursion in check_neighbors.
        if (checked_positions.indexOf(position) != -1) {
            return true;
        } else {
            checked_positions.push(position);
            return false;
        }
    }
    
    var handle_click = function(e) {
        // Handles a click on a game tile.
        if (game_over) return false;
        var coordinate = get_coordinate_from_position(e.target.id);
        if (is_mine(coordinate)) {
            lose_game();
        } else {
            check_neighbors(coordinate);
        }
        return false;
    }
    
    cheat = function() {
        if (game_over) return false;
        cheater = true;
        mine_array.map(function(mine_loc) {
            set_tile_text(get_coordinate_from_position(mine_loc), '⚐', undefined);
        });
    }
    
    validate_game = function() {
        if (game_over) return false;
        if (checked_positions.length == (BOARD_LEN - NUM_MINES)) {
            win_game();
        } else {
            lose_game();
        }
    }
    
    /* Finally, let's inject the tiles into the board and the game is on! */
    for (var i = 0; i < BOARD_LEN; i++) {
        var tile = document.createElement('div');
        tile.addEventListener('click', handle_click);
        tile.setAttribute('id', i);
        
        if (mine_array.indexOf(i) != -1) {
            tile.className += ' mine';
        }
        board.appendChild(tile);
    }   
} // end new_game();

function generate_mine_array(len, num_mines) {
    /* Generates an array with `num_mines` numbers between 0 and `len` - 1 */
    var mine_array = new Array();
    
    while (mine_array.length < num_mines) {
        var mine_loc = Math.floor(Math.random()*len);
        while (mine_array.indexOf(mine_loc) != -1) {
            mine_loc = Math.floor(Math.random()*len);
        }
        mine_array.push(mine_loc)
    }
    
    return mine_array;
}

function check_neighbors(coordinate) {
    /* Counts the number of neighboring mines for a given coordinate.
    Injects the number of neighboring mines into the coordinate.
    If the number of neighboring mines is zero, calls check_neighbors on 
    neighbors. */
    
    // Don't check if it has been checked already.
    if (already_checked(coordinate.position)) {
        return;
    }
    
    var neighbors = get_neighbors(coordinate);
    var mines_nearby = 0;
    
    neighbors.map(function(neighbor) {
        if (is_mine(neighbor)) {
            mines_nearby++;
        }
    });
    
    if (mines_nearby == 0) {
        set_tile_text(coordinate, '', ' safe');
        neighbors.map(check_neighbors);
    } else {
        set_tile_text(coordinate, mines_nearby, ' safe');
    }
}

function set_tile_text(coordinate, text, class_name) {
    /* Sets the text of tile at coordinate `coordinate` to `text`, replacing
    any existing text.  If `class_name` is defined, adds it to the tile. */
    var tile = document.getElementById(coordinate.position);
    while (tile.hasChildNodes()) {
        tile.removeChild(tile.lastChild);
    }
    var span = document.createElement('span');
    span.appendChild(document.createTextNode(text));
    tile.appendChild(span);
    if (class_name != undefined) {
        tile.className += class_name;
    }
}

function is_mine(coordinate) {
    // returns true if there is a mine at `coordinate`, false if not.
    var tile = document.getElementById(coordinate.position);
    if (tile.className.indexOf('mine') != -1) {
        return true;
    } else {
        return false;
    }
}



/* ============================================================================
    Coordinates, conversions, and neighbors.
============================================================================ */

function Coordinate(x, y) {
    /* represents a coordinate and stores both a linear position (div id)
    and cartesian (x, y) coordinate */
    this.x = x;
    this.y = y;
    this.position = x + (y * BOARD_SIZE);
}

function get_surrounds(val) {
    // used to generate neighbor's x and y coordinates.
    return [-1, 0, 1].map(function(item) { return val + item; });
}

function get_coordinate_from_position(position) {
    // returns a new coordinate from a linear position (div id).
    return new Coordinate(position % BOARD_SIZE, Math.floor(position / BOARD_SIZE));
}

function get_neighbors(coords) {
    /* Returns a list of neighbors' Coordinates.  Excludes coordinates with an
    x or y value greater than `BOARD_SIZE - 1` or less than 0. */
    
    var x_vals = get_surrounds(coords.x);
    var y_vals = get_surrounds(coords.y);
    
    var neighbors = new Array();
    
    for (var xi=0; xi < x_vals.length; xi++) {
        if (x_vals[xi] < 0 || x_vals[xi] > (BOARD_SIZE - 1)) {
            continue;
        }
        for (var yi=0; yi < y_vals.length; yi++) {
            if (y_vals[yi] < 0 || y_vals[yi] > (BOARD_SIZE - 1) || (y_vals[yi] == coords.y && x_vals[xi] == coords.x)) {
                continue;
            }
            neighbors.push(new Coordinate(x_vals[xi], y_vals[yi]));
        }
    }
    
    return neighbors;
}