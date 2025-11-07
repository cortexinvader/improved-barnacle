import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Image as ImageIcon, Bold, Italic, Palette } from "lucide-react";
import ChatMessage from "./ChatMessage";
import UserProfileDialog from "./UserProfileDialog";

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
  isAI?: boolean;
  replyTo?: string;
  reactions?: { heart: number };
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  imageUrl?: string;
  caption?: string;
}

interface ChatInterfaceProps {
  roomName: string;
  currentUser: string;
  roomId: string;
}

export default function ChatInterface({ roomName, currentUser, roomId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [textColor, setTextColor] = useState("#000000");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Helper function to scroll to the bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    // Store WebSocket globally for message reactions
    (window as any).ws = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      ws.send(JSON.stringify({
        type: 'join',
        roomId: roomId,
        userId: currentUser
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'history') {
        setMessages(data.messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: formatTimestamp(msg.createdAt),
          isOwn: msg.sender === currentUser,
          isAI: msg.sender === 'AI Assistant',
          replyTo: msg.replyTo,
          reactions: msg.reactions || { heart: 0 },
          formatting: msg.formatting,
          imageUrl: msg.imageUrl,
          caption: msg.imageUrl ? msg.content : undefined,
          edited: msg.edited,
        })));
      } else if (data.type === 'new_message') {
        const msg = data.message;
        setMessages(prev => [...prev, {
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: formatTimestamp(msg.createdAt),
          isOwn: msg.sender === currentUser,
          isAI: msg.sender === 'AI Assistant',
          replyTo: msg.replyTo,
          reactions: msg.reactions || { heart: 0 },
          formatting: msg.formatting,
          imageUrl: msg.imageUrl,
          caption: msg.imageUrl ? msg.content : undefined,
          edited: msg.edited,
        }]);
      } else if (data.type === 'message_edited') {
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, content: data.content, edited: true }
            : msg
        ));
      } else if (data.type === 'message_deleted') {
        setMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      } else if (data.type === 'message_reacted') {
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        ));
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      (window as any).ws = null;
    };

    return () => {
      ws.close();
      (window as any).ws = null;
    };
  }, [roomId, currentUser]);

  const handleSend = async () => {
    if (!message.trim() && !selectedImage) return;

    // Handle image upload first if there's an image
    if (selectedImage) {
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('roomId', roomId);
      formData.append('caption', message);

      try {
        const response = await fetch('/api/chat/upload-image', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        if (response.ok) {
          // Image message will come through WebSocket
          console.log('Image uploaded successfully');
        } else {
          console.error('Image upload failed');
          alert('Failed to upload image. Please try again.');
        }
      } catch (error) {
        console.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
      }

      // Clear image selection
      setSelectedImage(null);
      setImagePreview(null);
      setMessage("");
      return;
    }

    const isAIQuery = message.toLowerCase().includes('@ai');

    const formatting: any = {};
    if (isBold) formatting.bold = true;
    if (isItalic) formatting.italic = true;
    if (textColor !== "#000000") formatting.color = textColor;

    // Send message through WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        roomId: roomId,
        sender: currentUser,
        content: message,
        formatting: Object.keys(formatting).length > 0 ? formatting : null
      }));
    }

    setMessage("");
    setIsBold(false);
    setIsItalic(false);
    setTextColor("#000000");

    if (isAIQuery) {
      // Send to custom AI API
      const aiMessage = message.replace('@ai', '').trim();

      fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: aiMessage,
          roomId: roomId,
          context: `Chat room: ${roomName}`,
        }),
      })
        .then(response => response.json())
        .then(data => {
          // AI response will be sent through WebSocket
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'message',
              roomId: roomId,
              sender: 'AI Assistant',
              content: data.response || "I'm sorry, I couldn't process that request."
            }));
          }
        })
        .catch(error => {
          console.error('AI request failed:', error);
        });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handler for message reactions
  const handleReaction = (emoji: string) => {
    // This handler is passed to ChatMessage but not currently used
    // since ChatMessage handles reactions internally via WebSocket
  };

  // Handler for username click
  const handleUsernameClick = (username: string) => {
    setSelectedUsername(username);
    setProfileDialogOpen(true);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-4 py-3 bg-card">
        <h2 className="font-semibold">{roomName}</h2>
        <p className="text-xs text-muted-foreground">
          {messages.length} messages
        </p>
      </div>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <ChatMessage
              id={msg.id}
              key={msg.id}
              sender={msg.sender}
              content={msg.content}
              timestamp={msg.timestamp}
              isOwn={msg.isOwn}
              isAI={msg.isAI}
              replyTo={msg.replyTo}
              reactions={msg.reactions}
              formatting={msg.formatting}
              imageUrl={msg.imageUrl}
              caption={msg.caption}
              onReact={handleReaction}
              onUsernameClick={handleUsernameClick}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="border-t p-4 bg-card space-y-2">
        {imagePreview && (
          <div className="relative bg-muted rounded-lg p-2">
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute top-1 right-1 bg-background rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
            >
              ✕
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-h-32 rounded"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {selectedImage?.name} • Add a caption below (optional)
            </p>
          </div>
        )}

        <div className="flex gap-2 items-center">
          <Button
            variant={isBold ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsBold(!isBold)}
            data-testid="button-format-bold"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            variant={isItalic ? "default" : "ghost"}
            size="sm"
            onClick={() => setIsItalic(!isItalic)}
            data-testid="button-format-italic"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => document.getElementById('color-picker')?.click()}
              data-testid="button-format-color"
            >
              <Palette className="w-4 h-4" />
            </Button>
            <input
              id="color-picker"
              type="color"
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="w-0 h-0 opacity-0"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload-image"
          >
            <ImageIcon className="w-4 h-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('Image selected:', file.name);
                setSelectedImage(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                  setImagePreview(reader.result as string);
                };
                reader.readAsDataURL(file);

                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }
            }}
            className="hidden"
          />
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder={selectedImage ? "Add a caption for your image (optional)..." : "Type a message... (use @ai for AI help, @username to mention)"}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="min-h-[60px] resize-none"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() && !selectedImage}
            className="shrink-0"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          Tip: Use @ai to ask questions, @username to mention someone
        </p>
      </div>

      <UserProfileDialog
        username={selectedUsername}
        open={profileDialogOpen}
        onOpenChange={setProfileDialogOpen}
      />
    </div>
  );
}