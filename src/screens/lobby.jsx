import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");

  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { room, users } = data;
      navigate(`/room/${room}`, { state: { users } });
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <main className="lobby-page">
      <section className="lobby-card">
        <p className="eyebrow">Private video room</p>
        <h1>Meet face to face.</h1>
        <p className="lobby-copy">Enter your details to join a quiet, focused call with your team.</p>
        <form className="join-form" onSubmit={handleSubmitForm}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="room">Room number</label>
            <input
              type="text"
              id="room"
              placeholder="e.g. 2048"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              required
            />
          </div>
          <button className="primary-button" type="submit">Join room</button>
        </form>
      </section>
    </main>
  );
};

export default LobbyScreen;