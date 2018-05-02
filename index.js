var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// static files
app.use('/client', express.static(__dirname + "/client"));

// game
app.get('/game/*', function(req, res) {
    res.sendFile(__dirname + '/client/game.html');
});
app.get('/game', function(req, res) {
    res.sendFile(__dirname + '/client/game.html');
});

// index
app.get('/*', function(req, res) {
    res.sendFile(__dirname + '/client/menu.html');
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
  WIN_STATE: 'win_state',
  CHAT: 'chat',
  PAIR_COMPLETE: 'pair_complete',
  SELECT_COMPLETE: 'select_complete',
  REMATCH: 'rematch',
  DING: 'ding'
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

var pingTimeout = 50000;  //50 seconds
var pingDelay = 500;
var timeoutWarning = 3 * pingDelay;

function Game(first, second) {
    var firstRemoved = [];
    var secondRemoved = [];

    var firstSelect;
    var secondSelect;

    var firstQ = null;
    var secondQ = null;
    var firstA = null;
    var secondA = null;

    var d = new Date();
    var t1 = d.getTime();
    var t2 = d.getTime();

    var firstRematch = false;
    var secondRematch = false;

    var firstDc = false;
    var secondDc = false;

    /* gamestates:
     select - waiting for both players to select a character
     ask - both players thinking of questions
     wait1 - only first player has asked a question
     wait2 - only second player has asked a question
     answer - 
    */
    var game = this;
    this.gameState = "select";

    first.emit(IO_EVTS.PAIR_COMPLETE);
    second.emit(IO_EVTS.PAIR_COMPLETE);

    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    var endGame = function(winner, loser, winMsg, loseMsg) {
        if (winner == first) {
            var winSelect = firstSelect;
            var loseSelect = secondSelect;
        } else {
            var winSelect = secondSelect;
            var loseSelect = firstSelect;
        }
        this.gameState = "end";
        var winData = ["win", winSelect, loseSelect, winMsg];
        winner.emit(IO_EVTS.WIN_STATE, winData);
        var loseData = ["lose", loseSelect, winSelect, loseMsg];
        loser.emit(IO_EVTS.WIN_STATE, loseData);
        clearInterval(pingCheck);
    }

    // ping check
    var pingCheck = setInterval(function(){
        var d = new Date();
        // console.log("Date:" + d.getTime());
        // console.log("T1:  " + t1);
        // console.log("T2:  " + t2);

        // manage temporary disconnections
        if (d.getTime() - t1 > timeoutWarning) {
            if (!firstDc) {
                firstDc = true;
                second.emit(IO_EVTS.DING, "opp_disconn");
            }
        } else {
            if (firstDc) {
                firstDc = false;
                second.emit(IO_EVTS.DING, "opp_reconn");
            }
        }
        if (d.getTime() - t2 > timeoutWarning) {
            if (!secondDc) {
                secondDc = true;
                first.emit(IO_EVTS.DING, "opp_disconn");
            }
        } else {
            if (secondDc) {
                secondDc = false;
                first.emit(IO_EVTS.DING, "opp_reconn");
            }
        }

        // manage permanent disconnection
        if (d.getTime() - t1 > pingTimeout) {
            if (game.gameState == "select") {
                second.emit(IO_EVTS.DING, "opp_left");
            } else {
                endGame(second, first, "You won! Your opponent disconnected!",
                                                "You lost! You disconnected!");
            }
        } else if (d.getTime() - t2 > pingTimeout) {
            if (game.gameState == "select") {
                    first.emit(IO_EVTS.DING, "opp_left");
            } else {
                endGame(first, second, "You won! Your opponent disconnected!",
                                                "You lost! You disconnected!");
            }
        }
    }, pingDelay);

    first.on(IO_EVTS.DING, function(data) {
        var d = new Date();
        t1 = d.getTime();
    });
    second.on(IO_EVTS.DING, function(data) {
        var d = new Date();
        t2 = d.getTime();
    });

    first.on(IO_EVTS.REMOVE, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        if (firstRemoved.indexOf(data) < 0 && names.indexOf(data) >= 0) {
            if (data == secondSelect) {
                endGame(second, first, "You won! Your opponent removed your character!",
                                    "You lost! Your removed your opponents character!");
            } else {
                firstRemoved.push(data);
                second.emit(IO_EVTS.REMOVE, data);
            }
        }
    });
    second.on(IO_EVTS.REMOVE, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        if (secondRemoved.indexOf(data) < 0 && names.indexOf(data) >= 0) {
            if (data == firstSelect) {
                endGame(first, second, "You won! Your opponent removed your character!",
                                    "You lost! Your removed your opponents character!");
            } else {
                secondRemoved.push(data);
                first.emit(IO_EVTS.REMOVE, data);
            }
        }
    });

    first.on(IO_EVTS.ASK, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        if(firstQ == null){
            firstQ = data;
            game.gameState = "wait1";
            if(secondQ != null){
                first.emit(IO_EVTS.ASK, secondQ);
                second.emit(IO_EVTS.ASK, firstQ);
                game.gameState = "answer";
            }
        }
    });
    second.on(IO_EVTS.ASK, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        if(secondQ == null){
            secondQ = data;
            game.gameState = "wait2";
            if(firstQ != null){
                first.emit(IO_EVTS.ASK, secondQ);
                second.emit(IO_EVTS.ASK, firstQ);
                game.gameState = "answer";
            }
        }
    });
    first.on(IO_EVTS.GUESS, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait2") { return; }
        if (!isString(data)) { return; }
        console.log(data + ' ' + secondSelect);
        game.gameState = "end";
        if (data == secondSelect) {
            endGame(first, second, "You won! You guessed your opponent's character correctly!",
                                "You lost! Your opponent guessed your character correctly!");
        } else {
            endGame(second, first, "You won! Your opponent guessed your character incorrectly as " + data + "!",
                                "You lost! You guessed your opponent's character incorrectly as " + data + "!");
        }
    });
    second.on(IO_EVTS.GUESS, function(data) {
        if (game.gameState != "ask" && game.gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        console.log(data + ' ' + firstSelect);
        game.gameState = "end";
        if (data == firstSelect) {
            endGame(second, first, "You won! You guessed your opponent's character correctly!",
                                "You lost! Your opponent guessed your character correctly!");
        } else {
            endGame(first, second, "You won! Your opponent guessed your character incorrectly as " + data + "!",
                                "You lost! You guessed your opponent's character incorrectly as " + data + "!");
        }
    });
    first.on(IO_EVTS.SELECT, function(data) {
        if (game.gameState != "select") { return; }
        if (!isString(data)) { return; }
        if (!names.includes(data)) { return; }
        firstSelect = data;
        if (secondSelect) {
            game.gameState = "ask";
            first.emit(IO_EVTS.SELECT_COMPLETE);
            second.emit(IO_EVTS.SELECT_COMPLETE);
        }
    });
    second.on(IO_EVTS.SELECT, function(data) {
        if (game.gameState != "select") { return; }
        if (!isString(data)) { return; }
        if (!names.includes(data)) { return; }
        secondSelect = data;
        if (firstSelect) {
            game.gameState = "ask";
            first.emit(IO_EVTS.SELECT_COMPLETE);
            second.emit(IO_EVTS.SELECT_COMPLETE);
        }
    });
    first.on(IO_EVTS.ANSWER, function(data) {
        if (game.gameState != "answer") { return; }
        if (!isString(data)) { return; }
        firstA = data;
        if(secondA != null){
            var string1 = "You Asked: " + secondQ + '\n' + "They answered: " + firstA;
            second.emit(IO_EVTS.ANSWER, string1);
            var string2 = "You Asked: " + firstQ + '\n' + "They answered: " + secondA;
            first.emit(IO_EVTS.ANSWER, string2);
            firstQ = null;
            firstA = null;
            secondQ = null;
            secondA = null;
            game.gameState = "ask";
        }
    });
    second.on(IO_EVTS.ANSWER, function(data) {
        if (game.gameState != "answer") { return; }
        if (!isString(data)) { return; }
        secondA = data;
        if(firstA != null){
            var string1 = "You Asked: " + secondQ + " | " + "They answered: " + firstA;
            second.emit(IO_EVTS.ANSWER, string1);
            var string2 = "You Asked: " + firstQ + " | " + "They answered: " + secondA;
            first.emit(IO_EVTS.ANSWER, string2);
            firstQ = null;
            firstA = null;
            secondQ = null;
            secondA = null;
            game.gameState = "ask";
        }
    });
    first.on(IO_EVTS.CHAT, function(data) {
        data = filterText(data);
        first.emit(IO_EVTS.CHAT, "You: " + data);
        second.emit(IO_EVTS.CHAT, "Friend: " + data);
    });
    second.on(IO_EVTS.CHAT, function(data) {
        data = filterText(data);
        first.emit(IO_EVTS.CHAT, "Friend: " + data);
        second.emit(IO_EVTS.CHAT, "You: " + data);
    });
    first.on(IO_EVTS.REMATCH, function(data) {
        if(secondRematch && !firstRematch){
            var text = "";
            for (var i = 0; i < 10; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            first.emit(IO_EVTS.REMATCH,text);
            second.emit(IO_EVTS.REMATCH,text);
        }
        else if(!secondRematch){
            if(firstRematch){
                second.emit(IO_EVTS.REMATCH,"cancel");
            }else{
                second.emit(IO_EVTS.REMATCH,"request");
            }
            firstRematch = !firstRematch;
        }
    });
    second.on(IO_EVTS.REMATCH, function(data) {
        if (firstRematch && !secondRematch) {
            var text = "";
            for (var i = 0; i < 10; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            first.emit(IO_EVTS.REMATCH,text);
            second.emit(IO_EVTS.REMATCH,text);
        } else if (!firstRematch) {
            if (secondRematch) {
                first.emit(IO_EVTS.REMATCH,"cancel");
            } else {
                first.emit(IO_EVTS.REMATCH,"request");
            }
            secondRematch = !secondRematch;
        }
    });
}

function isString(data) {
    return typeof data === "string" || data instanceof String;
}

function filterText(data){
    data = data + " ";
    data = data.replace("fuck ","flying hogmonkey ");
    data = data.replace("bitch ","bleeding hogmonkey ");
    data = data.replace("shit ","snoozles ");
    data = data.replace("dumbfuck ","yip yip ");
    data = data.replace("damn ","drat ");
    data = data.replace("cunt ","crud ");
    data = data.replace("fucking ","jerkbending ");
    return data;
}

http.listen(process.env.PORT, process.env.IP);