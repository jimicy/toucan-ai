import "./Chat.css";

import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import PersonIcon from "@mui/icons-material/Person";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import { API_ADDRESS, MessageDict, PUBLIC_URL } from "../App";

import { RefObject, useState } from "react";
import IconButton from "@mui/material/IconButton";
import { useCopyToClipboard } from "usehooks-ts";

function Message(props: {
  text: string;
  role: string;
  type: string;
  data?: any;
  showLoader?: boolean;
  selectedLocale: string;
}) {
  let { text, role } = props;
  const [_, setCopyToClipboard] = useCopyToClipboard();

  const [removedFileContext, setRemovedFileContext] = useState<string>("");

  const handleTextToSpeech = (event: React.MouseEvent<Element>) => {
    const foundAudioElement = event.currentTarget?.querySelector("audio");
    if (foundAudioElement) {
      foundAudioElement.play();
    } else {
      const audioElement = document.createElement("audio");
      event.currentTarget?.appendChild(audioElement);

      fetch(`${API_ADDRESS}/synthesize-speech`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: text, locale: props.selectedLocale }),
      })
        .then((response) => response.json())
        .then((json) => {
          // Decode the base64-encoded audio content
          const decodedAudio = atob(json["audioContent"]);

          // Create a Uint8Array from the decoded binary data
          const arrayBuffer = new Uint8Array(decodedAudio.length);
          for (let i = 0; i < decodedAudio.length; ++i) {
            arrayBuffer[i] = decodedAudio.charCodeAt(i);
          }

          // Create a Blob from the Uint8Array
          const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });

          // Play the audio using the Blob URL
          const sourceElement = document.createElement("source");
          sourceElement.src = URL.createObjectURL(blob);
          sourceElement.type = "audio/mpeg";
          audioElement.appendChild(sourceElement);
          audioElement.play();
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    }
  };

  const clearContextFile = (filename: string) => {
    fetch(`${API_ADDRESS}/injected_context_filename`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((response) => response.json())
      .then((json) => {
        setRemovedFileContext(`Cleared ${filename} from context`);
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  };

  const copyToClipboard = () => {
    setCopyToClipboard(text);
  };

  return (
    <div className={"message " + (role == "system" ? "system" : "user")}>
      <div className="avatar-holder">
        <div className="avatar">
          {role == "system" ? (
            <img
              id="system_icon"
              src={`${PUBLIC_URL}/toucan_logoWhite.svg`}
              alt="toucan logo"
            />
          ) : (
            <PersonIcon />
          )}
        </div>
      </div>
      <div className="message-body">
        {props.type == "message_file" &&
          (props.showLoader ? (
            <div>
              {text} {props.showLoader ? <div className="loader"></div> : null}
            </div>
          ) : (
            <div
              className="cell-output"
              dangerouslySetInnerHTML={{ __html: removedFileContext || text }}
            ></div>
          ))}

        {(props.type == "message" || props.type == "message_raw") &&
          (props.showLoader ? (
            <div>
              {text} {props.showLoader ? <div className="loader"></div> : null}
            </div>
          ) : (
            <div
              className="cell-output"
              dangerouslySetInnerHTML={{ __html: text }}
            ></div>
          ))}

        {props.type == "image/png" && (
          <div
            className="cell-output-image"
            dangerouslySetInnerHTML={{
              __html: `<img src='data:image/png;base64,${text}' />`,
            }}
          ></div>
        )}
        {props.type == "image/jpeg" && (
          <div
            className="cell-output-image"
            dangerouslySetInnerHTML={{
              __html: `<img src='data:image/jpeg;base64,${text}' />`,
            }}
          ></div>
        )}
      </div>
      <div className="message-righthand">
        {props.type === "message_file" && removedFileContext === "" && (
          <IconButton
            aria-label="clear-context-file"
            onClick={() => clearContextFile(props.data.filename)}
          >
            <DeleteForeverIcon className="rightHandIcons" />
          </IconButton>
        )}
        {(props.type === "message" || props.type == "message_raw") &&
          role === "system" && (
            <>
              <IconButton
                aria-label="text-to-speech"
                onClick={handleTextToSpeech}
              >
                <VolumeUpIcon className="rightHandIcons" />
              </IconButton>
              <IconButton
                aria-label="copy-to-clipboard"
                onClick={copyToClipboard}
              >
                <ContentCopyIcon className="rightHandIcons" />
              </IconButton>
            </>
          )}
      </div>
    </div>
  );
}

export enum WaitingStates {
  GeneratingCode = "Toucan AI is writing a reply...",
  RunningCode = "Running code",
  UploadingFile = "Uploading file",
  Idle = "Idle",
}

export default function Chat(props: {
  waitingForSystem: WaitingStates;
  chatScrollRef: RefObject<HTMLDivElement>;
  messages: Array<MessageDict>;
  selectedLocale: string;
}) {
  return (
    <>
      <div className="chat-messages" ref={props.chatScrollRef}>
        {props.messages.map((message, index) => {
          return (
            <Message
              key={index}
              text={message.text}
              role={message.role}
              type={message.type}
              data={message.data}
              selectedLocale={props.selectedLocale}
            />
          );
        })}
        {props.waitingForSystem !== WaitingStates.Idle ? (
          <Message
            text={props.waitingForSystem}
            role="system"
            type="message"
            showLoader={true}
            selectedLocale={props.selectedLocale}
          />
        ) : null}
      </div>
    </>
  );
}
