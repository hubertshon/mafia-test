const { Socket } = require("dgram");
const Express = require("express");
const Http = require("http").Server(Express);
const Socketio = require("socket.io")(Http);

var position = {
  x: 200,
  y: 200
};

var message = "";

Socketio.on("connection", socket => {
  socket.emit("position", position);
  socket.on("move", data => {
    switch (data) {
      case "left":
        position.x -= 5;
        Socketio.emit("position", position);
        break;
      case "right":
        position.x += 5;
        Socketio.emit("position", position);
        break;
      case "up":
        position.y -= 5;
        Socketio.emit("position", position);
        break;
      case "down":
        position.y += 5;
        Socketio.emit("position", position);
        break;
    }
  });
  socket.on("message", data => {
    switch (data) {
      case "night":
        message = "Go to sleep";
        Socketio.emit("message", message);
        break;
      case "day":
        message = "Wake Up";
        Socketio.emit("message", message);
        break;
    }
  });
});

Http.listen(3000, () => {
  console.log("Listening at :3000...");
});
