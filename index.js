/*
TODO
*/

// imports
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var heapq = require('heapq');


// static files
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

// pair up clients
io.on('connection', function(socket) {
    if (queue.length) {
        var pair = queue.shift();
        var game = new Game(pair, socket);
        games.add(game);
    } else {
        queue.push(socket);
    }
});
app.use(express.static(__dirname + "/client"));
http.listen(process.env.PORT, process.env.IP);



// enums
var IO_EVTS = Object.freeze({
});

// variables
var queue = [];
var games = new Set();

function Game(first, second) {
    var game = this;
}
