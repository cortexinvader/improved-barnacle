import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Heart, Reply, Edit, Trash2, Bot } from "lucide-react";

interface ChatMessageProps {
  id: string;
  sender: string;
  content: string;
  timestamp: string;
  isOwn?: boolean;
  isAI?: boolean;
  replyTo?: string;
  edited?: boolean;
  reactions?: { heart: number };
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
  };
  imageUrl?: string;
  caption?: string;
  onReact?: (emoji: string) => void;
  onUsernameClick?: (username: string) => void;
}

export default function ChatMessage({
  id,
  sender,
  content,
  timestamp,
  isOwn = false,
  isAI = false,
  replyTo,
  edited = false,
  reactions = { heart: 0 },
  formatting,
  imageUrl,
  caption,
  onReact,
  onUsernameClick
}: ChatMessageProps) {
  const [showActions, setShowActions] = useState(false);
  const [localReactions, setLocalReactions] = useState(reactions);
  const [hasReacted, setHasReacted] = useState(false);

  const handleReact = (emoji: string) => {
    if (onReact) {
      onReact(emoji);
    }

    setHasReacted(!hasReacted);
    setLocalReactions(prev => ({
      heart: prev.heart + (hasReacted ? -1 : 1)
    }));

    // Send reaction to server via WebSocket
    if ((window as any).ws && (window as any).ws.readyState === WebSocket.OPEN) {
      (window as any).ws.send(JSON.stringify({
        type: "react",
        messageId: id,
        emoji: emoji
      }));
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const messageStyle = {
    fontWeight: formatting?.bold ? 600 : 400,
    fontStyle: formatting?.italic ? 'italic' : 'normal',
    color: formatting?.color || undefined
  };

  return (
    <div
      className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <Avatar className="w-8 h-8 shrink-0">
        <AvatarFallback className={isAI ? 'bg-primary text-primary-foreground' : ''}>
          {isAI ? <Bot className="w-4 h-4" /> : getInitials(sender)}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium ${!isAI && onUsernameClick ? 'cursor-pointer hover:underline' : ''}`}
            onClick={() => !isAI && onUsernameClick && onUsernameClick(sender)}
          >
            {sender}
          </span>
          {isAI && <Badge variant="secondary" className="text-[10px] h-4 px-1">AI</Badge>}
        </div>

        {replyTo && (
          <div className="text-[10px] text-muted-foreground italic px-3 py-1 bg-muted/50 rounded">
            Replying to: {replyTo}
          </div>
        )}

        <div
          className={`rounded-lg overflow-hidden ${
            imageUrl ? 'p-2' : 'px-3 py-2'
          } ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : isAI
              ? 'bg-accent/50'
              : 'bg-card border'
          }`}
        >
          {imageUrl ? (
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden border-2 border-background">
                <img 
                  src={imageUrl} 
                  alt="Uploaded image" 
                  className="max-w-full h-auto max-h-96 object-contain"
                />
              </div>
              {caption && (
                <p className="text-sm leading-relaxed break-words px-1" style={messageStyle}>
                  {caption}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm leading-relaxed break-words" style={messageStyle}>
              {content}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">
            {timestamp}
            {edited && <span className="ml-1">(edited)</span>}
          </span>

          {localReactions.heart > 0 && (
            <div className="flex items-center gap-1 text-[10px]">
              <Heart className={`w-3 h-3 ${hasReacted ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
              <span>{localReactions.heart}</span>
            </div>
          )}
        </div>

        {showActions && (
          <div className={`flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReact("heart")}
              className="h-6 px-2"
              data-testid="button-react"
            >
              <Heart className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => console.log('Reply to message')}
              className="h-6 px-2"
              data-testid="button-reply"
            >
              <Reply className="w-3 h-3" />
            </Button>
            {isOwn && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => console.log('Edit message')}
                  className="h-6 px-2"
                  data-testid="button-edit"
                >
                  <Edit className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => console.log('Delete message')}
                  className="h-6 px-2"
                  data-testid="button-delete"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}