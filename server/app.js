const { Socket } = require("dgram");
const Express = require("express");
const { isObject } = require("util");
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);



var users = {};
var settings = {};


const policeNumber = 1;


Socketio.on("connection", socket => {
  // sockets.push(socket);

  socket.on("host-game", options => {
    socket.join(options.room);
    users[options.room] = [];
    console.log(users);
    settings[options.room] = options.settings;
    socket.emit("success", options.room);
  });

  socket.on("join-room", room => {
    if (users[room] === undefined) {
      socket.emit("err", `${room} does not exist!`);
    } else {
      socket.join(room);
      socket.emit("success", room);
    }
  });

  //USER ADD
  socket.on("add-user", name => {
    console.log(socket.rooms);
    console.log(name);
    var userinfo = addUser(name, socket);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    users[lastRoom].push(userinfo);
    socket.emit('setup-user', userinfo);
    Socketio.to(lastRoom).emit('user-connected', { name: name, userList: users[lastRoom] });
    socket.emit('message', `Welcome ${name}!`);
    console.log('added', users);
  });

  socket.on("update-all", (playerInfo) => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit('update-player', playerInfo);
  });


  // PREGAME TEST
  socket.on("startgame", (options) => {
    console.log('startedgame', socket.id);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var mafia = options.settings.mafiaNum;
    var mafiaPolice = options.settings.mafiaNum + options.settings.policeNum;
    var mafiaPoliceDoc = options.settings.mafiaNum + options.settings.policeNum + options.settings.doctorNum;
    Socketio.to(lastRoom).emit('pregame', users[lastRoom].length);
    shuffleArray(users[lastRoom]);
    for (var i = 0; i < users[lastRoom].length; i++) {
      if (i < mafia) {
        users[lastRoom][i]["role"] = "MAFIA";
      } else if (i >= mafia && i < mafiaPolice) {
        users[lastRoom][i]["role"] = "POLICE";
      } else if (i >= mafiaPolice && i < mafiaPoliceDoc) {
        users[lastRoom][i]["role"] = "DOCTOR";
      }
    }

    shuffleArray(users[lastRoom]);
    console.log("mafia chosen:", users[lastRoom]);
    Socketio.to(lastRoom).emit("user-card", users[lastRoom]);
    Socketio.to(lastRoom).emit("settings", settings[lastRoom]);
    console.log("SETTINGS:", settings[lastRoom]);
  });




  //Documenting Player status
  socket.on("pregame-loaded", () => {
    console.log("this person loaded:", socket.id);
  });

  socket.on("get-card", (data) => {
    console.log('received name', data.name);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit('card-dealt');
  });

  //DAY/NIGHT CYCLE
  socket.on("time", message => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit("update-users", users[lastRoom]);
    switch (message) {
      case 'night':
        console.log("NIGHT TIME:", socket.rooms);
        message = "NIGHT TIME";
        Socketio.to(lastRoom).emit("night-time", message);
        console.log(users[lastRoom]);
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
        console.log("mafia round");
        socket.emit("prompt", "Mafia, choose your target");
        socket.emit('action', 'actionMafia');
        socket.emit("update-users", users[lastRoom]);
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
        Socketio.to(lastRoom).emit("update-users", users[lastRoom]);
        break;
    }
  });

  //MAFIA KILL EVENT
  socket.on("kill", name => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    users[lastRoom].find(x => x.name === name).life = false;
    var victim = users[lastRoom].find(x => x.name === name);
    Socketio.to(lastRoom).emit("death-announce", victim);
    console.log("victim:", victim);
  });


  //POLICE CHECK EVENT 
  socket.on("search", name => {
    var deadpolice = 0;
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var suspect = users[lastRoom].find(x => x.name === name);
    if (name === "SkipVote") {
      deadpolice += 1;
      // used to be policeNumber
      if (deadpolice === settings[lastRoom].policeNum) {
        Socketio.to(lastRoom).emit("prompt-search", `You're a ghost!`);
      }
    } else if (suspect.role === "MAFIA") {
      Socketio.to(lastRoom).emit("prompt-search", `${name} is guilty!`);
    } else {
      Socketio.to(lastRoom).emit("prompt-search", `${name} is innocent!`);
    }
  });


  socket.on("doctor-ready", () => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    Socketio.to(lastRoom).emit("begin-doctor");
  });

  //DOCTOR SAVE EVENT
  socket.on("save", data => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    if (data.name === "SkipVote") {
      console.log("skipvote");
      Socketio.to(lastRoom).emit("prompt-save", data.name);
    } else {
      users[lastRoom].find(x => x.name === data.name).life = true;
      console.log("Saved", data.victim);
      socket.emit("prompt", `You chose to save ${data.name}`);
      Socketio.to(lastRoom).emit("prompt-save", data.name);
    }
  });



  //CIVILIAN VOTE EVENT
  socket.on("readyToVote", (data) => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    if ((data.living / 2) < (data.readyVotes + 1)) {
      console.log("citizen round start");
      Socketio.to(lastRoom).emit("prompt", "Civilians vote who to exile");
      Socketio.to(lastRoom).emit("action", "civAction");
      Socketio.to(lastRoom).emit("update-users", users[lastRoom]);
    } else {
      console.log(data.userLength, data.readyVotes);
      Socketio.to(lastRoom).emit("addReady");
    }
  });


  socket.on("vote", info => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    console.log('vote received');
    // votes[name]++;
    // console.log(votes);
    Socketio.to(lastRoom).emit("voteCount", info);
  });

  socket.on("vote-skip", (info) => {
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    console.log('vote received');
    // votes["SkipVote"]++;
    Socketio.to(lastRoom).emit("voteCount", info);
  });

  socket.on("vote-complete", (info) => {
    var exiled = Object.keys(info.votes).reduce((a, b) => info.votes[a].length > info.votes[b].length ? a : b);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    console.log(info.votes);
    console.log(exiled);
    if (exiled === "SkipVote") {
      Socketio.to(lastRoom).emit("vote-none");
    } else if ((info.votes[exiled].length / info.living) > 0.5) {
      Socketio.to(lastRoom).emit("exiled", exiled);
      users[lastRoom].find(x => x.name === exiled).life = false;
    } else {
      Socketio.to(lastRoom).emit("vote-none");
    }

    Socketio.to(lastRoom).emit("update-users", users[lastRoom]);
    setTimeout(function () {
      checkWinner(socket);
    }, 4000);
  });

  // socket.on('disconnect', () => {
  //   var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
  // find users with that socket, remove the room 
  // remove the options
  // })


  //VICTORY CONDITIONS 

  function checkWinner(socket) {
    console.log("Check Winner", users[lastRoom]);
    var lastRoom = Object.keys(socket.rooms)[Object.keys(socket.rooms).length - 1];
    var mafia = users[lastRoom].filter(x => x.role === 'MAFIA' && x.life === true);
    var citizens = users[lastRoom].filter(x => x.role !== 'MAFIA' && x.life === true);
    if (mafia.length === 0) {
      Socketio.to(lastRoom).emit("endgame", "citizens");
      console.log("Citizens Win!");
    } else if (mafia.length === citizens.length) {
      Socketio.to(lastRoom).emit("endgame", "mafia");
      console.log("Mafia wins!");
    } else {
      Socketio.to(lastRoom).emit("endgame", "NONE");
      console.log("No Winner Yet");
    }
  }
});



Http.listen(3000, () => {
  console.log("Listening at :3000...");
});

// new add user method
function addUser(name, socket) {
  var user = {};
  user["id"] = socket.id;
  user["name"] = name;
  user["role"] = "Civilian";
  user["life"] = true;
  return user;
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



