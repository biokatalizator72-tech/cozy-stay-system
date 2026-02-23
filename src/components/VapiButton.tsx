import eszterImg from "@/assets/eszter1.png";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    vapiSDK: {
      start: (config: { apiKey: string; assistant: string }) => void;
    };
  }
}

const VAPI_PUBLIC_KEY = "5181a96c-e84b-4306-a267-1c0e97f20139";
const VAPI_ASSISTANT_ID = "1b89fb88-f113-475b-85ec-ef4facba0a62";

const VapiButton = () => {
  const location = useLocation();
  if (location.pathname.startsWith("/admin")) return null;

  const handleClick = () => {
    if (window.vapiSDK) {
      window.vapiSDK.start({
        apiKey: VAPI_PUBLIC_KEY,
        assistant: VAPI_ASSISTANT_ID,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Hangasszisztens indítása"
      className="vapi-btn"
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        borderRadius: "50%",
        overflow: "hidden",
        border: "none",
        padding: 0,
        cursor: "pointer",
        zIndex: 50,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <style>{`
        .vapi-btn { width: 250px; height: 250px; }
        @media (max-width: 768px) {
          .vapi-btn { width: 110px; height: 110px; }
          .vapi-btn .vapi-label { font-size: 9px; padding-bottom: 8px; letter-spacing: 0.08em; }
          .vapi-btn .vapi-overlay { padding-bottom: 0; }
        }
      `}</style>
      <img
        src={eszterImg}
        alt="Eszter asszisztens"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      <div
        className="vapi-overlay"
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "40%",
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.65) 60%)",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          paddingBottom: "18px",
        }}
      >
        <span
          className="vapi-label"
          style={{
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "15px",
            letterSpacing: "0.12em",
            textShadow: "0 1px 4px rgba(0,0,0,0.5)",
          }}
        >
          SEGÍTHETEK?
        </span>
      </div>
    </button>
  );
};

export default VapiButton;
