const { Socket } = require("dgram");
const Express = require("express");
const { isObject } = require("util");
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);



var sockets = [];
// var players = {};


var message = "";

var users = [];
let user = {};
var mafia = {};




Socketio.on("connection", socket => {
  sockets.push(socket);

  //User
  socket.on("add-user", name => {
    addUser(name, socket);
    Socketio.emit('user-connected', name);
    //will this give players wrong cards if they sign in simultaenously?
    Socketio.to(socket.id).emit('user-info', users[users.length - 1]);
    Socketio.emit('users', users);
    socket.emit('message', "hello");
  });

  //Pregame
  socket.on("startgame", () => {
    console.log('startedgame', socket.id);
    Socketio.emit('pregame');
    mafia = users[Math.floor(Math.random() * users.length)];
  });

  socket.on("pregame-loaded", (userName) => {
    console.log("this person loaded:", socket.id);
    console.log("mafia:", mafia);
  });
  // Socketio.emit("user-role", users);
  socket.on("get-card", (userName) => {
    socket.emit("get-card", "CARD HERE");
    var userRole = users.find(x => x.name === userName);
    console.log(userRole);
    socket.emit("user-role", userRole);
    console.log(socket.id);
  });
});



// socket.on("message", data => {
//   switch (data) {
//     case "night":
//       message = "Go to sleep";
//       Socketio.emit("message", message);
//       break;
//     case "day":
//       message = "Wake Up";
//       Socketio.emit("message", message);
//       break;
//   }
// });



Http.listen(3000, () => {
  console.log("Listening at :3000...");
});

function addUser(name, socket) {
  user["id"] = socket.id;
  user["name"] = name;
  user["role"] = "";
  user["life"] = true;
  users.push(JSON.parse(JSON.stringify(user)));
  console.log("NEW USER:", users);
}