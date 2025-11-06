import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Info, Flame, Send } from "lucide-react";

interface GovernorPostingPanelProps {
  role: "faculty" | "department";
  department?: string;
}

export default function GovernorPostingPanel({ role, department }: GovernorPostingPanelProps) {
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"urgent" | "regular" | "cruise">("regular");
  const [targetDepartment, setTargetDepartment] = useState("");

  const postTypes = [
    { value: "urgent", label: "Urgent", icon: AlertCircle, color: "text-destructive" },
    { value: "regular", label: "Regular", icon: Info, color: "text-foreground" },
    { value: "cruise", label: "Cruise", icon: Flame, color: "text-foreground" }
  ];

  const handlePost = async () => {
    console.log('Posting:', { content, postType, targetDepartment, role });
    
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: "Notification",
          content,
          notificationType: postType,
          targetDepartmentName: targetDepartment || null,
        }),
      });

      if (response.ok) {
        setContent("");
        setPostType("regular");
        setTargetDepartment("");
        // Refresh the page or show success message
        window.location.reload();
      } else {
        const error = await response.json();
        console.error('Failed to post notification:', error);
        alert('Failed to post notification: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error posting notification:', error);
      alert('Error posting notification. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Create Notification</CardTitle>
          <Badge variant="secondary">
            {role === "faculty" ? "Faculty Governor" : `${department} Governor`}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Notification Type</Label>
          <div className="flex gap-2">
            {postTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.value}
                  variant={postType === type.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPostType(type.value as typeof postType)}
                  className="flex-1"
                  data-testid={`button-type-${type.value}`}
                >
                  <Icon className={`w-4 h-4 mr-1 ${postType === type.value ? '' : type.color}`} />
                  {type.label}
                </Button>
              );
            })}
          </div>
        </div>

        {role === "faculty" && (
          <div className="space-y-2">
            <Label htmlFor="target-dept">Target Department (Optional)</Label>
            <Select value={targetDepartment} onValueChange={setTargetDepartment}>
              <SelectTrigger id="target-dept" data-testid="select-target-department">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="computer-engineering">Computer Engineering</SelectItem>
                <SelectItem value="information-systems">Information Systems</SelectItem>
                <SelectItem value="software-engineering">Software Engineering</SelectItem>
                <SelectItem value="network-engineering">Network Engineering</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="content">Notification Content</Label>
          <Textarea
            id="content"
            placeholder="Write your notification here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px]"
            data-testid="input-notification-content"
          />
          <p className="text-xs text-muted-foreground">
            You can use emojis: 🎓 📚 ⚠️ ✨ 🔔
          </p>
        </div>

        <Button
          onClick={handlePost}
          disabled={!content.trim()}
          className="w-full"
          data-testid="button-post-notification"
        >
          <Send className="w-4 h-4 mr-2" />
          Post Notification
        </Button>
      </CardContent>
    </Card>
  );
}
