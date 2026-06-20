import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import Pricing from "./Pricing";
import { RouterProvider, useRouter } from "./router";
import "./styles.css";

function Routes() {
  const { path } = useRouter();
  if (path === "/pricing") return <Pricing />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
      <Routes />
    </RouterProvider>
  </StrictMode>,
);
