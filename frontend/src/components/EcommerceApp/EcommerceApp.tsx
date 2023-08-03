// import "./EcommerceApp.css";
// import "../Chat.css";
import Input from "./components/Input";
import Chat from "./components/Chat";
import { useAppState } from "./useApp";
import React from "react";

function EcommerceApp() {
  const {
    waitingForSystem,
    messages,
    sendMessage,
    generateProduct,
    runCustomerAnalysis,
    getStoreCatalog,
    getStoreCustomers,
    getPopularItemsAnalysis,
    getSubscriptionAnalysis,
  } = useAppState();

  const chatScrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <>
      <div className="main">
        <Chat
          chatScrollRef={chatScrollRef}
          waitingForSystem={waitingForSystem}
          messages={messages}
          generateProduct={generateProduct}
          runCustomerAnalysis={runCustomerAnalysis}
        />
        <Input
          onSendMessage={sendMessage}
          getStoreCatalog={getStoreCatalog}
          getStoreCustomers={getStoreCustomers}
          getPopularItemsAnalysis={getPopularItemsAnalysis}
          getSubscriptionAnalysis={getSubscriptionAnalysis}
        />
      </div>
    </>
  );
}

export default EcommerceApp;
