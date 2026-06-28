import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

function App() {
  return (
    <main className="splash">
      <div className="splash-card">
        <div className="card-top">
          <div className="brand-lockup">
            <span className="brand-mark" aria-hidden="true">
              <span />
            </span>
            <div>
              <div className="eyebrow">Fixmind Desktop</div>
              <h1>Starting your local workspace</h1>
            </div>
          </div>
          <div className="status-pill">Local first</div>
        </div>
        <p>
          The native shell opens the dashboard, then keeps lessons, review,
          and sync in one place.
        </p>
        <div className="card-footer">
          <div className="pulse" aria-hidden="true" />
          <span>Launching dashboard</span>
        </div>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
