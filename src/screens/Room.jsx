import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import { useLocation } from "react-router-dom";
import peer from "../service/peer";

const RoomPage = () => {
  const socket = useSocket();
  const { state } = useLocation();
  const [remoteSocketId, setRemoteSocketId] = useState(
    state?.users?.[0]?.id || null
  );
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  useEffect(() => {
    const getMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        });
        setMyStream(stream);
      } catch (err) {
        console.error("Error accessing camera:", err);
        alert("Camera/Microphone not available. Close other tabs using the camera.");
      }
    };
    getMedia();
  }, []);


  const sendStreams = useCallback((stream = myStream) => {
    if (!stream) return;
    for (const track of stream.getTracks()) {
      const alreadySending = peer.peer
        .getSenders()
        .some((sender) => sender.track === track);

      if (!alreadySending) {
        peer.peer.addTrack(track, stream);
      }
    }
  }, [myStream]);


  useEffect(() => {
    peer.peer.ontrack = (event) => {
      console.log("Got Remote Stream");
      setRemoteStream(event.streams[0]);
    };
  }, []);


  useEffect(() => {
    peer.peer.onicecandidate = (event) => {
      if (event.candidate && remoteSocketId) {
        socket.emit("peer:ice-candidate", {
          to: remoteSocketId,
          candidate: event.candidate,
        });
      }
    };
  }, [remoteSocketId, socket]);

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log("User joined:", email);
    setRemoteSocketId(id);
  }, []);

  
  const handleCallUser = useCallback(async () => {
    if (!remoteSocketId || !myStream) return;

    console.log("Calling user...");
    sendStreams();

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [remoteSocketId, myStream, socket, sendStreams]);


  const handleIncomingCall = useCallback(
    async ({ from, offer }) => {
      console.log("Incoming call");
      setRemoteSocketId(from);

      const stream = myStream || (await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      }));
      setMyStream(stream);
      sendStreams(stream);

      const answer = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans: answer });
    },
    [myStream, socket, sendStreams]
  );

  const handleCallAccepted = useCallback(async ({ ans }) => {
    console.log("Call Accepted!");
    await peer.setRemoteDescription(ans);
  }, []);

  const handleIceCandidate = useCallback(async ({ candidate }) => {
    try {
      if (candidate) {
        await peer.peer.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error("Error adding ICE candidate:", err);
    }
  }, []);


  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incoming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:ice-candidate", handleIceCandidate);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incoming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:ice-candidate", handleIceCandidate);
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleIceCandidate]);

  return (
    <main className="room-page">
      <div className="room-shell">
        <header className="room-header">
          <div>
            <p className="eyebrow">Live room</p>
            <h1>Room Page</h1>
            <p className="room-subtitle">Your private conversation space.</p>
          </div>
          <p className={`connection-status${remoteSocketId ? "" : " offline"}`}>
            {remoteSocketId ? "Connected" : "Waiting for someone"}
          </p>
        </header>

        {remoteSocketId && (
          <div className="room-actions">
            <button className="call-button" onClick={handleCallUser}>
              Start call
            </button>
          </div>
        )}

        <div className="video-grid">
        {myStream && (
          <section className="video-card">
            <h3>My Stream</h3>
            <video
              playsInline
              muted
              autoPlay
              ref={(video) => {
                if (video) video.srcObject = myStream;
              }}
            />
          </section>
        )}

        {remoteStream && (
          <section className="video-card">
            <h3>Remote Stream</h3>
            <video
              playsInline
              autoPlay
              ref={(video) => {
                if (video) video.srcObject = remoteStream;
              }}
            />
          </section>
        )}
        </div>
      </div>
    </main>
  );
};

export default RoomPage;