const { Socket } = require("dgram");
const Express = require("express");
const { isObject } = require("util");
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);



var sockets = [];
var votes = {};
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
    users[1]["role"] = "POLICE";
    // users[Math.floor(Math.random() * users.length)]["role"] = "MAFIA";
    console.log("mafia chosen:", users);

    users.forEach(function (user) {
      votes[user.name] = 0;
      votes["skip"] = 0;
    });
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
      case "police":
        socket.emit("prompt", "Police, investigate a suspect");
        socket.emit("action", "actionPolice");
        break;
      case "citizen":
        console.log("citizen round start");
        Socketio.emit("prompt", "Civilians vote who to exile.");
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


  //POLICE CHECK EVENT 
  socket.on("check", name => {
    var suspect = users.find(x => x.name === name);
    if (suspect.role === "MAFIA") {
      socket.emit("prompt", "Mafia spotted!");
    } else {
      socket.emit("prompt", "Innocent.");
    }
  });



  //CIVILIAN VOTE EVENT
  socket.on("vote-begin", () => {
  });


  socket.on("vote", name => {
    console.log('vote received');
    votes[name]++;
    console.log(votes);
  });

  socket.on("vote-skip", () => {
    console.log('vote received');
    votes["skip"]++;
  });

  socket.on("vote-complete", () => {
    var exiled = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
    console.log(votes);
    console.log(exiled);
    Socketio.emit("vote-results", votes);
    Socketio.emit("exiled", exiled);
    users.find(x => x.name === exiled).life = false;
    Socketio.emit("update-users", users);
    checkWinner();
    votes = {};
  });


  //VICTORY CONDITIONS 

  function checkWinner() {

    var mafia = users.filter(x => x.role === 'MAFIA' && x.life === true);
    var citizens = users.filter(x => x.role !== 'MAFIA' && x.life === true);
    if (mafia.length === 0) {
      Socketio.emit("endgame", "citizens");
    } else if (mafia.length > citizens.length) {
      Socketio.emit("endgame", "mafia");
    }
    console.log("check");
  }

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