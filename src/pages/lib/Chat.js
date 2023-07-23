// Chat.js
import React, { useState, useEffect, useRef } from "react";
import { Orbitron } from "next/font/google";
import { isMobile } from "react-device-detect";
import { Analytics } from "@vercel/analytics/react";

const orbitron = Orbitron({ subsets: ["latin"] });

const STORAGE_KEY = "Div_agi";
const TALKING_HEAD_WIDTH = 192 * 1.2;

const appendToRecords = (role, message, record) => {
  const hasRecord = record !== undefined;
  let storage = getRecords();
  let records = storage.records || [];
  records = records.concat({ role, content: hasRecord ? record : message });
  let messages = storage.messages || [];
  messages = messages.concat({
    sender: role === "user" ? "user" : "ai",
    text: message,
  });
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ records, messages })
  );
};

const overwriteLastRecord = (role, message, record) => {
  const hasRecord = record !== undefined;
  let storage = getRecords();
  let records = storage.records || [];
  records = records
    .slice(0, -1)
    .concat({ role, content: hasRecord ? record : message });
  let messages = storage.messages || [];
  messages = messages
    .slice(0, -1)
    .concat({ sender: role === "user" ? "user" : "ai", text: message });
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ records, messages })
  );
};

const getRecords = () => {
  return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
};

const getMessages = () => {
  return getRecords().messages || [];
};

/*
Div's thoughts are read as a ReadableStream from the OAI endpoint. The stream is then parsed as the thoughts
come in to remove latency.
 */
const getDivResponse = async ({
  newUserMessage,
  setMessages,
  setAiThoughts,
}) => {
  if (newUserMessage) {
    appendToRecords("user", newUserMessage);
  }
  const response = await fetch(`/api/langchain`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: getRecords().records || [],
    }),
  });

  console.log(response);
  const data = response.body;
  if (!data) {
    return;
  }
  const reader = data.getReader();
  const decoder = new TextDecoder();
  let done = false;
  let parsedChunk = "";
  let wholeChunk = "";
  const hasMessage = newUserMessage !== undefined;
  if (hasMessage) {
    setAiThoughts((prevThoughts) => [
      ...prevThoughts,
      `I received a message: "${newUserMessage}"`,
    ]);
  } else {
    setAiThoughts((prevThoughts) => [
      ...prevThoughts,
      getMessages().length === 0
        ? `Someone new is visiting!`
        : `I have company again!`,
    ]);
    if (!isMobile) {
      // wait for first few thoughts to pop up on first load
      await new Promise((resolve) => setTimeout(resolve, 1300));
    }
  }
  let foundMsg = false;

  let message = "";
  let lastThought = "";
  let stopTalking = false;
  while (!done) {
    // read stream
    const { value, done: doneReading } = await reader.read();
    done = doneReading;
    const chunkValue = decoder.decode(value);
    console.log("msg", chunkValue);

    parsedChunk += chunkValue;
    wholeChunk += chunkValue;
    const thoughtREGEX = /^((.||\n)*<\/[^<>/]+>)((.||\n)*)$/;
    const match = thoughtREGEX.exec(parsedChunk);
    if (match) {
      const thought = match[1];
      parsedChunk = match[2] || "";
      // cleanup
      const stripper = /^(.||\n)*>((.||\n)*)<\/(.||\n)*$/;
      let strippedThought = stripper.exec(thought)[2];
      strippedThought = strippedThought.replace(/<[^<>]+>/g, "");
      if (
        thought.includes("stop talk") ||
        thought.includes("end the conversation")
      ) {
        stopTalking = true;
      }
      if (!stopTalking) {
        if (thought.trim().startsWith("<ME")) {
          message = strippedThought;
          foundMsg = true;
          setMessages((prevMessages) => [
            ...prevMessages,
            { text: message, sender: "ai" },
          ]);
          setAiThoughts((prevThoughts) => [
            ...prevThoughts,
            `I sent the message: ${strippedThought}`,
          ]);
          appendToRecords("assistant", message, wholeChunk);
        } else {
          setAiThoughts((prevThoughts) => [...prevThoughts, strippedThought]);
        }
        lastThought = strippedThought;
        if (getRecords()?.records === undefined && !isMobile) {
          // wait for first few thoughts to pop up on first load
          await new Promise((resolve) => setTimeout(resolve, 1300));
        }
      }
    }
    // sometimes the last thought doesn't come with a completed html block. handle that edge case
    if (parsedChunk.trim().startsWith("<SELF") && done) {
      lastThought = parsedChunk;
      lastThought = lastThought.replace(/<[^<>]+>/g, "");
      setAiThoughts((prevThoughts) => [...prevThoughts, lastThought]);
    }
  }
  // add in the record information after its completely entered
  if (!stopTalking) {
    overwriteLastRecord("assistant", message, wholeChunk);
  }
};

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const aiMessagesEndRef = useRef(null);
  const [aiThoughts, setAiThoughts] = useState([]);
  const [videoUrl, setVideoUrl] = useState("/div.mp4");

  const fetchVideo = async (text) => {
    const options = {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization:
          "Bearer eyJhbGciOiJIUzUxMiJ9.eyJ1c2VybmFtZSI6ImRpdnlhbnNoMTk5QGdtYWlsLmNvbSJ9.oKk2ZvvkSyVED9bM6rQxu94MtRoPL2_1zIwo7aHHVJ04staNa0J8lJdD7PY1YOwaGMpNsZsXFG4-21L2U5qYug",
      },
      body: JSON.stringify({
        animation_pipeline: "high_speed",
        idle_url:
          "https://ugc-idle.s3-us-west-2.amazonaws.com/11b3ec57c735eae4b58b00a062edb6eb.mp4",
        text: text, // use text parameter
      }),
    };

    try {
      const response = await fetch(
        "https://api.exh.ai/animations/v2/generate_lipsync",
        options
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      } else {
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);
        // Update video url with new blob url
        setVideoUrl(videoUrl);
      }
    } catch (error) {
      console.error("Fetch error: ", error);
    }
  };

  React.useEffect(() => {
    // remove to keep store to keep conversation stored in browser
    window.localStorage.removeItem(STORAGE_KEY);
    setMessages(getMessages());
  }, []);

  const scrollToBottomThoughts = () => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottomThoughts();
  }, [aiThoughts]);

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  const handleSendMessage = (event) => {
    getDivResponse({
      newUserMessage: message,
      setMessages,
      setAiThoughts,
    });
    event.preventDefault();

    // clear message on send
    if (message.trim() !== "") {
      setMessages([...messages, { text: message, sender: "user" }]);
      setMessage("");
    }
  };

  const convoStarted = useRef(false);
  useEffect(() => {
    if (!convoStarted.current) {
      // get first reply from Div
      convoStarted.current = true;
      getDivResponse({ setMessages, setAiThoughts });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-r-from-cool-blue-via-electric-blue-to-dark-blue flex flex-col justify-center items-center h-full">
      <div className="flex container px-4 py-12 justify-center h-full">
        <div className="flex flex-col items-center w-full md:w-auto h-full">
          <h1
            className={`text-4xl text-white font-semibold mb-0 text-center pb-4 ${orbitron.className}`}
          >
            Div AI
          </h1>

          {videoUrl && (
            <video
              className="mb-0"
              style={{
                borderRadius: "15px",
                overflow: "hidden",
                maxWidth: `${TALKING_HEAD_WIDTH}px`,
              }}
              width="100%"
              height={TALKING_HEAD_WIDTH}
              autoPlay
              // controls
              loop
              muted
            >
              <source src={videoUrl} type="video/mp4" />
              {/* <img src="Masahiro.png" alt="Video poster" /> */}
            </video>
          )}
          <div>
            <Messages
              handleMessageChange={handleMessageChange}
              message={message}
              messages={messages}
              handleSendMessage={handleSendMessage}
            />
          </div>
        </div>
        {!isMobile && (
          <AIThoughts
            aiThoughts={aiThoughts}
            aiMessagesEndRef={aiMessagesEndRef}
          />
        )}
      </div>
    </div>
  );
};

function Messages({
  handleMessageChange,
  message,
  messages,
  handleSendMessage,
}) {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    setTimeout(() => scrollToBottom(), 100);
  }, [messages]);
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-96">
      <h1 className="text-xl font-semibold mb-4 text-center">Chat</h1>
      <div className="flex flex-col space-y-4 h-96 overflow-y-auto mb-4 min-h-40 hide-scrollbar">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.sender === "ai" ? "" : "justify-end"}`}
          >
            <div
              className={`${
                message.sender === "ai"
                  ? "bg-indigo-200 text-black"
                  : "bg-indigo-600 text-white"
              } px-4 py-2 rounded-lg shadow-md`}
            >
              {message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSendMessage}
        className="flex items-center space-x-4"
      >
        <input
          type="text"
          className="text-black w-full rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          placeholder="Type your message here..."
          value={message}
          onChange={handleMessageChange}
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 text-white px-4 py-2 font-semibold hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
        >
          Send
        </button>
      </form>
      <Analytics />
    </div>
  );
}

function AIThoughts({ aiThoughts, aiMessagesEndRef }) {
  return (
    <div className="bg-white bg-opacity-0 rounded-lg w-96">
      <div className="h-full overflow-y-auto fixed ml-10 w-96 mx-auto hide-scrollbar">
        <div className="flex-col space-y-4 overflow-y-auto mb-4 hide-scrollbar pb-60 mr-4">
          {aiThoughts.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === "ai" ? "" : "justify-end"}`}
            >
              <div
                className={`text-white bg-indigo-100 bg-opacity-30 px-4 py-2 rounded-[35px] shadow-sm opacity-0 transition-all duration-500 ease-in-out animate-fade-in`}
              >
                {message}
              </div>
            </div>
          ))}
          <div ref={aiMessagesEndRef} />
        </div>
      </div>
    </div>
  );
}

export default function ChatApp() {
  return <Chat />;
}
