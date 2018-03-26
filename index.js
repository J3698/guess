var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var heapq = require('heapq');

// static files
app.use('/client', express.static(__dirname + "/client"));

// index
app.get('/*', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', pairClient);

// enums
var IO_EVTS = Object.freeze({
  PAIR: 'pair',
  REMOVE: 'remove',
  GUESS: 'guess',
  SELECT: 'select',
  ASK: 'ask',
  ANSWER: 'answer',
  WIN_STATE: 'win_state'
});

function pairClient(socket) {
    socket.once(IO_EVTS.PAIR, function(data) {
        // auto match make
        if (data == "") {
            if (queue.length) {
                var pair = queue.shift();
                var game = new Game(pair, socket);
                games.add(game);
                console.log('paired randomly');
            } else {
                queue.push(socket);
            }
        // match make by url
        } else {
            // matched game already at url
            if (urlPairedGames[data] == 0) {
                // don't match
            // no other socket at url
            } else if (urlPairedGames[data] == null) {
                urlPairedGames[data] = socket;
            // socket at url
            } else {
                var game = new Game(urlPairedGames[data], socket);
                games.add(game);
                urlPairedGames[data] = 0;
                console.log('paired at ' + data);
            }
        }
    });
}

var queue = [];
var games = new Set();
var urlPairedGames = {};

var names = ["aang", "katara", "sokka", "toph", "zuko", "iroh", "azula",
             "appa", "momo", "admiral-zhao", "suki", "king-bumi",
             "princess-yue", "jet", "mai", "ty-lee", "ozai", "roku",
             "cabbage-man", "aunt-wu", "master-pakku", "jeong-jeong",
             "combustion-man", "joo-dee"];

function Game(first, second) {
    var game = this;
    this.firstRemoved = [];
    this.secondRemoved = [];
    this.firstSelect;
    this.secondSelect;
    var firstQ = "";
    var secondQ = "";
    var firstA = "";
    var secondA = "";
    // "select" "ask" "wait1/2" "answer"
    /* gamestates:
     select - waiting for both players to select a character
     ask - both players thinking of questions
     wait1 - only first player has asked a question
     wait2 - only second player has asked a question
     answer - 
    */
    var gameState = "select";
    
    first.on(IO_EVTS.REMOVE, function(data) {
        if (gameState != "ask" && gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        if (game.firstRemoved.indexOf(data) < 0 && names.indexOf(data) >= 0) {
            game.firstRemoved.push(data);
            second.emit(IO_EVTS.REMOVE, data);
        }
    });
    second.on(IO_EVTS.REMOVE, function(data) {
        if (gameState != "ask" && gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        if (game.secondRemoved.indexOf(data) < 0 && names.indexOf(data) >= 0) {
            game.secondRemoved.push(data);
            first.emit(IO_EVTS.REMOVE, data);
        }
    });

    first.on(IO_EVTS.ASK, function(data) {
        if (gameState != "ask" && gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        if(firstQ == ""){
            firstQ = data;
            gameState = "wait1";
            if(secondQ != ""){
                first.emit(IO_EVTS.ASK, secondQ);
                second.emit(IO_EVTS.ASK, firstQ);
                gameState = "answer";
            }
        }
    });
    second.on(IO_EVTS.ASK, function(data) {
        if (gameState != "ask" && gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        if(secondQ == ""){
            secondQ = data;
            gameState = "wait2";
            if(firstQ != ""){
                first.emit(IO_EVTS.ASK, secondQ);
                second.emit(IO_EVTS.ASK, firstQ);
                gameState = "answer";
            }
        }
    });
    first.on(IO_EVTS.GUESS, function(data) {
        if (gameState != "ask" && gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        console.log(data + ' ' + game.secondSelect);
        gameState = "end";
        if (data == game.secondSelect) {
            first.emit(IO_EVTS.WIN_STATE, 'win');
            second.emit(IO_EVTS.WIN_STATE, 'lose');
        } else {
            first.emit(IO_EVTS.WIN_STATE, 'lose');
            second.emit(IO_EVTS.WIN_STATE, 'win');
        }
    });
    second.on(IO_EVTS.GUESS, function(data) {
        if (gameState != "ask" && gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        console.log(data + ' ' + game.firstSelect);
        gameState = "end";
        if (data == game.firstSelect) {
            second.emit(IO_EVTS.WIN_STATE, 'win');
            first.emit(IO_EVTS.WIN_STATE, 'lose');
        } else {
            second.emit(IO_EVTS.WIN_STATE, 'lose');
            first.emit(IO_EVTS.WIN_STATE, 'win');
        }
    });

    first.on(IO_EVTS.SELECT, function(data) {
        if (gameState != "select") { return; }
        if (!isString(data)) { return; }
        game.firstSelect = data;
        if (game.secondSelect) {
            gameState = "ask";
        }
    });
    second.on(IO_EVTS.SELECT, function(data) {
        if (gameState != "select") { return; }
        if (!isString(data)) { return; }
        game.secondSelect = data;
        if (game.firstSelect) {
            gameState = "ask";
        }
    });

    first.on(IO_EVTS.ANSWER, function(data) {
        if (gameState != "answer") { return; }
        if (!isString(data)) { return; }
        firstA = data;
        if(secondA != ""){
            var string1 = "You Asked: " + secondQ + '\n' + "They answered: " + firstA;
            second.emit(IO_EVTS.ANSWER, string1);
            var string2 = "You Asked: " + firstQ + '\n' + "They answered: " + secondA;
            first.emit(IO_EVTS.ANSWER, string2);
            firstQ = "";
            firstA = "";
            secondQ = "";
            secondA = "";
            gameState = "ask";
        }
    });
    second.on(IO_EVTS.ANSWER, function(data) {
        if (gameState != "answer") { return; }
        if (!isString(data)) { return; }
        secondA = data;
        if(firstA != ""){
            var string1 = "You Asked: " + secondQ + " | " + "They answered: " + firstA;
            second.emit(IO_EVTS.ANSWER, string1);
            var string2 = "You Asked: " + firstQ + " | " + "They answered: " + secondA;
            first.emit(IO_EVTS.ANSWER, string2);
            firstQ = "";
            firstA = "";
            secondQ = "";
            secondA = "";
            gameState = "ask";
        }
    });
}

function isString(data) {
    return typeof data === "string" || data instanceof String;
}

http.listen(process.env.PORT, process.env.IP);