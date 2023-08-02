import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { useLocalStorage } from "usehooks-ts";

import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LocaleContext, SupportedLanguages } from "./components/context";
import Sidebar from "./components/Sidebar";
import ShipRateCalculator from "./components/ShipRateCalculator";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

function IndexPage() {
  const [selectedLocale, setSelectedLocale] = useLocalStorage<string>(
    "locale",
    navigator.language.startsWith("zh")
      ? navigator.language
      : navigator.language.split("-")[0]
  );

  const sideBarAndPage = (page: JSX.Element) => (
    <>
      <Sidebar
        languages={SupportedLanguages}
        selectedLocale={selectedLocale}
        setSelectedLocale={setSelectedLocale}
      />
      {page}
    </>
  );

  const router = createBrowserRouter([
    {
      path: "/",
      element: sideBarAndPage(<App />),
    },
    {
      path: "/shipping-rate-calculator",
      element: sideBarAndPage(<ShipRateCalculator />),
    },
  ]);

  return (
    <>
      <LocaleContext.Provider value={selectedLocale}>
        <div className="app">
          <RouterProvider router={router} />
        </div>
      </LocaleContext.Provider>
    </>
  );
}

root.render(
  <React.StrictMode>
    <IndexPage />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
