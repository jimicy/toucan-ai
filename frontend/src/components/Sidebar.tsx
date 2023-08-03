import "./Sidebar.css";
import { PUBLIC_URL } from "../App";
import Button from "@mui/material/Button";
import { Link } from "react-router-dom";

export default function Sidebar(props: {
  languages: Array<{ language: string; locale: string }>;
  selectedLocale: string;
  setSelectedLocale: any;
}) {
  return (
    <>
      <div className="sidebar">
        <div className="logo">
          <img src={`${PUBLIC_URL}/toucan_logo.svg`} alt="toucan logo" />
          TOUCAN
        </div>
        <div className="settings">
          <label className="header"></label>
          <Link to="/">
            <Button
              variant="contained"
              style={{ width: 300, marginBottom: "15px" }}
            >
              Chat AI
            </Button>
          </Link>
          <Link to="/ecommerce-ai">
            <Button
              variant="contained"
              style={{ width: 300, marginBottom: "15px" }}
            >
              Ecommerce AI
            </Button>
          </Link>
          <Link to="/shipping-rate-calculator">
            <Button
              variant="contained"
              style={{ width: 300, marginBottom: "15px" }}
            >
              Shipping Rate Calculator
            </Button>
          </Link>
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
        </div>
      </div>
    </>
  );
}
