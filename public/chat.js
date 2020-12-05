var socket = io.connect("http://localhost:4000");
var divVideoChatLobby = document.getElementById("video-chat-lobby");
var divVideoChat = document.getElementById("video-chat-room");
var joinButton = document.getElementById("join");
var userVideo = document.getElementById("user-video");
var peerVideo = document.getElementById("peer-video");
var roomInput = document.getElementById("roomName");
var isCaller;
var userStream;
var rtcPeerConnection;

var iceServers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.services.mozilla.com" },
  ],
};

joinButton.addEventListener("click", function () {
  if (roomInput.value == "") {
    alert("Please enter a room name");
  } else {
    socket.emit("join", roomInput.value);
  }
});

socket.on("created", function () {
  isCaller = true;
  navigator.getUserMedia(
    {
      audio: true,
      video: { width: 600, height: 600 },
    },
    function (stream) {
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
    },
    function () {
      alert("Couldn't Access User Media");
    }
  );
});

socket.on("joined", function () {
  isCaller = false;
  navigator.getUserMedia(
    {
      audio: true,
      video: { width: 600, height: 600 },
    },
    function (stream) {
      userStream = stream;
      divVideoChatLobby.style = "display:none";
      userVideo.srcObject = stream;
      userVideo.onloadedmetadata = function (e) {
        userVideo.play();
      };
      socket.emit("ready", roomInput.value);
    },
    function () {
      alert("Couldn't Access User Media");
    }
  );
});

socket.on("full", function () {
  alert("Can't Join, Room is Full");
});

socket.on("ready", function () {
  if (isCaller) {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.createOffer(
      function (sessionDescription) {
        console.log(sessionDescription);
        rtcPeerConnection.setLocalDescription(sessionDescription);
        socket.emit("offer", {
          sdp: sessionDescription,
          roomName: roomInput.value,
        });
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("candidate", function (event) {
  var candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  });
  rtcPeerConnection.addIceCandidate(candidate);
});

socket.on("offer", function (event) {
  console.log("Answer");

  if (!isCaller) {
    console.log("Answer");
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddStream;
    rtcPeerConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcPeerConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcPeerConnection.setRemoteDescription(
      new RTCSessionDescription(event.sdp)
    );
    rtcPeerConnection.createAnswer(
      function (sessionDescription) {
        rtcPeerConnection.setLocalDescription(sessionDescription);
        socket.emit("answer", {
          sdp: sessionDescription,
          roomName: roomInput.value,
        });
      },
      function (error) {
        console.log(error);
      }
    );
  }
});

socket.on("answer", function (event) {
  console.log("answer");
  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event.sdp));
});

// handler functions
function onIceCandidate(event) {
  if (event.candidate) {
    console.log("sending ice candidate");
    socket.emit("candidate", {
      type: "candidate",
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate,
      roomName: roomInput.value,
    });
  }
}
function onAddStream(event) {
  peerVideo.srcObject = event.streams[0];
  peerVideo.onloadedmetadata = function (e) {
    peerVideo.play();
  };
}
