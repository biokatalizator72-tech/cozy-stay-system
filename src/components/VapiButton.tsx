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
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        width: "250px",
        height: "250px",
        borderRadius: "50%",
        overflow: "hidden",
        border: "none",
        padding: 0,
        cursor: "pointer",
        zIndex: 50,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
      }}
    >
      <img
        src="https://siralyhotel.hu/wp-content/uploads/2026/02/eszter1.png"
        alt="Eszter asszisztens"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />
      {/* Sötétített sáv a gomb alján */}
      <div
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
