import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, AlertCircle, Info, Flame, Trash2 } from "lucide-react";
import { useUser } from "@/lib/auth";

interface NotificationCardProps {
  id: string;
  type?: "urgent" | "regular" | "cruise";
  notificationType?: string;
  title: string;
  content: string;
  postedBy?: string;
  author?: string;
  timestamp?: string;
  createdAt?: string;
  targetDepartmentName?: string;
  department?: string;
  reactions?: { heart: number; like: number } | any;
  comments?: any[];
  commentCount?: number;
}

export default function NotificationCard({
  id,
  type,
  notificationType,
  title,
  content,
  postedBy,
  author,
  timestamp,
  createdAt,
  targetDepartmentName,
  department,
  reactions,
  comments,
  commentCount
}: NotificationCardProps) {
  const displayType = type || (notificationType === 'urgent' ? 'urgent' : notificationType === 'cruise' ? 'cruise' : 'regular');
  const displayAuthor = author || postedBy || 'System';
  const displayTimestamp = timestamp || (createdAt ? new Date(createdAt).toLocaleString() : 'Recently');
  const displayDepartment = department || targetDepartmentName;
  const displayReactions = reactions || { heart: 0, like: 0 };
  const displayCommentCount = commentCount || (comments ? comments.length : 0);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState("");
  const [localReactions, setLocalReactions] = useState(displayReactions);
  const [reacted, setReacted] = useState({ heart: false, like: false });
  const { user } = useUser();

  const canDelete = user && (
    user.role === 'admin' || 
    user.role === 'faculty-governor' || 
    (user.role === 'department-governor' && (user.username === displayAuthor || user.departmentName === displayDepartment))
  );

  const handleReaction = async (reactionType: 'heart' | 'like') => {
    try {
      const response = await fetch(`/api/notifications/${id}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ reactionType }),
      });

      if (response.ok) {
        const updated = await response.json();
        setLocalReactions(updated.reactions || {});
        setReacted(prev => ({ ...prev, [reactionType]: !prev[reactionType] }));
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) return;
    
    try {
      const response = await fetch(`/api/notifications/${id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ content: comment }),
      });

      if (response.ok) {
        setComment("");
        // Reload the page to show the new comment
        window.location.reload();
      }
    } catch (error) {
      console.error('Comment error:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Reload the page to remove the deleted notification
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete notification');
    }
  };

  const typeConfig = {
    urgent: { icon: AlertCircle, color: "text-destructive", emoji: "🚨" },
    regular: { icon: Info, color: "text-foreground", emoji: "" },
    cruise: { icon: Flame, color: "text-foreground", emoji: "✨" }
  };

  const config = typeConfig[displayType as keyof typeof typeConfig];
  const TypeIcon = config.icon;

  return (
    <Card className="hover-elevate">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <TypeIcon className={`w-5 h-5 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight">
                {config.emoji && <span className="mr-1">{config.emoji}</span>}
                {title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {displayAuthor} · {displayTimestamp}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {displayDepartment && (
              <Badge variant="secondary">
                {displayDepartment}
              </Badge>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
                data-testid="button-delete-notification"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed">{content}</p>

        <div className="flex items-center gap-4 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleReaction('heart')}
            className={`gap-1.5 ${reacted.heart ? 'text-destructive' : ''}`}
            data-testid="button-react-heart"
          >
            <Heart className={`w-4 h-4 ${reacted.heart ? 'fill-current' : ''}`} />
            <span className="text-xs">{localReactions.heart}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="gap-1.5"
            data-testid="button-toggle-comments"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{displayCommentCount}</span>
          </Button>
        </div>

        {showComments && (
          <div className="space-y-3 pt-2 border-t">
            {/* Display existing comments */}
            {comments && comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add new comment */}
            <div className="flex gap-2">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px]"
                data-testid="input-comment"
              />
            </div>
            <Button
              size="sm"
              onClick={handleComment}
              data-testid="button-post-comment"
            >
              Post Comment
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}