import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import Account from "./Account";
import App from "./App";
import Contact from "./Contact";
import Pricing from "./Pricing";
import { RouterProvider, useRouter } from "./router";
import "./styles.css";

function Routes() {
  const { path } = useRouter();
  if (path === "/pricing") return <Pricing />;
  if (path === "/contact") return <Contact />;
  if (path === "/account") return <Account />;
  return <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider>
      <Routes />
    </RouterProvider>
    <Toaster theme="dark" position="bottom-right" richColors />
  </StrictMode>,
);
