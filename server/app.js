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

  //USER ADD
  socket.on("add-user", name => {
    addUser(name, socket);
    Socketio.emit('user-connected', name);
    //will this give players wrong cards if they sign in simultaenously?
    Socketio.to(socket.id).emit('user-info', users[users.length - 1]);
    Socketio.emit('users', users);
    socket.emit('message', `Welcome ${name}!`);
  });

  //PREGAME
  socket.on("startgame", () => {
    console.log('startedgame', socket.id);
    Socketio.emit('pregame');
    users[Math.floor(Math.random() * users.length)]["role"] = "MAFIA";
  });

  socket.on("pregame-loaded", () => {
    console.log("this person loaded:", socket.id);
  });
  socket.on("get-card", (userName) => {
    var userRole = users.find(x => x.name === userName);
    console.log(userRole);
    socket.emit("user-role", userRole);
  });

  //DAY/NIGHT CYCLE
  socket.on("message", data => {
    switch (data) {
      case "night":
        message = "Go to sleep";
        Socketio.emit("night-time", message);
        break;
      case "day":
        message = "Wake Up";
        Socketio.emit("day-time", message);
        break;
    }
  });

  //ROUND 
  socket.on("round", data => {
    switch (data) {
      case "mafia":
        console.log("got mafia");
        socket.emit("prompt", "The Mafia choose your target");
        socket.emit("action", "mafiaAction");
        socket.emit("users", users);
        break;
    }
  });

  //MAFIA KILL EVENT
  socket.on("kill", name => {
    users.find(x => x.name === name).life = false;
    var victim = users.find(x => x.name === name);
    message = "Wake Up";
    Socketio.emit("day-time", message);
    Socketio.emit("death-announce", victim);
    console.log(victim);
    Socketio.emit("update-users", users);
  });
});





Http.listen(3000, () => {
  console.log("Listening at :3000...");
});

function addUser(name, socket) {
  user["id"] = socket.id;
  user["name"] = name;
  user["role"] = "Civilian";
  user["life"] = true;
  users.push(JSON.parse(JSON.stringify(user)));
  console.log("NEW USER:", users);
}