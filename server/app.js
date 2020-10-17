const { Socket } = require("dgram");
const Express = require("express");
const { isObject } = require("util");
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);



var sockets = [];

var time = "";

var users = [];
let user = {};
// var mafia = {};



const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

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
    shuffleArray(users);
    users[0]["role"] = "MAFIA";
    // users[Math.floor(Math.random() * users.length)]["role"] = "MAFIA";
    console.log("mafia chosen:", users);
  });

  socket.on("pregame-loaded", () => {
    console.log("this person loaded:", socket.id);
  });
  socket.on("get-card", (userName) => {
    var userCard = users.find(x => x.name === userName);
    console.log(userCard);
    socket.emit("user-card", userCard);
  });

  //DAY/NIGHT CYCLE
  socket.on("time", message => {
    Socketio.emit("update-users", users);
    switch (message) {
      case 'night':
        message = "Night Time";
        Socketio.emit("night-time", message);
        break;
      case 'day':
        message = "Day Time";
        Socketio.emit("day-time", message);
        break;
    }
  });

  //ROUND 
  socket.on("round", data => {
    switch (data) {
      case "mafia":
        socket.emit("prompt", "Mafia, choose your target");
        socket.emit("action", "actionMafia");
        socket.emit("update-users", users);
        break;
      case "civilian":
        console.log("civilian round start");
        Socketio.emit("prompt", "Civilians choose who to exile.");
        Socketio.emit("action", "civAction");
        Socketio.emit("update-users", users);
        break;
    }
  });

  //MAFIA KILL EVENT
  socket.on("kill", name => {
    users.find(x => x.name === name).life = false;
    var victim = users.find(x => x.name === name);
    Socketio.emit("death-announce", victim);
    console.log("victim:", victim);
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

/* Randomize array in-place using Durstenfeld shuffle algorithm */
function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}