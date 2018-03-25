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
var baseURL = "https://guess-j3698.c9users.io/"

var numRemoved = 0;
var removed = [];
var socket;

function askQ() {
  var el = $("#to-ask");
  var q = el.val();
  $("#asked-text").text("Waiting for the other player to ask their question...");
  $("#answered-text").text("Waiting for the other player to answer your question...");
  $("#asked").css("visibility", "visible");
  console.log("You Asked: " + q);
  el.val("");
  askServer(q);
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
    removeServer(name)
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
      var currName = findCardName($(el));
      console.log("You Picked: " + currName);
      $(".main-card").find(".card-img").attr('src',"./client/pics/" + currName + ".png");
      selectServer(currName);
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
    answerServer('yes');
    $("#answered").css("visibility", "visible");
  });
  $("#ask-no").click(function() {
    $("#asked").css("visibility", "hidden");
    answerServer('no');
    $("#answered").css("visibility", "visible");
  });
  $("#answered-back").click(function() {
    $("#answered").css("visibility", "hidden");
    $("#answered-back").prop('disabled', true);
  });
}

// $(window).on("load", handler)
$(document).ready(function() {
  $("#ask-button").click(askQ);
  $("#select").css("visibility", "visible");
  startCards();
  startSideBar()
  initIO();
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
    });
    
    socket.on(IO_EVTS.ANSWER, function(data) {
      console.log(data);
      $("#answered-text").text(data);
      $("#answered-back").prop('disabled', false);
    });

    socket.on(IO_EVTS.REMOVE, function(data) {
      var index = names.indexOf(data);
      var miniCard = $($(".mini-card")[index]);
      miniCard.css("visibility", "hidden");
    });

    socket.on(IO_EVTS.WIN_STATE, function(data) {
      console.log(data);
      
      $("#winpage").css("visibility", "visible");
      alert(data);
      //change later
    });
};

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
