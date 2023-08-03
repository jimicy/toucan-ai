import { useContext, useState } from "react";
import { API_ADDRESS, MessageDict } from "./lib/type";
import { WaitingStates } from "./components/Chat";
import {
  CUSTOMER_ANALYSIS_USER_QUERY,
  GENERATE_NEW_PRODUCT_USER_QUERY,
  generateContextQuery,
} from "./lib/AiContext";
import { LocaleContext } from "../context";

export function useAppState() {
  const selectedLocale = useContext(LocaleContext);

  let [messages, setMessages] = useState<Array<MessageDict>>(
    Array.from([
      {
        text: `Hello! I'm Square AI, I can help you analyze your business and generate new products and campaigns.`,
        role: "system",
        type: "message",
      },
    ])
  );
  let [waitingForSystem, setWaitingForSystem] = useState<WaitingStates>(
    WaitingStates.Idle
  );

  const addMessage = (message: MessageDict) => {
    setMessages((state: any) => {
      return [...state, message];
    });
  };

  const sendMessage = async (userInput: string, customUserMessage?: string) => {
    try {
      if (userInput.length === 0) {
        return;
      }

      if (customUserMessage) {
        addMessage({
          text: customUserMessage,
          type: "message_raw",
          role: "user",
        });
      } else {
        addMessage({ text: userInput, type: "message", role: "user" });
      }

      setWaitingForSystem(WaitingStates.GeneratingCode);
      const response = await fetch(`${API_ADDRESS}/ecommerce-generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: generateContextQuery(messages, userInput),
          locale: selectedLocale,
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
        return { text: message.text };
      }
      return { text: "" };
    } catch (error) {
      console.error(
        "There has been a problem with your fetch operation:",
        error
      );
    }
  };

  const generateProduct = async () => {
    const customUserMessage = "Generate me a new product idea!";
    const gptResponse = await sendMessage(
      GENERATE_NEW_PRODUCT_USER_QUERY,
      customUserMessage
    );

    if (gptResponse && gptResponse.text) {
      return;
    }

    const name = gptResponse!.text.split("\n")[0].replace("Product Name: ", "");

    setWaitingForSystem(WaitingStates.GeneratingCode);
    let response = await fetch(`${API_ADDRESS}/generate-product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: name,
      }),
    });
    setWaitingForSystem(WaitingStates.Idle);

    let data = await response.json();
    for (const img of data) {
      addMessage({
        text: img["base64"],
        type: "image/png",
        role: "system",
        data: { name: name },
      });
    }
  };

  const runCustomerAnalysis = async () => {
    const customUserMessage =
      "Run psychographic analysis on my customer age buckets!";
    await sendMessage(CUSTOMER_ANALYSIS_USER_QUERY, customUserMessage);
  };

  const getStoreCatalog = async function () {
    if (document.hidden) {
      return;
    }

    setWaitingForSystem(WaitingStates.GeneratingCode);
    let response = await fetch(`${API_ADDRESS}/fetch-store-catalog`);
    let data = await response.json();
    setWaitingForSystem(WaitingStates.Idle);

    addMessage({
      text: "",
      type: "product-catalog",
      role: "system",
      data: data,
    });
  };

  const getStoreCustomers = async function () {
    if (document.hidden) {
      return;
    }

    setWaitingForSystem(WaitingStates.GeneratingCode);
    let response = await fetch(`${API_ADDRESS}/fetch-customers`);
    let data = await response.json();
    setWaitingForSystem(WaitingStates.Idle);

    addMessage({
      text: "",
      type: "store-customers",
      role: "system",
      data: data,
    });
  };

  const getPopularItemsAnalysis = async function () {
    if (document.hidden) {
      return;
    }

    setWaitingForSystem(WaitingStates.GeneratingCode);
    let response = await fetch(`${API_ADDRESS}/popular-items-analysis`);
    let data = await response.json();
    setWaitingForSystem(WaitingStates.Idle);

    addMessage({
      text: "",
      type: "popular-items-analysis",
      role: "system",
      data: data,
    });
  };

  const getSubscriptionAnalysis = async function () {
    if (document.hidden) {
      return;
    }

    setWaitingForSystem(WaitingStates.GeneratingCode);
    let response = await fetch(`${API_ADDRESS}/store-subscriptions-analysis`);
    let data = await response.json();
    setWaitingForSystem(WaitingStates.Idle);

    addMessage({
      text: "",
      type: "store-subscriptions-analysis",
      role: "system",
      data: data,
    });
  };

  return {
    messages,
    setMessages,
    waitingForSystem,
    setWaitingForSystem,
    addMessage,
    sendMessage,
    generateProduct,
    runCustomerAnalysis,
    getStoreCatalog,
    getStoreCustomers,
    getPopularItemsAnalysis,
    getSubscriptionAnalysis,
  };
}
