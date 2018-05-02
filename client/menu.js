/* global $ */
/* global io */
/* global startFireworks */

var baseURL;
var a = window.location.href;
var b = a.substr(a.lastIndexOf("."));
if (b.includes("/")) {
	baseURL = a.substr(0, a.lastIndexOf("/") + 1);
} else {
	baseURL = a + "/";
}
var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

$(document).ready(function() {
  $("#random").click(function playRandom() {
    window.location.href = baseURL + "game"
  });
  $("#friend").click(function playFriend() {
    var text = "";
    for (var i = 0; i < 10; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    console.log(text);
    window.location.href = baseURL + "game/" + text;
  });
});

/*
$(window).on("load", function() {
  console.log("hiding loadscreen");
  initIO();
  $("#loading").css("visibility", "hidden");
});
*/