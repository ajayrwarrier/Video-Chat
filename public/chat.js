let socket = io();
let divVideoChatLobby = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join");
let userVideo = document.getElementById("user-video");
let peerVideo = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let roomName;
let creator = false;
let rtcPeerConnection;
let userStream;

let divButtonGroup = document.getElementById("btn-group");
let muteButton = document.getElementById("muteButton");
let hideCameraButton = document.getElementById("hideCameraButton");
let leaveRoomButton = document.getElementById("leaveRoomButton");

let muteFlag = false;
let hideCameraFlag = false;

// Contains the stun server URL we will be using.
let iceServers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

joinButton.addEventListener("click", function () {
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    roomName = roomInput.value;
    socket.emit("join", roomName);
  }
});

muteButton.addEventListener("click", function () {
  muteFlag = !muteFlag;
  if (muteFlag) {
    userStream.getTracks()[0].enabled = false;
    muteButton.textContent = "Unmute";
  } else {
    userStream.getTracks()[0].enabled = true;
    muteButton.textContent = "Mute";
  }
});

hideCameraButton.addEventListener("click", function () {
  hideCameraFlag = !hideCameraFlag;
  if (hideCameraFlag) {
    userStream.getTracks()[1].enabled = false;
    hideCameraButton.textContent = "Show Camera";
  } else {
    userStream.getTracks()[1].enabled = true;
    hideCameraButton.textContent = "Hide Camera";
  }
});

leaveRoomButton.addEventListener("click", function () {
  socket.emit("leave", roomName); //Let's the server know that user has left the room.

  divVideoChatLobby.style = "display:block"; //Brings back the Lobby UI
  divButtonGroup.style = "display:none";

  if (userVideo.srcObject) {
    userVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of User.
    userVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of User
  }
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving the Video track of Peer.
  }

  //Checks if there is peer on the other side and safely closes the existing connection established with the peer.
  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

// Triggered when a room is succesfully created.

socket.on("created", function () {
  creator = true;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 500, height: 500 },
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      divButtonGroup.style = "display:flex";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is succesfully joined.

socket.on("joined", function () {
  creator = false;

  navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: { width: 500, height: 500 },
    })
    .then(function (stream) {
      /* use the stream */
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      divButtonGroup.style = "display:flex";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomName);
    })
    .catch(function (err) {
      /* handle the error */
      alert("Couldn't Access User Media");
    });
});

// Triggered when a room is full (meaning has 2 people).

socket.on("full", function () {
  alert("Room is Full, Can't Join");
});

// Triggered when a peer has joined the room and ready to communicate.

socket.on("ready", function () {
  if (creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);


    rtcPeerConnection
      .createOffer()
      .then((offer) => {
        rtcPeerConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomName);
      })

      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an ice candidate from the peer.

socket.on("candidate", function (candidate) {
  let icecandidate = new RTCIceCandidate(candidate);
  rtcPeerConnection.addIceCandidate(icecandidate);
});

// Triggered on receiving an offer from the person who created the room.

socket.on("offer", function (offer) {
  if (!creator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = OnIceCandidateFunction;
    rtcPeerConnection.ontrack = OnTrackFunction;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.setRemoteDescription(offer);

    rtcPeerConnection
      .createAnswer()
      .then((answer) => {
        rtcPeerConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomName);
      })
      .catch((error) => {
        console.log(error);
      });
  }
});

// Triggered on receiving an answer from the person who joined the room.

socket.on("answer", function (answer) {
  rtcPeerConnection.setRemoteDescription(answer);
});

// Triggered when the other peer in the room has left the room.

socket.on("leave", function () {
  creator = true; //This person is now the creator because they are the only person in the room.
  if (peerVideo.srcObject) {
    peerVideo.srcObject.getTracks()[0].stop(); //Stops receiving audio track of Peer.
    peerVideo.srcObject.getTracks()[1].stop(); //Stops receiving video track of Peer.
  }

  //Safely closes the existing connection established with the peer who left.

  if (rtcPeerConnection) {
    rtcPeerConnection.ontrack = null;
    rtcPeerConnection.onicecandidate = null;
    rtcPeerConnection.close();
    rtcPeerConnection = null;
  }
});

// Implementing the OnIceCandidateFunction which is part of the RTCPeerConnection Interface.

function OnIceCandidateFunction(event) {
  console.log("Candidate");
  if (event.candidate) {
    socket.emit("candidate", event.candidate, roomName);
  }
}

// Implementing the OnTrackFunction which is part of the RTCPeerConnection Interface.

function OnTrackFunction(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}
