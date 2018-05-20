/* globals stop warnings in c9.io, as certain 
   variables are declared in other files */
/* global $ */
/* global io */
/* global startFireworks */

/* html that will be injected into the page - 
   would be better suited in a different file */
var cardInsides =
`
<div class="card-option-holder option-div">
  <button class="card-option fancy-button remove-button">Remove</button>
  <button class="card-option fancy-button guess-button">Guess</button>
</div>
<div class="card-option-holder guess-div">
  <button class="card-option fancy-button card-confirm">Guess?</button>
  <button class="card-option fancy-button card-choose">Guess</button>
</div>
<div class="card-option-holder remove-div">
  <button class="card-option fancy-button card-confirm">Remove?</button>
  <button class="card-option fancy-button card-delete">Remove</button>
</div>
`;
var names = ["aang", "katara", "sokka", "toph", "zuko", "iroh", "azula",
             "appa", "momo", "admiral-zhao", "suki", "king-bumi",
             "princess-yue", "jet", "mai", "ty-lee", "ozai", "roku",
             "cabbage-man", "aunt-wu", "master-pakku", "jeong-jeong",
             "combustion-man", "joo-dee"];

/* number of characters in the game */
var numCharacters = 24;

/*
how often to ping the server (in ms)

This number needs to be matched by
the server.
*/
var pingDelay = 500;

/* track characters removed by client*/
var numRemoved = 0;
var removed = [];

/* socket to communicate with server */
var socket;

/*
summary text displayed on game over,
will not be neccessary when rematch
text has its own line
*/
var endText = "";

/*
Gets url base from current url.

Necessary for pairing clients to a game.s

Let window.location.href be:  https://avatarguess.com/game/
Base URL will be:             https://avatarguess.com/game/
Let window.location.href be:  http://avatarguess.com/game
Base URL will be:             http://avatarguess.com/game/
Let window.location.href be:  www.avatarguess.com/game/mygame
Base URL will be:             www.avatarguess.com/game/
*/
var baseURL;
var a = window.location.href;
var b = a.substr(a.lastIndexOf("/game") + 1);
if (b.includes("/")) {
  var offset = "/game".length;
	baseURL = a.substr(0, a.lastIndexOf("/game") + offset);
} else {
	baseURL = a;
}

/*
Asks the clients question.

Grabs and clears question from input,
prepares and shows waiting
screen for opponent's question, and
sends question to server
*/
function askQ() {
  var el = $("#to-ask");
  var q = el.val();
  $("#asked-text").text("Waiting for the other player to ask their question...");
  $("#answered-text").text("Waiting for the other player to answer your question...");
  $("#asked").css("visibility", "visible");
  $("#ask-yes").css("visibility", "hidden");
  $("#ask-no").css("visibility", "hidden");
  console.log("You Asked: " + q);
  el.val("");
  askServer(q);
}

/*
Sends a client message.

Grabs and clears message from input,
and sends message to chat.
*/
function chatM(){
  var el = $("#chat-input");
  var q = el.val();
  el.val("");
  chatServer(q);
}

/*
Requests a rematch.

Toggles button for rematch/cancel rematch,
and sends to .
*/
function rematch(){
  var a = $("#rematch").text();
  if(a == "Rematch"){
    $("#rematch").text("Cancel");
  } else {
    $("#rematch").text("Rematch");
  }
  rematchServer();
}

/*
Requests a new opponent.

Sends the player to a random game.
*/
function newOpponent() {
  window.location.href = baseURL;  
}

/*
Find the name of a character from a related
card.
*/
function findCardName(card) {
  return card.find(".card-img")[0].src.split("/").pop().split(".").shift();
}

/*
Add a delete listeneter to each card

When a card is deleted, the UI is
updated, and the server is notified.
*/
function addDeleteListener() {
 $(".card-delete").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    var name = findCardName(curr);
    console.log("You Deleted: " + name);

    // hide card options (this or the next block is probably extraneous)
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "hidden");
    curr.css("visibility", "hidden");

    // remove card options
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();

    // update local removal data
    numRemoved++;
    removed.push(name);

    // notify server
    removeServer(name);

    // focus question input
    document.getElementById("to-ask").focus();
  });
}

/*
Add a choose listeneter to each card

When a card is chosen, the UI is
updated, and the server is notified.
*/
function addChooseListener() {
  $(".card-choose").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    // selectName might be less ambiguous
    var name = findCardName(curr);
    console.log("You Chose: " + name);

    /*
    probably extraneous, as the game is about to end,
    end game ui should be handled elsewhere
    */
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "hidden");

    // extra extraneous
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();

    var cards = $(".card");
    for (var i = 0; i < numCharacters; i++) {
      // cards.each might be cleaner
      curr = $(cards[i]);
      var currName = findCardName(curr);
      // extraneous "if" if cards removed
      if (removed.indexOf(currName) < 0) {
        if (currName != name) {
          // this is good, perhaps just remove
          curr.find(".option-div").remove();
          curr.find(".remove-div").remove();
          curr.find(".guess-div").remove();
          curr.css("visibility", "hidden");
          numRemoved++;
          removed.push(currName);
        }
      }
    }
    guessServer(name);
  });
}

/*
Set up UI for cards.

Add options to cards sand events
to card options.
*/
function setupCardGUI() {
  // add options
  $(".card").append(cardInsides);

  // add mouseover functionality to cards
  $(".card").each(function(index, el) {
    $(el).mouseenter(function(event) {
      $(el).find(".option-div").css("visibility", "visible");
    });
    $(el).mouseleave(function(event) {
      $(el).find(".option-div").css("visibility", "hidden");
      $(el).find(".guess-div").css("visibility", "hidden");
      $(el).find(".remove-div").css("visibility", "hidden");
    });
  });

  // show removal confirmation
  $(".remove-button").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "visible");
  });

  // show guess confirmation
  $(".guess-button").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "visible");
  });
}

/*
Set up listeners for selecting a character
*/
function setupCardSelectGUI(){
  $(".card-select").each(function(index, el) {
    $(el).click(function(event) {
      $("#select").css("visibility", "hidden");
      $("#selecting").css("visibility", "visible");

      // set main card image
      var name = findCardName($(el));
      $(".main-card").find(".card-img").attr('src',"/client/pics/" + name + ".png");

      console.log("You Picked: " + name);

      // focus on question input
      document.getElementById("to-ask").focus();

      selectServer(name);
    });
  });
}

/*
Set up everything to do with cards.

Perhaps extraneous level of indirection -
possily useful for organizing?
*/
function startCards() {
  setupCardGUI();
  addDeleteListener();
  addChooseListener();
  setupCardSelectGUI();
}

/*
Unclear - handles things that are not the
(nonexistent) sidebar.
*/
function startSideBar() {
  $("#help-back").click(function() {
    $("#help").css("visibility", "hidden");
  });
  $("#help-button").click(function() {
    $("#help").css("visibility", "visible");
  });
  
  $("#ask-button").click(function() {
    $("#asked").css("visibility", "visible");
  });
  $("#ask-yes").click(function() {
    $("#asked").css("visibility", "hidden");
    $("#ask-yes").css("visibility", "hidden");
    $("#ask-no").css("visibility", "hidden");
    answerServer('yes');
    $("#answered").css("visibility", "visible");
    $("#answered-back").css("visibility", "hidden");
  });
  $("#ask-no").click(function() {
    $("#asked").css("visibility", "hidden");
    $("#ask-yes").css("visibility", "hidden");
    $("#ask-no").css("visibility", "hidden");
    answerServer('no');
    $("#answered").css("visibility", "visible");
    $("#answered-back").css("visibility", "hidden");
  });
  $("#answered-back").click(function() {
    $("#answered").css("visibility", "hidden");
    $("#answered-back").css("visibility", "hidden");
    $("#answered-back").prop('disabled', true);
    document.getElementById("to-ask").focus();
  });
}

/*
Set up chat scrolling.

If the chat is at the bottom, scrolling is automatic,
otherwise it is not.

Perhaps sending a chat should scroll to bottom.
*/
function startChatScroller() {
  var chatbox = document.getElementById("chat-contents");

  // track whether chat is at bottom
  var atBottom = true;
  chatbox.onscroll = function scrollListener() {
      var height = chatbox.scrollHeight - chatbox.clientHeight;
      var scroll = chatbox.scrollTop / height; // [0, 1]
      if (scroll != 1 && !isNaN(scroll)) {
        atBottom = false;
      } else if (scroll == 1 || isNaN(scroll)) {
        atBottom = true;
      }
  };

  // auto scroll if chat is at bottom
  var scroller = new MutationObserver(function chatScroll() {
      var height = chatbox.scrollHeight - chatbox.clientHeight;
      if (atBottom) {
        chatbox.scrollBy(0, height - chatbox.scrollTop);
        console.log("s" + (height - chatbox.scrollTop));
      }
  });
  scroller.observe(chatbox, {childList: true});

  
}
// "main" method
$(document).ready(function() {
  $("#ask-button").click(askQ);
  
  var copyUrl = window.location.href;
  var urlEnd = copyUrl.slice(copyUrl.indexOf("/game"));
  if (urlEnd.replace(/\//g,"") != "game") {
    console.log("playing with friend");
    $("#waiting").html("Send a friend this URL:<br />" + copyUrl);
  }

  $("#waiting").css("visibility", "visible");
  $('#to-ask').keypress(function(e){
    if (e.keyCode==13) {
      $('#ask-button').click();
    }
  });
  $('#chat-input').keypress(function(e){
    if (e.keyCode == 13) {
      chatM();
    }
  });
  $("#rematch").click(rematch);
  $("#new-opponent").click(newOpponent);
  startCards();
  startSideBar();
  startChatScroller();

  // This used to be in window on load;
  // however that event fires before 
  // document ready when certain methods
  // are used to redirect pages. That
  // caused side effects.
  initIO();
  window.setInterval(dingServer, pingDelay);
});

/*
Handle loading screen.

Window on load fires once images have loaded.
*/
$(window).on("load", function() {
  console.log("hiding loadscreen");
  $("#loading").css("visibility", "hidden");
});

// connect to server
function initIO() {
    // set up socket.io
    socket = io();

    // send game url to server
    var match = window.location.href.replace(baseURL, "");
    if (match.startsWith("/")) {
      match = match.slice(1);
    }
    socket.emit(IO_EVTS.PAIR, match);

    // listen for question asked by opponent
    socket.on(IO_EVTS.ASK, function(data) {
      $("#asked-text").text(data);
      $("#ask-yes").css("visibility", "visible");
      $("#ask-no").css("visibility", "visible");
    });

    // listen for answer given by opponent
    socket.on(IO_EVTS.ANSWER, function(data) {
      console.log(data);
      $("#answered-text").text(data);
      $("#answered-back").prop('disabled', false);
      $("#answered-back").css("visibility", "visible");

    });

    // listen for characters removed by opponent
    socket.on(IO_EVTS.REMOVE, function(data) {
      var index = names.indexOf(data);
      var miniCard = $($(".mini-card")[index]);
      miniCard.css("visibility", "hidden");
    });

    // listen for game over
    socket.on(IO_EVTS.WIN_STATE, function(data) {
      console.log(data);

      // winpage visible
      $("#winpage").css("visibility", "visible");
      $("#winmodal").css("visibility", "visible");

      // reveal cards image
      var own = $($($(".reveal-card")[0]).find(".card-img"))[0];
      var other = $($($(".reveal-card")[1]).find(".card-img"))[0];
      $(own).attr("src", "/client/pics/" + data[1] + ".png");
      $(other).attr("src", "/client/pics/" + data[2] + ".png");

      // reveal cards text
      var ownText = $($($(".reveal-card")[0]).find("p"))[0];
      var otherText = $($($(".reveal-card")[1]).find("p"))[0];
      $(ownText).text("You chose " + data[1]);
      $(otherText).text("Opponent chose " + data[2]);
      $("#game-over-text").text(data[3]);
      endText = data[3];

      // only winners get fireworks
      if (data[0] == "win") {
        startFireworks();
      }
    });

    // listen for chat messages
    socket.on(IO_EVTS.CHAT, function(data) {
      var chatbox = document.getElementById("chat-contents");
      var element = document.createElement("div");
      element.appendChild(document.createTextNode(data));
      element.id = "chat-message";
      chatbox.appendChild(element);
    });

    // listen for opponent joined game
    socket.on(IO_EVTS.PAIR_COMPLETE, function() {
      console.log("pair complete");
      $("#waiting").css("visibility", "hidden");
      $("#select").css("visibility", "visible");
    });

    // listen for both players selected character
    socket.on(IO_EVTS.SELECT_COMPLETE, function() {
      $("#selecting").css("visibility", "hidden");
      $("#center").css("visibility", "visible");
    });

    // listen for opponent make/cancel rematch request
    socket.on(IO_EVTS.REMATCH, function(data) {
      console.log("rematch thing");
      if(data == "request"){
        $("#game-over-text").text(endText + " Your friend is requesting a rematch!");
      } else if (data == "cancel") {
        $("#game-over-text").text(endText + " Request has been cancelled.");
      } else{
        var a = window.location.href;
        a = a.substr(0,a.lastIndexOf('game'));
        console.log(a);
        window.location.href = a + "game/" + data; 
      }
    });

    // listen for opponent connectivity notifications
    socket.on(IO_EVTS.DING, function(data) {
      if (data == "opp_disconn") {
        $("#center").attr("notif-content", "Opponent Reconnecting...");
        $("#select").attr("notif-content", "Opponent Reconnecting...");
        $("#selecting").attr("notif-content", "Opponent Reconnecting...");
      } else if (data == "opp_left") {
        $("#select").attr("notif-content", "Opponent Left");
        $("#selecting").attr("notif-content", "Opponent Left");
      } else if (data == "opp_reconn") {
        $("#center").attr("notif-content", "");
        $("#select").attr("notif-content", "");
        $("#selecting").attr("notif-content", "");
      }
    });
}


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

// misnomer - notifies server of character removal
function removeServer(whomst) {
  socket.emit(IO_EVTS.REMOVE, whomst);
}

// notify server of character to guess
function guessServer(whomst) {
  socket.emit(IO_EVTS.GUESS, whomst);
}

// notify server of character to select
function selectServer(whomst) {
  socket.emit(IO_EVTS.SELECT, whomst);
}

// notify server of question to ask
function askServer(what) {
  socket.emit(IO_EVTS.ASK, what);
}

// notify server of question to opponent answer
function answerServer(which) {
  socket.emit(IO_EVTS.ANSWER, which);
}

// notify server of chat to send
function chatServer(what) {
  if(what.length > 0)
    socket.emit(IO_EVTS.CHAT, what);
}

// notify server of rematch request/cancel request
function rematchServer(){
  socket.emit(IO_EVTS.REMATCH,'');
}

// tell server connection exists
function dingServer(){
  socket.emit(IO_EVTS.DING,'');
}