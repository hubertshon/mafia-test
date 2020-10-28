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


const gameRooms = ["NYC", "LA", "VEGAS"];
const policeNumber = 1;

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};

Socketio.on("connection", socket => {
  sockets.push(socket);

  socket.on("join-room", room => {
    if (gameRooms.includes(room)) { //take this out, have a string generated client side
      socket.join(room);
      return socket.emit("success", `You have successfully joined ${room}!`);
    } else {
      return socket.emit("err", "No Room with the name" + room);
    }
  });

  //USER ADD
  socket.on("add-user", name => {
    console.log(socket.rooms);
    addUser(name, socket);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit('user-connected', name);
    //will this give players wrong cards if they sign in simultaenously?
    Socketio.to(lastRoom).emit('user-info', users[users.length - 1]);
    Socketio.to(lastRoom).emit('users', users);
    socket.emit('message', `Welcome ${name}!`);
  });

  //PREGAME
  socket.on("startgame", () => {
    console.log('startedgame', socket.id);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit('pregame', users.length);
    shuffleArray(users);
    users[0]["role"] = "MAFIA";
    users[1]["role"] = "POLICE";
    users[2]["role"] = "DOCTOR";
    // users[Math.floor(Math.random() * users.length)]["role"] = "MAFIA";
    console.log("mafia chosen:", users);

    voteSetup();
  });

  //Documenting Player status
  socket.on("pregame-loaded", () => {
    console.log("this person loaded:", socket.id);
  });

  socket.on("get-card", (data) => {
    console.log('received name', data.name);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var userCard = users.find(x => x.name === data.name);
    console.log(userCard);
    Socketio.to(lastRoom).emit('card-dealt');
    socket.emit("user-card", userCard);
  });

  //DAY/NIGHT CYCLE
  socket.on("time", message => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    console.log("NIGHT TIME:", socket.rooms);
    Socketio.to(lastRoom).emit("update-users", users);
    switch (message) {
      case 'night':
        message = "NIGHT TIME";
        Socketio.to(lastRoom).emit("night-time", message);
        break;
      case 'day':
        message = "DAY TIME";
        Socketio.to(lastRoom).emit("day-time", message);
        checkWinner(socket);
        break;
    }
  });

  //ROUND 
  socket.on("round", data => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    switch (data) {
      case "mafia":
        socket.emit("prompt", "Mafia, choose your target");
        socket.emit('action', 'actionMafia');
        socket.emit("update-users", users);
        break;
      case "police":
        socket.emit("prompt", "Police, investigate a suspect");
        socket.emit('action', 'actionPolice');
        break;
      case "doctor":
        socket.emit("prompt", "Doctor, save one person");
        socket.emit("action", "actionDoctor");
        break;
      case "citizen":
        console.log("citizen round start");
        Socketio.to(lastRoom).emit("prompt", "Everyone, vote who to exile");
        Socketio.to(lastRoom).emit("action", "civAction");
        Socketio.to(lastRoom).emit("update-users", users);
        break;
    }
  });

  //MAFIA KILL EVENT
  socket.on("kill", name => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    users.find(x => x.name === name).life = false;
    var victim = users.find(x => x.name === name);
    Socketio.to(lastRoom).emit("death-announce", victim);
    console.log("victim:", victim);

  });


  //POLICE CHECK EVENT 
  socket.on("search", name => {
    var deadpolice = 0;
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var suspect = users.find(x => x.name === name);
    if (name === "SkipVote") {
      deadpolice += 1;
      if (deadpolice === policeNumber) {
        Socketio.to(lastRoom).emit("prompt-search", `You're a ghost!`);
      }
    } else if (suspect.role === "MAFIA") {
      Socketio.to(lastRoom).emit("prompt-search", `${name} is guilty!`);
    } else {
      Socketio.to(lastRoom).emit("prompt-search", `${name} is innocent!`);
    }
  });

  //DOCTOR SAVE EVENT
  socket.on("save", data => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    if (data.name === "SkipVote") {
      console.log("skipvote");
      Socketio.to(lastRoom).emit("prompt-save", data.name);
    } else {
      users.find(x => x.name === data.name).life = true;
      console.log(data.victim);
      socket.emit("prompt", `You chose to save ${data.name}`);
      Socketio.to(lastRoom).emit("prompt-save", data.name);
    }
  });



  //CIVILIAN VOTE EVENT
  socket.on("readyToVote", (data) => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    if ((data.living / 2) < (data.readyVotes + 1)) {
      console.log("citizen round start");
      Socketio.to(lastRoom).emit("prompt", "Civilians vote who to exile.");
      Socketio.to(lastRoom).emit("action", "civAction");
      Socketio.to(lastRoom).emit("update-users", users);
    } else {
      console.log(data.userLength, data.readyVotes);
      Socketio.to(lastRoom).emit("addReady");
    }
  });


  socket.on("vote", name => {
    console.log('vote received');
    votes[name]++;
    console.log(votes);
  });

  socket.on("vote-skip", () => {
    console.log('vote received');
    votes["SkipVote"]++;
  });

  socket.on("vote-complete", (living) => {
    var exiled = Object.keys(votes).reduce((a, b) => votes[a] > votes[b] ? a : b);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    console.log(votes);
    console.log(exiled);
    if (exiled === "SkipVote") {
      Socketio.to(lastRoom).emit("vote-none", votes);
    } else if ((votes[exiled] / living) > 0.5) {
      Socketio.to(lastRoom).emit("exiled", exiled);
      users.find(x => x.name === exiled).life = false;
    } else {
      Socketio.to(lastRoom).emit("vote-none", votes);
    }

    Socketio.to(lastRoom).emit("update-users", users);
    checkWinner(socket);
    voteSetup();
  });


  //VICTORY CONDITIONS 

  function checkWinner(socket) {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var mafia = users.filter(x => x.role === 'MAFIA' && x.life === true);
    var citizens = users.filter(x => x.role !== 'MAFIA' && x.life === true);
    if (mafia.length === 0) {
      Socketio.to(lastRoom).emit("endgame", "citizens");
    } else if (mafia.length === citizens.length) {
      Socketio.to(lastRoom).emit("endgame", "mafia");
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

function voteSetup() {
  users.forEach(function (user) {
    votes[user.name] = 0;
    votes["SkipVote"] = 0;
  });
}

//USER ROLE DEALING WITH SETTING PARAMETERS
// var mafiaNumber = 1;
// var policeNumber = 1;
// var doctorNumber = 1;


// var roleNumber = mafiaNumber + policeNumber + doctorNumber;
// for (var i = 0; i < roleNumber; i++) {
//   if (i < mafiaNumber) {
//     users[i]["role"] = "MAFIA";
//   } else if (i < (mafiaNumber + policeNumber) && (i >= mafiaNumber)) {
//     users[i]["role"] = "POLICE";
//   } else if (i < (mafiaNumber + policeNumber + doctorNumber) && (i >= (mafiaNumber + policeNumber))) {
//     users[i]["role"] = "DOCTOR";
//   }
// }