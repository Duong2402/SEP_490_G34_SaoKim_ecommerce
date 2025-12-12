import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Badge, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Chào bạn, mình có thể tư vấn chọn đèn theo không gian và ngân sách." },
  ]);

  const listRef = useRef(null);
  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages]);

  const sendToBot = async (userText) => {
    await new Promise((r) => setTimeout(r, 400));
    return `Mình đã nhận: "${userText}". Bạn cho mình biết diện tích và không gian nhé.`;
  };

  const handleSend = async () => {
    if (!canSend) return;
    const text = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", text }]);

    try {
      setSending(true);
      const reply = await sendToBot(text);
      setMessages((p) => [...p, { role: "bot", text: reply }]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Icon chat */}
      <Button
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          width: 50,
          height: 50,
          borderRadius: "50%",
          zIndex: 9999,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          padding: 0,
        }}
      >
        <FontAwesomeIcon icon={faComments} />
      </Button>

      {/* Box chat */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 78,
            width: 320,
            height: 460,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px",
              borderBottom: "1px solid #eee",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>ChatBox</strong>
              <div style={{ fontSize: 12 }}>
                <Badge bg="success">Online</Badge>
              </div>
            </div>
            <Button
              variant="link"
              onClick={() => setOpen(false)}
              style={{ color: "#333", textDecoration: "none" }}
            >
              <FontAwesomeIcon icon={faXmark} />
            </Button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            style={{
              flex: 1,
              padding: 12,
              overflowY: "auto",
              background: "#f7f7f7",
            }}
          >
            {messages.map((m, i) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: isUser ? "#0d6efd" : "#fff",
                      color: isUser ? "#fff" : "#333",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      fontSize: 14,
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {sending && (
              <div style={{ fontSize: 13, color: "#666" }}>
                <Spinner size="sm" /> Bot đang trả lời...
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding: 10, borderTop: "1px solid #eee" }}>
            <Form onSubmit={(e) => e.preventDefault()}>
              <div style={{ display: "flex", gap: 8 }}>
                <Form.Control
                  as="textarea"
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder="Nhập tin nhắn..."
                  style={{
                    resize: "none",
                    borderRadius: 10,
                    fontSize: 14,
                  }}
                />
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  style={{ borderRadius: 10, width: 42 }}
                >
                  <FontAwesomeIcon icon={faPaperPlane} />
                </Button>
              </div>
            </Form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatWidget;
