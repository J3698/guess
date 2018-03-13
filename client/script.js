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

var numRemoved = 0;
var removed = [];

function ask_q(){
  var el = document.getElementsByName("to-ask")[0];
  var q = el.value;
  $("#asked-text").text(q);
  $("#asked").css("visibility", "visible");
  console.log("You Asked: " + q);
  el.value = "";
}

function startCards() {
  $(".card").append(cardInsides);

  $(".card").each(function(index, el) {
    el.click(function(event) {
      console.log('...');
      el.addClass('pushed-down');
    });
  });

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
    while (!curr.hasClass("card")) {
      curr = curr.parent();
    }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "visible");
  });

  $(".guess-button").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) {
      curr = curr.parent();
    }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "visible");
    // curr.find(".guess-button");  TODO :hover isn't activated on guess
  });
 $(".card-delete").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) {
      curr = curr.parent();
    }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".remove-div").css("visibility", "hidden");
    var el = curr.find(".card-img");
    var name = el[0].src.substring(43);
    console.log("You Deleted: " + name);
    el.attr('src', './pics/black.png');
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();
    numRemoved++;
    removed.push(el[0].src);
    if(numRemoved == 24){
      alert("Why would you remove all of them =.=");
    }
  });
  $(".card-choose").click(function(event) {
    var curr = $(this);
    while (!curr.hasClass("card")) {
      curr = curr.parent();
    }
    curr.find(".option-div").css("visibility", "hidden");
    curr.find(".guess-div").css("visibility", "hidden");
    var el = curr.find(".card-img");
    var name = el[0].src;
    console.log("You Chose: " + name.substring(43));
    curr.find(".option-div").remove();
    curr.find(".remove-div").remove();
    curr.find(".guess-div").remove();
    var cards = $(".card");
    for(var i = 0; i < 24; i++){
      var curr = $(cards[i]);
      var currName = curr.find(".card-img")[0].src;
      if(removed.indexOf(currName) < 0){
        if(currName != name){
          curr.find(".card-img").attr('src', './pics/black.png');
          curr.find(".option-div").remove();
          curr.find(".remove-div").remove();
          curr.find(".guess-div").remove();
          numRemoved++;
          removed.push(currName);
        }
      }
    }
  });
}

// $(window).on("load", handler)
$(document).ready(function() {
  console.log(window.location);
  var el = document.getElementById("ask-button");
  el.onclick = function(){ask_q()};
  $("#asked").css("visibility", "visible");
  startCards();

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
  });
  $("#ask-no").click(function() {
    $("#asked").css("visibility", "hidden");
  });
  initIO();
});

// enums
var IO_EVTS = Object.freeze({
});
var GAME_STATE = Object.freeze({
    START : 'start',
    PLAY : 'play',
    OVER_TIE : 'tie',
    OVER_LOST : 'lost',
    OVER_WON : 'won'
});

// game start
var state = GAME_STATE.PLAY;


function initIO() {
    socket = io();
    // socket.on(IO_EVTS.STATE, function(data) {));
    // socket.emit(IO_EVTS.KEY_DN, action);
};