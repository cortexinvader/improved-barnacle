import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, Hash, Building2, User } from "lucide-react";

interface UserProfileDialogProps {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserProfileDialog({
  username,
  open,
  onOpenChange,
}: UserProfileDialogProps) {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && username) {
      loadUserProfile();
    }
  }, [open, username]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/profile/${username}`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const roleLabels: Record<string, string> = {
    student: "Student",
    "department-governor": "Department Governor",
    "faculty-governor": "Faculty Governor",
    admin: "Admin",
  };

  if (!userData && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>User Profile</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : userData ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <Avatar className="w-24 h-24">
                <AvatarFallback className="text-2xl font-semibold">
                  {getInitials(userData.username)}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-2">
                <h2 className="text-2xl font-bold">{userData.username}</h2>
                <Badge
                  variant={userData.role === "admin" ? "default" : "secondary"}
                >
                  {roleLabels[userData.role] || userData.role}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Department:</span>
                <span>{userData.departmentName}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span>{userData.phone}</span>
              </div>

              {userData.regNumber && (
                <div className="flex items-center gap-3 text-sm">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Reg Number:</span>
                  <span>{userData.regNumber}</span>
                </div>
              )}

              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Username:</span>
                <span className="font-mono">{userData.username}</span>
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
