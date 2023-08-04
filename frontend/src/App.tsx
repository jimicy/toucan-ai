import "./App.css";
import Input from "./components/Input";
import Chat, { WaitingStates } from "./components/Chat";
import React, { useContext, useState } from "react";
import { LocaleContext } from "./components/context";

export type MessageDict = {
  text: string;
  role: string;
  type: string;
  data?: any;
};

const Config = {
  API_ADDRESS: "http://localhost:5000/api",
  WEB_ADDRESS: "http://localhost:5000",
};

// eslint-disable-next-line no-restricted-globals
const ORIGIN_URL = new URL(location.origin);
if (ORIGIN_URL.port === "3000") {
  ORIGIN_URL.port = "5000";
}
export const API_ADDRESS = `${ORIGIN_URL.toString()}api`;

// eslint-disable-next-line no-restricted-globals
export const PUBLIC_URL = location.origin;

function App() {
  const COMMANDS = ["reset"];

  const selectedLocale = useContext(LocaleContext);

  let [messages, setMessages] = useState<Array<MessageDict>>(
    Array.from([
      {
        text: `Hello! I'm Toucan, an AI powered consultant fined tuned for the international trade, shipping, logistics industry. I can help you with your international trade needs!
You can ask me questions like:
  • How do I ship from Malaysia to United States? Explain step by step.
  • What the tax rate for sales of goods, provisions of services and import for Thailand?`,
        role: "system",
        type: "message",
      },
    ])
  );

  let [waitingForSystem, setWaitingForSystem] = useState<WaitingStates>(
    WaitingStates.Idle
  );
  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  const addMessage = (message: MessageDict) => {
    setMessages((state: any) => {
      return [...state, message];
    });
  };

  const handleCommand = (command: string) => {
    if (command === "reset") {
      addMessage({
        text: "Restarting the kernel.",
        type: "message",
        role: "system",
      });

      fetch(`${Config.API_ADDRESS}/restart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
        .then(() => {})
        .catch((error) => console.error("Error:", error));
    }
  };

  const sendMessage = async (userInput: string) => {
    try {
      if (COMMANDS.includes(userInput)) {
        handleCommand(userInput);
        return;
      }

      if (userInput.length === 0) {
        return;
      }

      addMessage({ text: userInput, type: "message", role: "user" });

      const response = await fetch(`${API_ADDRESS}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userInput,
          locale: userInput.indexOf("translate") !== -1 ? "en" : selectedLocale,
        }),
      });

      if (response.status === 200 && response.body) {
        const message = { text: "", type: "message", role: "system" };
        setMessages((state: any) => {
          return [...state, message];
        });

        const reader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            console.log(`stream done ${done}`);
            break;
          }
          message.text += value;
          setMessages((state: any) => {
            return [...state.slice(0, -1), message];
          });
        }
      }
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    }
  };

  function completeUpload(filename: string) {
    addMessage({
      text: `Added ${filename} to context.`,
      type: "message_file",
      role: "system",
      data: { filename: filename },
    });

    setWaitingForSystem(WaitingStates.Idle);
  }

  function startUpload(_: string) {
    setWaitingForSystem(WaitingStates.UploadingFile);
  }

  React.useEffect(() => {
    if (chatScrollRef.current == null) {
      return;
    }

    // Scroll down container by setting scrollTop to the height of the container
    chatScrollRef.current!.scrollTop = chatScrollRef.current!.scrollHeight;
  }, [chatScrollRef, messages]);

  // Capture <a> clicks for download links
  React.useEffect(() => {
    const clickHandler = (event: any) => {
      let element = event.target;

      // If an <a> element was found, prevent default action and do something else
      if (element != null && element.tagName === "A") {
        // Check if href starts with /download

        if (element.getAttribute("href").startsWith(`/download`)) {
          event.preventDefault();

          // Make request to ${Config.WEB_ADDRESS}/download instead
          // make it by opening a new tab
          window.open(`${Config.WEB_ADDRESS}${element.getAttribute("href")}`);
        }
      }
    };

    // Add the click event listener to the document
    document.addEventListener("click", clickHandler);

    // Cleanup function to remove the event listener when the component unmounts
    return () => {
      document.removeEventListener("click", clickHandler);
    };
  }, []);

  return (
    <>
      <div className="main">
        <Chat
          chatScrollRef={chatScrollRef}
          waitingForSystem={waitingForSystem}
          messages={messages}
        />
        <Input
          onSendMessage={sendMessage}
          onCompletedUpload={completeUpload}
          onStartUpload={startUpload}
        />
      </div>
    </>
  );
}

export default App;
