var cardInsides =
`
<div class="card-option-holder option-div">
  <button class="card-option fancy-button remove-button">Remove</button>
  <button class="card-option fancy-button guess-button">Guess</button>
</div>
<div class="card-option-holder guess-div">
  <button class="card-option fancy-button card-confirm">Guess?</button>
  <button class="card-option fancy-button">Guess</button>
</div>
<div class="card-option-holder remove-div">
  <button class="card-option fancy-button card-confirm">Remove?</button>
  <button class="card-option fancy-button">Remove</button>
</div>
`;

$(document).ready(function() {
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

  $("#help-back").click(function() {
    $("#help").css("visibility", "hidden");
  });

  $("#help-button").click(function() {
    $("#help").css("visibility", "visible");
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