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
  WIN_STATE: 'win_state',
  CHAT: 'chat',
  PAIR_COMPLETE: 'pair_complete',
  SELECT_COMPLETE: 'select_complete',
  REMATCH: 'rematch'
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
    var firstR = false;
    var secondR = false;
    /* gamestates:
     select - waiting for both players to select a character
     ask - both players thinking of questions
     wait1 - only first player has asked a question
     wait2 - only second player has asked a question
     answer - 
    */
    var gameState = "select";

    first.emit(IO_EVTS.PAIR_COMPLETE);
    second.emit(IO_EVTS.PAIR_COMPLETE);

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
            var firstData = ['win', game.firstSelect, game.secondSelect,
                             "You won! You guessed your opponent's character correctly!"];
            first.emit(IO_EVTS.WIN_STATE, firstData);

            var secondData = ['lose', game.secondSelect, game.firstSelect,
                              "You lost! Your opponent guessed your character correctly!"];
            second.emit(IO_EVTS.WIN_STATE, secondData);
        } else {
            var firstData = ['lose', game.firstSelect, game.secondSelect,
                             "You lost! You guessed your opponent's character incorrectly as " + data + "!"];
            first.emit(IO_EVTS.WIN_STATE, firstData);
            var secondData = ['win', game.secondSelect, game.firstSelect,
                              "You won! Your opponent guessed your character incorrectly as " + data + "!"];
            second.emit(IO_EVTS.WIN_STATE, secondData);
        }
    });
    second.on(IO_EVTS.GUESS, function(data) {
        if (gameState != "ask" && gameState != "wait1") { return; }
        if (!isString(data)) { return; }
        console.log(data + ' ' + game.firstSelect);
        gameState = "end";
        if (data == game.firstSelect) {
            var secondData = ['win', game.secondSelect, game.firstSelect,
                             "You won! You guessed your opponent's character correctly!"];
            second.emit(IO_EVTS.WIN_STATE, secondData);//you guessed correctly

            var firstData = ['lose', game.firstSelect, game.secondSelect,
                              "You lost! Your opponent guessed your character correctly!"];
            first.emit(IO_EVTS.WIN_STATE, firstData);//opponent guessed correctly
        } else {
            var secondData = ['lose', game.secondSelect, game.firstSelect,
                             "You lost! You guessed your opponent's character incorrectly as " + data + "!"];
            second.emit(IO_EVTS.WIN_STATE, secondData);//you guessed correctly

            var firstData = ['win', game.firstSelect, game.secondSelect,
                              "You won! Your opponent guessed your character incorrectly as " + data + "!"];
            first.emit(IO_EVTS.WIN_STATE, firstData);//opponent guessed correctly
        }
    });
    first.on(IO_EVTS.SELECT, function(data) {
        if (gameState != "select") { return; }
        if (!isString(data)) { return; }
        if (!names.includes(data)) { return; }
        game.firstSelect = data;
        if (game.secondSelect) {
            gameState = "ask";
            first.emit(IO_EVTS.SELECT_COMPLETE);
            second.emit(IO_EVTS.SELECT_COMPLETE);
        }
    });
    second.on(IO_EVTS.SELECT, function(data) {
        if (gameState != "select") { return; }
        if (!isString(data)) { return; }
        if (!names.includes(data)) { return; }
        game.secondSelect = data;
        if (game.firstSelect) {
            gameState = "ask";
            first.emit(IO_EVTS.SELECT_COMPLETE);
            second.emit(IO_EVTS.SELECT_COMPLETE);
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
        if(secondR && !firstR){
            //rematch
        }
        else if(!secondR){
            if(firstR){
                second.emit(IO_EVTS.REMATCH,"cancel");
            }else{
                second.emit(IO_EVTS.REMATCH,"request");
            }
            firstR = !firstR;
        }
    });
    second.on(IO_EVTS.REMATCH, function(data) {
        if(firstR && !secondR){
            //rematch
        }
        else if(!firstR){
            if(secondR){
                first.emit(IO_EVTS.REMATCH,"cancel");
            }else{
                first.emit(IO_EVTS.REMATCH,"request");
            }
            secondR = !secondR;
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