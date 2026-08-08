import React, { useState, useRef, useEffect } from "react";
import { postChat } from "../services/api";

function ChatPanel({ onAction }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! 👋 I'm your AI travel assistant. How can I help today?" }
  ]);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMsg = { role: "user", text: message };
    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const res = await postChat({ messages: [...messages, userMsg] });

      if (res?.assistant) {
        // 1️⃣ show assistant reply
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: res.assistant.text }
        ]);

        // 2️⃣ itinerary partial update (IMPORTANT: run before onAction)
        if (res.assistant.action === "modify_itinerary" && res.assistant.changes) {
          // 1. Apply partial updates
          window.dispatchEvent(
            new CustomEvent("itineraryChanges", {
              detail: res.assistant.changes
            })
          );

          // 2. Fetch the new fully updated itinerary from backend
          const trip = await fetch("http://localhost:8000/trip").then(r => r.json());

          // 3. Dispatch full update event so Timeline resets correctly
          window.dispatchEvent(
            new CustomEvent("itineraryUpdated", {
              detail: trip.itinerary.days
            })
          );
        }

        // 3️⃣ run any actions for UI
        if (res.assistant.action && onAction) {
          onAction(res.assistant.action);
        }

      } else {
        setMessages(prev => [
          ...prev,
          { role: "assistant", text: "Hmm, I didn't understand that." }
        ]);
      }

    } catch (error) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: "❌ Server error. Try again later." }
      ]);
    }

    setLoading(false);
  };

  const onKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div
      style={{
        width: "32%",
        height: "100vh",
        position: "fixed",
        right: 0,
        top: 0,
        background: "linear-gradient(135deg, #f0f8ff 0%, #e6f7ff 100%)", // Soft sky-blue gradient
        borderLeft: "2px solid #b3d9ff",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "-4px 0 10px rgba(0, 0, 0, 0.1)", // Subtle shadow for depth
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif", // Modern font stack
      }}
    >
      <h2 
        style={{ 
          fontSize: "24px", 
          fontWeight: "600", 
          marginBottom: "15px", 
          color: "#2c3e50", 
          textAlign: "center",
          textShadow: "1px 1px 2px rgba(0, 0, 0, 0.1)" // Subtle text shadow
        }}
      >
        ✈️ AroundTheWorld 🌎
      </h2>

      {/* CHAT WINDOW */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid #d1ecf1",
          padding: "15px",
          borderRadius: "15px",
          background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)", // Light gradient background
          marginBottom: "20px",
          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.05)", // Inner shadow for depth
          scrollBehavior: "smooth", // Smooth scrolling
        }}
      >
        {messages.map((m, idx) => (
          <div 
            key={idx} 
            style={{ 
              textAlign: m.role === "user" ? "right" : "left", 
              marginBottom: "15px",
              animation: "fadeIn 0.5s ease-in", // Fade-in animation
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "20px",
                background: m.role === "user" 
                  ? "linear-gradient(135deg, #007bff 0%, #0056b3 100%)" 
                  : "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                color: m.role === "user" ? "white" : "#495057",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)", // Bubble shadow
                fontSize: "14px",
                lineHeight: "1.4",
              }}
            >
              <span style={{ marginRight: "8px", fontSize: "16px" }}>
                {m.role === "user" ? "👤" : "🤖"}
              </span>
              {m.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ 
            textAlign: "left", 
            marginBottom: "15px",
            animation: "fadeIn 0.5s ease-in",
          }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "12px 16px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
                color: "#495057",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
                fontSize: "14px",
              }}
            >
              <span style={{ marginRight: "8px", fontSize: "16px" }}>🤖</span>
              <span style={{ display: "inline-block" }}>
                Typing<span className="typing-dots">...</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div style={{ display: "flex", gap: "12px", alignItems: "flex-end" }}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={onKeyPress}
          placeholder="Ask something..."
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            border: "1px solid #ced4da",
            height: "60px",
            resize: "none",
            fontSize: "14px",
            lineHeight: "1.4",
            background: "#ffffff",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            transition: "border-color 0.3s, box-shadow 0.3s", // Smooth focus transition
            outline: "none",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#007bff";
            e.target.style.boxShadow = "0 0 0 2px rgba(0, 123, 255, 0.25)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#ced4da";
            e.target.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
          }}
        />

        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: "0 24px",
            background: loading 
              ? "linear-gradient(135deg, #6c757d 0%, #495057 100%)" 
              : "linear-gradient(135deg, #007bff 0%, #0056b3 100%)",
            color: "white",
            borderRadius: "12px",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            height: "60px",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.2s, box-shadow 0.2s", // Hover effect
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.15)";
            }
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.1)";
          }}
        >
          {loading ? "..." : "Send ✈️"}
        </button>
      </div>

      {/* Add CSS for animations (if not using a library) */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .typing-dots {
          animation: typing 1.5s infinite;
        }
        @keyframes typing {
          0%, 20% { content: ""; }
          40% { content: "."; }
          60% { content: ".."; }
          80%, 100% { content: "..."; }
        }
      `}</style>
    </div>
  );
}

export default ChatPanel;
