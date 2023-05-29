import AssistantIcon from "@mui/icons-material/Assistant";

import "./Sidebar.css";
import {PUBLIC_URL} from '../App'

export default function Sidebar(props: {
  models: Array<{ name: string; displayName: string }>;
  selectedModel: string;
  onSelectModel: any;

  languages: Array<{ language: string; locale: string }>;
  selectedLocale: string;
  setSelectedLocale: any;
  setOpenAIKey: any;
  openAIKey: string;
}) {
  const handleOpenAIButtonClick = () => {
    const key = prompt("Please enter your OpenAI key", props.openAIKey);
    if (key != null) {
      props.setOpenAIKey(key);
    }
  };

  return (
    <>
      <div className="sidebar">
        <div className="logo">
          <img src={`${PUBLIC_URL}/toucan_logo.svg`} alt="toucan logo" />
          TOUCAN
          <div className="github">
            <a href="https://github.com/jimicy/toucan-ai">Open Source</a>
          </div>
        </div>
        <div className="settings">
          <label className="header">Settings</label>
          <label>Languages</label>
          <select
            value={props.selectedLocale}
            onChange={(event) => props.setSelectedLocale(event.target.value)}
          >
            {props.languages.map((language, index) => {
              return (
                <option key={index} value={language.locale}>
                  {language.language}
                </option>
              );
            })}
          </select>
          <label>Model</label>
          <select
            value={props.selectedModel}
            onChange={(event) => props.onSelectModel(event.target.value)}
          >
            {props.models.map((model, index) => {
              return (
                <option key={index} value={model.name}>
                  {model.displayName}
                </option>
              );
            })}
          </select>
          <label>Credentials</label>
          <button onClick={handleOpenAIButtonClick}>Set OpenAI key</button>
        </div>
      </div>
    </>
  );
}
