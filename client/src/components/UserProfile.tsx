import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Hash, Building2, User, MessageSquare } from "lucide-react";

interface UserProfileProps {
  username: string;
  phone: string;
  regNumber?: string;
  role: "student" | "department-governor" | "faculty-governor" | "admin";
  department: string;
  canMessage?: boolean;
}

export default function UserProfile({
  username,
  phone,
  regNumber,
  role,
  department,
  canMessage = true
}: UserProfileProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleLabels = {
    "student": "Student",
    "department-governor": "Department Governor",
    "faculty-governor": "Faculty Governor",
    "admin": "Admin"
  };

  return (
    <Card className="max-w-md">
      <CardHeader className="text-center space-y-4">
        <div className="flex justify-center">
          <Avatar className="w-24 h-24">
            <AvatarFallback className="text-2xl font-semibold">
              {getInitials(username)}
            </AvatarFallback>
          </Avatar>
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{username}</h2>
          <Badge variant={role === "admin" ? "default" : "secondary"}>
            {roleLabels[role]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Department:</span>
            <span>{department}</span>
          </div>
          
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Phone:</span>
            <span>{phone}</span>
          </div>
          
          {regNumber && (
            <div className="flex items-center gap-3 text-sm">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">Reg Number:</span>
              <span>{regNumber}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-sm">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Username:</span>
            <span className="font-mono">{username}</span>
          </div>
        </div>
        
        {canMessage && (
          <Button className="w-full mt-4" data-testid="button-send-message">
            <MessageSquare className="w-4 h-4 mr-2" />
            Send Message
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
