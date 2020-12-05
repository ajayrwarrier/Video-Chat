const express = require("express");
const socket = require("socket.io");
const app = express();

var server = app.listen(4000, function () {
  console.log("Server is running");
});

app.use(express.static("public"));

var io = socket(server);

io.on("connection", function (socket) {
  console.log("User Connected :" + socket.id);

  socket.on("join", function (roomName) {
    var rooms = io.sockets.adapter.rooms;
    var room = rooms.get(roomName);

    if (room == undefined) {
      socket.join(roomName);
      socket.emit("created");
    } else if (room.size == 1) {
      socket.join(roomName);
      socket.emit("joined");
    } else {
      socket.emit("full");
    }
    console.log(rooms);
  });

  socket.on("ready", function (roomName) {
    socket.broadcast.to(roomName).emit("ready");
  });

  socket.on("candidate", function (event) {
    console.log("Candidate");
    socket.broadcast.to(event.roomName).emit("candidate", event);
  });

  socket.on("offer", function (event) {
    console.log("Offer");
    socket.broadcast.to(event.roomName).emit("offer", event);
  });

  socket.on("answer", function (event) {
    console.log("Answer");
    socket.broadcast.to(event.roomName).emit("answer", event);
  });
});
