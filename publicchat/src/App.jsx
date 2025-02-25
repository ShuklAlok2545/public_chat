import React, { useEffect, useMemo, useState } from "react";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import MicOffIcon from '@mui/icons-material/MicOff';
import MicIcon from '@mui/icons-material/Mic';
import SendIcon from '@mui/icons-material/Send';
import { io } from "socket.io-client";
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import "./App.css";

function ChatApp() {
  // State variables for chat functionality
  const [username, setUsername] = useState(""); // Stores the username input
  const [users, setUsers] = useState({}); // Stores the list of online users
  const [message, setMessage] = useState(""); // Stores the current message being typed
  const [messages, setMessages] = useState([]); // Stores all chat messages
  const [isUsernameSet, setIsUsernameSet] = useState(false); // Tracks if username is set
  const [usernameError, setUsernameError] = useState(""); // Stores username error messages
  const [currentUserId, setCurrentUserId] = useState(""); // Stores current user ID
  const [off, setof] = useState(true); // Tracks microphone status
  
  // Initialize socket connection
  const socket = useMemo(() => io("http://localhost:3000"), []);

  useEffect(() => {
    // Listen for username-taken error
    socket.on("username-taken", (message, id) => {
      setUsernameError(message);
      setCurrentUserId(id);
    });

    // Listen for updated users list
    socket.on("updateUsers", (userList) => {
      setUsers(userList);
    });

    // Listen for incoming messages
    socket.on("receive-message", ({ sender, message }) => {
      setMessages((prev) => [...prev, { sender, message }]);
    });

    return () => socket.disconnect(); // Cleanup on unmount
  }, []);

  // Handle setting username
  const handleSetUsername =async (e) => {
    e.preventDefault();
   
    try {
      const response = await fetch("http://localhost:3000/api/insert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: username }),
      });

      const result = await response.json();
      console.log("Response:", result);
    } catch (error) {
      console.error("Error inserting data:", error);
    }

    if (username.trim()) {
      socket.emit("set-username", username);
      setIsUsernameSet(true);
    }
  };

  // Handle deleting a message
  const handleDeleteMessage = (index) => {
    setMessages((prevMessages) => prevMessages.filter((_, i) => i !== index));
  };

  // Start speech recognition
  const start = () => { 
    if (off) {
      SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
      setof(false);
    }
  };

  // Speech recognition settings
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Sync speech transcript with message state
  useEffect(() => {
    setMessage(transcript);
  }, [transcript]);

  // Log messages when they change
  useEffect(() => {
    console.log(messages);
  }, [messages]);

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition.</span>;
  }

  // Handle sending a message
  const handleSendMessage = (e) => {
    e.preventDefault();

    setTimeout(() => {
      if (message.trim()) {
        socket.emit("message", message);
        setMessage("");
      }
    }, 50);
    console.log(transcript)
    if (!off) {
      SpeechRecognition.stopListening();
      setof(true);
    }
    
    setTimeout(() => {
      resetTranscript(); // Reset transcript after a short delay
    }, 50);
  };

  return (
    <div className="chat-container">
      <h1>Anybody Can Join Here...</h1>
      <h5>
        <span className="wrn">Warning: </span> 
        <i>
          Deleting messages on your side won't remove them from the other
          person's side. Be careful not to send any offensive or inappropriate
          messages.
        </i>
      </h5>
      <h3>Enjoy Your Chats 😊</h3>

      {!isUsernameSet ? (
        <form onSubmit={handleSetUsername} className="username-container">
          <input
            type="text"
            placeholder="Enter your username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button type="submit">Join Chat</button>
        </form>
      ) : (
        <>
          <div className="chat-box">
            {usernameError && (
              <p className="error-message">
                {usernameError} <a href="http://localhost:5173/">chat with new username</a>
              </p>
            )}
            {!usernameError && <p className="usname">{username}: joined public chat</p>}

            <div className="messages">
              {messages.map((msg, index) => (
                <p
                  key={`${index}+${currentUserId}`}
                  className={!msg.sender ? "client-message" : "server-message"}
                >
                  <strong>{msg.sender}:</strong> {msg.message}
                  <DeleteForeverIcon
                    className="delete-icon"
                    onClick={() => handleDeleteMessage(index)}
                  />
                </p>
              ))}
            </div>

            <form onSubmit={handleSendMessage}>
              <input
                type="text"
                value={message || transcript}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                required
              />
              <button className="sendmsg" type="submit"><SendIcon id="sndicn" fontSize="large" color="primary" /></button>
              <li className="mike" onClick={start}>
                <span>{listening ? (<MicIcon fontSize="large" color="primary" /> ) : (<MicOffIcon fontSize="large" color="primary" /> ) }</span>
              </li>
            </form>
          </div>

          <div className="user-list">
            <h2 className="ous">*Online Users</h2>
            <ol>
              {Object.entries(users).map(([userId, user], index) => (
                <li key={index}>
                  <strong>{user}</strong>
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </div>
  );
}

export default ChatApp;
