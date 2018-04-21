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

var baseURL;
a = window.location.href;
var b = a.substr(a.lastIndexOf("."));
if (b.includes("/")) {
	baseURL = a.substr(0, a.lastIndexOf("/") + 1);
} else {
	baseURL = a + "/";
}

var numRemoved = 0;
var removed = [];
var socket;
var endText = "";
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
function chatM(){
  var el = $("#chat-input");
  var q = el.val();
  console.log("You chatted: " + q);
  el.val("");
  chatServer(q);
}
function rematch(){
  var a = $("#rematch").text();
  if(a == "Rematch"){
    $("#rematch").text("Cancel");
  } else {
    $("#rematch").text("Rematch");
  }
  rematchServer();
}
function findCardName(card) {
  return card.find(".card-img")[0].src.split("/").pop().split(".").shift();
}

function addDeleteListener() {
 $(".card-delete").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "hidden");
    curr.css("visibility", "hidden")

    var name = findCardName(curr);
    console.log("You Deleted: " + name);
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();
    numRemoved++;
    removed.push(name);
    if(numRemoved == 24){
      alert("Why would you remove all of them =.=");
    }
    removeServer(name);
    document.getElementById("to-ask").focus();
  });
}

function addChooseListener() {
  $(".card-choose").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "hidden");
    var el = curr.find(".card-img");
    var name = findCardName(curr);
    console.log("You Chose: " + name);
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();
    var cards = $(".card");
    for (var i = 0; i < 24; i++) {
      var curr = $(cards[i]);
      var currName = findCardName(curr);
      if (removed.indexOf(currName) < 0) {
        if (currName != name) {
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

function setupCardGUI() {
  $(".card").append(cardInsides);

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

  $(".remove-button").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "visible");
  });
  
  $(".guess-button").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) { curr = curr.parent(); }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "visible");
    // curr.find(".guess-button");  TODO :hover isn't activated on guess
  });
}

function setupCardSelectGUI(){
  $(".card-select").each(function(index, el) {
    $(el).click(function(event) {
      $("#select").css("visibility", "hidden");
      $("#selecting").css("visibility", "visible");
      var currName = findCardName($(el));
      console.log("You Picked: " + currName);
      $(".main-card").find(".card-img").attr('src',"./client/pics/" + currName + ".png");
      selectServer(currName);
      document.getElementById("to-ask").focus();
    });
  });
}

function startCards() {
  setupCardGUI();
  addDeleteListener();
  addChooseListener();
  setupCardSelectGUI();
}

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

// $(window).on("load", handler)
$(document).ready(function() {
  $("#ask-button").click(askQ);
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
  startCards();
  startSideBar();
});

$(window).on("load", function() {
  console.log("hiding loadscreen");
  initIO();
  $("#loading").css("visibility", "hidden");
});

var GAME_STATE = Object.freeze({
  PAIR: 'pair',
  START : 'start',
  PLAY : 'play',
  OVER_TIE : 'tie',
  OVER_LOST : 'lost',
  OVER_WON : 'won'
});

function initIO() {
    socket = io();

    var match = window.location.href.replace(baseURL, "");
    socket.emit(IO_EVTS.PAIR, match);

    socket.on(IO_EVTS.ASK, function(data) {
      $("#asked-text").text(data);
      $("#ask-yes").css("visibility", "visible");
      $("#ask-no").css("visibility", "visible");
    });
    
    socket.on(IO_EVTS.ANSWER, function(data) {
      console.log(data);
      $("#answered-text").text(data);
      $("#answered-back").prop('disabled', false);
      $("#answered-back").css("visibility", "visible");

    });

    socket.on(IO_EVTS.REMOVE, function(data) {
      var index = names.indexOf(data);
      var miniCard = $($(".mini-card")[index]);
      miniCard.css("visibility", "hidden");
    });

    socket.on(IO_EVTS.WIN_STATE, function(data) {
      console.log(data);
      // winpage visible
      $("#winpage").css("visibility", "visible");
      $("#winmodal").css("visibility", "visible");
      // reveal cards image
      var own = $($($(".reveal-card")[0]).find(".card-img"))[0];
      var other = $($($(".reveal-card")[1]).find(".card-img"))[0];
      $(own).attr("src", "./client/pics/" + data[1] + ".png");
      $(other).attr("src", "./client/pics/" + data[2] + ".png");
      // reveal cards text
      var ownText = $($($(".reveal-card")[0]).find("p"))[0];
      var otherText = $($($(".reveal-card")[1]).find("p"))[0];
      $(ownText).text("You chose " + data[1]);
      $(otherText).text("Opponent chose " + data[2]);
      $("#game-over-text").text(data[3]);
      endText = data[3];
    });
    socket.on(IO_EVTS.CHAT, function(data) {
      var chatbox = document.getElementById("chat-contents");
      var element = document.createElement("div");
      element.appendChild(document.createTextNode(data));
      element.id = "chat-message";
      chatbox.appendChild(element);
    });
    socket.on(IO_EVTS.PAIR_COMPLETE, function() {
      $("#waiting").css("visibility", "hidden");
      $("#select").css("visibility", "visible");
    });
    socket.on(IO_EVTS.SELECT_COMPLETE, function() {
      $("#selecting").css("visibility", "hidden");
    });
    socket.on(IO_EVTS.REMATCH, function(data) {
      console.log("rematch thing");
      if(data == "request"){
        $("#game-over-text").text(endText + " Your friend is requesting a rematch!");
      } else {
        $("#game-over-text").text(endText + " Request has been cancelled.");
      }
    });
}
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

function removeServer(whomst) {
  socket.emit(IO_EVTS.REMOVE, whomst);
}

function guessServer(whomst) {
  socket.emit(IO_EVTS.GUESS, whomst);
}

function selectServer(whomst) {
  socket.emit(IO_EVTS.SELECT, whomst);
}

function askServer(what) {
  socket.emit(IO_EVTS.ASK, what);
}

function answerServer(which) {
  socket.emit(IO_EVTS.ANSWER, which);
}

function chatServer(what) {
  if(what.length > 0)
    socket.emit(IO_EVTS.CHAT, what);
}
function rematchServer(){
  socket.emit(IO_EVTS.REMATCH,'');
}