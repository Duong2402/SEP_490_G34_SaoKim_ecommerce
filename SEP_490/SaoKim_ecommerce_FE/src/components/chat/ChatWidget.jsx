import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Form, Badge, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faComments, faPaperPlane, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useLocation, useNavigate } from "react-router-dom";
import { sendChatMessage } from "../../api/chatbot";

const SESSION_KEY = "chatbot_session_id";

function getOrCreateSessionId() {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;

  const id =
    "s_" +
    Date.now().toString(36) +
    "_" +
    Math.random().toString(36).slice(2, 10);

  window.localStorage.setItem(SESSION_KEY, id);
  return id;
}

function formatVnd(n) {
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);
  } catch {
    return `${n} VND`;
  }
}

function buildContextFromLocation(pathname) {
  const ctx = {
    page: "",
    productId: null,
    categoryId: null,
    priceMin: null,
    priceMax: null,
    inStockOnly: true,
  };

  if (pathname === "/" || pathname.startsWith("/homepage")) {
    ctx.page = "home";
    return ctx;
  }

  if (pathname === "/products") {
    ctx.page = "products";
    return ctx;
  }

  // /products/:id
  if (pathname.startsWith("/products/")) {
    const parts = pathname.split("/").filter(Boolean);
    const id = parts.length >= 2 ? Number(parts[1]) : NaN;
    if (!Number.isNaN(id)) ctx.productId = id;
    ctx.page = "productDetail";
    return ctx;
  }

  if (pathname.startsWith("/cart")) {
    ctx.page = "cart";
    return ctx;
  }

  if (pathname.startsWith("/checkout")) {
    ctx.page = "checkout";
    return ctx;
  }

  if (pathname.startsWith("/account")) {
    ctx.page = "account";
    return ctx;
  }

  ctx.page = "unknown";
  return ctx;
}

const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState([
    { role: "bot", text: "Xin chào, mình là Sao Kim chatbot, mình có thể hỗ trợ gì cho bạn?" },
  ]);

  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);

  const listRef = useRef(null);
  const sessionIdRef = useRef("");

  const location = useLocation();
  const navigate = useNavigate();

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  useEffect(() => {
    sessionIdRef.current = getOrCreateSessionId();
  }, []);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages, sending]);

  const appendBotMessage = (text) => {
    setMessages((p) => [...p, { role: "bot", text }]);
  };

  const doSend = async (userText) => {
    const ctx = buildContextFromLocation(location.pathname);

    const payload = {
      sessionId: sessionIdRef.current,
      message: userText,
      context: ctx,
    };

    const res = await sendChatMessage(payload);

    // ApiResponse<ChatResponseDto>
    const data = res?.data;
    const replyText = data?.replyText || "Mình chưa nhận được phản hồi hợp lệ từ hệ thống.";
    const products = Array.isArray(data?.suggestedProducts) ? data.suggestedProducts : [];
    const replies = Array.isArray(data?.quickReplies) ? data.quickReplies : [];

    setSuggestedProducts(products);
    setQuickReplies(replies);

    appendBotMessage(replyText);
  };

  const handleSend = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || sending) return;

    setInput("");

    // Clear gợi ý cũ ngay khi gửi để tránh "lần trước còn, lần này đang chờ vẫn hiện"
    setSuggestedProducts([]);
    setQuickReplies([]);

    setMessages((p) => [...p, { role: "user", text }]);

    try {
      setSending(true);
      await doSend(text);
    } catch (e) {
      appendBotMessage("Hiện tại mình gặp lỗi khi kết nối hệ thống. Bạn thử lại sau nhé.");
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

  const openProduct = (id) => {
    setOpen(false);
    navigate(`/products/${id}`);
  };

  const renderProductCards = () => {
    if (!Array.isArray(suggestedProducts) || suggestedProducts.length === 0) return null;

    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
          Gợi ý sản phẩm
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {suggestedProducts.slice(0, 6).map((p) => (
            <div
              key={p.id}
              onClick={() => openProduct(p.id)}
              role="button"
              tabIndex={0}
              style={{
                display: "flex",
                gap: 10,
                padding: 8,
                borderRadius: 12,
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#f2f2f2",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <div style={{ fontSize: 11, color: "#888", padding: 6, textAlign: "center" }}>
                    No image
                  </div>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#222" }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 2 }}>
                  {formatVnd(p.price)}
                  {p.unit ? ` / ${p.unit}` : ""}
                </div>
                <div style={{ fontSize: 12, color: p.stock > 0 ? "#2f7d32" : "#b00020", marginTop: 2 }}>
                  {p.stock > 0 ? `Còn hàng: ${p.stock}` : "Hết hàng"}
                </div>
                {p.categoryName ? (
                  <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>
                    {p.categoryName}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderQuickReplies = () => {
    if (!Array.isArray(quickReplies) || quickReplies.length === 0) return null;

    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {quickReplies.slice(0, 6).map((q, idx) => (
            <Button
              key={`${q}-${idx}`}
              variant="outline-secondary"
              size="sm"
              onClick={() => handleSend(q)}
              disabled={sending}
              style={{ borderRadius: 999 }}
            >
              {q}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
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

      {open && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 78,
            width: 340,
            height: 520,
            background: "#fff",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
            display: "flex",
            flexDirection: "column",
            zIndex: 9999,
          }}
        >
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
                      maxWidth: "82%",
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: isUser ? "#0d6efd" : "#fff",
                      color: isUser ? "#fff" : "#333",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                      fontSize: 14,
                      whiteSpace: "pre-wrap",
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

            {renderProductCards()}
            {renderQuickReplies()}
          </div>

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
                  onClick={() => handleSend()}
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
