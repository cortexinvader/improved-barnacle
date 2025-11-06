import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, MessageSquare, FileText, User, LogOut } from "lucide-react";
import NotificationCard from "./NotificationCard";
import DeveloperWatermark from "./DeveloperWatermark";
import ChatInterface from "./ChatInterface";
import DocumentUpload from "./DocumentUpload";
import UserProfile from "./UserProfile";
import AdminPanel from "./AdminPanel";
import GovernorPostingPanel from "./GovernorPostingPanel";

interface Room {
  id: string;
  name: string;
  type: string;
}

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeView, setActiveView] = useState<'overview' | 'chat' | 'documents' | 'profile' | 'admin' | 'posting'>('overview');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadRooms();
    loadNotifications();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/rooms', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        // Auto-select General room
        const generalRoom = data.find((r: Room) => r.name === 'General');
        if (generalRoom) {
          setSelectedRoom(generalRoom);
        }
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch('/api/notifications', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleRoomSelect = (room: Room) => {
    setSelectedRoom(room);
    setActiveView('chat');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">CIE Faculty Portal</h1>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline">{user.role}</Badge>
            <span className="text-sm">{user.username}</span>
            <Button variant="ghost" size="sm" onClick={onLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <Button
            variant={activeView === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveView('overview')}
          >
            Overview
          </Button>
          <Button
            variant={activeView === 'chat' ? 'default' : 'outline'}
            onClick={() => setActiveView('chat')}
          >
            Chat Rooms
          </Button>
          <Button
            variant={activeView === 'documents' ? 'default' : 'outline'}
            onClick={() => setActiveView('documents')}
          >
            Documents
          </Button>
          <Button
            variant={activeView === 'profile' ? 'default' : 'outline'}
            onClick={() => setActiveView('profile')}
          >
            Profile
          </Button>
          {(user.role === 'admin' || user.role === 'faculty-governor' || user.role === 'department-governor') && (
            <Button
              variant={activeView === 'posting' ? 'default' : 'outline'}
              onClick={() => setActiveView('posting')}
            >
              Post Notice
            </Button>
          )}
          {user.role === 'admin' && (
            <Button
              variant={activeView === 'admin' ? 'default' : 'outline'}
              onClick={() => setActiveView('admin')}
            >
              Admin Panel
            </Button>
          )}
        </div>

        {/* Content */}
        {activeView === 'overview' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {notifications.slice(0, 5).map((notif) => (
                      <NotificationCard key={notif.id} notification={notif} />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat Rooms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <Button
                      key={room.id}
                      variant={selectedRoom?.id === room.id ? 'default' : 'outline'}
                      className="w-full justify-start"
                      onClick={() => handleRoomSelect(room)}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {room.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeView === 'chat' && selectedRoom && (
          <Card className="h-[calc(100vh-200px)]">
            <ChatInterface
              roomName={selectedRoom.name}
              roomId={selectedRoom.id}
              currentUser={user.username}
            />
          </Card>
        )}

        {activeView === 'documents' && (
          <DocumentUpload />
        )}

        {activeView === 'profile' && (
          <UserProfile user={user} />
        )}

        {activeView === 'posting' && (
          <GovernorPostingPanel user={user} />
        )}

        {activeView === 'admin' && user.role === 'admin' && (
          <AdminPanel />
        )}
      </div>

      <DeveloperWatermark />
    </div>
  );
}