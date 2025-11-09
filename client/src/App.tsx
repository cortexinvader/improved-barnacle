import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import AuthPage from "@/components/AuthPage";
import SignupTutorial from "@/components/SignupTutorial";
import Dashboard from "@/components/Dashboard";
import ChatInterface from "@/components/ChatInterface";
import DocumentUpload from "@/components/DocumentUpload";
import UserProfile from "@/components/UserProfile";
import GovernorPostingPanel from "@/components/GovernorPostingPanel";
import AdminPanel from "@/components/AdminPanel";
import DeveloperWatermark from "@/components/DeveloperWatermark";
import NotificationCard from "@/components/NotificationCard";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, MessageSquare, FileText, User, LogOut, Settings } from "lucide-react";
import { useAuth, useLogout } from "@/lib/auth";

interface Room {
  id: string;
  name: string;
  type: string;
}

interface Notification {
  id: string;
  type: string;
  notificationType: string;
  title: string;
  content: string;
  postedBy: string;
  targetDepartmentName?: string;
  reactions: any;
  comments: any[];
  createdAt: string;
}

function Router() {
  const { data: user, isLoading } = useAuth();
  const logoutMutation = useLogout();
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentPage, setCurrentPage] = useState<"dashboard" | "chat" | "documents" | "profile" | "admin" | "governor">("dashboard");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setCurrentPage("dashboard");
  };

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/rooms', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
        const generalRoom = data.find((r: Room) => r.name === 'General');
        if (generalRoom && !selectedRoom) {
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

  useEffect(() => {
    if (user) {
      loadRooms();
      loadNotifications();
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { icon: Bell, label: "Dashboard", page: "dashboard" as const },
    { icon: MessageSquare, label: "Chat", page: "chat" as const },
    { icon: FileText, label: "Documents", page: "documents" as const },
    { icon: User, label: "Profile", page: "profile" as const },
  ];

  if (!user) {
    return (
      <>
        <AuthPage
          onShowTutorial={() => setShowTutorial(true)}
        />
        <SignupTutorial
          open={showTutorial}
          onClose={() => setShowTutorial(false)}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">CIE Faculty Portal</h1>
            <p className="text-xs text-muted-foreground">{user.departmentName}</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">{user.role}</Badge>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r bg-card min-h-[calc(100vh-57px)] p-4">
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.page}
                  variant={currentPage === item.page ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setCurrentPage(item.page)}
                  data-testid={`nav-${item.page}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              );
            })}

            {(user.role === "department-governor" || user.role === "faculty-governor") && (
              <Button
                variant={currentPage === "governor" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentPage("governor")}
                data-testid="nav-governor"
              >
                <Bell className="w-4 h-4 mr-2" />
                Post Notification
              </Button>
            )}

            {user.role === "admin" && (
              <Button
                variant={currentPage === "admin" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setCurrentPage("admin")}
                data-testid="nav-admin"
              >
                <Settings className="w-4 h-4 mr-2" />
                Admin Panel
              </Button>
            )}
          </nav>
        </aside>

        <main className="flex-1 p-6">
          <div className="max-w-6xl mx-auto">
            {currentPage === "dashboard" && (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold">Welcome, {user.username}!</h2>
                <p className="text-muted-foreground">
                  Stay updated with the latest notifications and announcements
                </p>
                <div className="space-y-4 mt-6">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <NotificationCard
                        key={notif.id}
                        id={notif.id}
                        type={notif.notificationType as any}
                        notificationType={notif.notificationType}
                        title={notif.title}
                        content={notif.content}
                        postedBy={notif.postedBy}
                        createdAt={notif.createdAt}
                        targetDepartmentName={notif.targetDepartmentName}
                        reactions={notif.reactions}
                        comments={notif.comments}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No notifications yet. Check back later for updates.
                    </p>
                  )}
                </div>
              </div>
            )}

            {currentPage === "chat" && (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {rooms.map((room) => (
                    <Button
                      key={room.id}
                      variant={selectedRoom?.id === room.id ? "default" : "outline"}
                      onClick={() => setSelectedRoom(room)}
                      size="sm"
                      data-testid={`button-room-${room.id}`}
                    >
                      {room.name}
                    </Button>
                  ))}
                </div>
                {selectedRoom ? (
                  <div className="h-[calc(100vh-200px)] border rounded-lg overflow-hidden">
                    <ChatInterface 
                      roomId={selectedRoom.id}
                      roomName={selectedRoom.name} 
                      currentUser={user.username} 
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[calc(100vh-200px)] border rounded-lg">
                    <p className="text-muted-foreground">Select a chat room to start messaging</p>
                  </div>
                )}
              </div>
            )}

            {currentPage === "documents" && <DocumentUpload />}

            {currentPage === "profile" && (
              <div className="flex justify-center">
                <UserProfile
                  username={user.username}
                  phone={user.phone}
                  regNumber={user.regNumber}
                  role={user.role}
                  department={user.departmentName}
                  canMessage={false}
                />
              </div>
            )}

            {currentPage === "governor" && (user.role === "department-governor" || user.role === "faculty-governor") && (
              <div className="max-w-2xl mx-auto">
                <GovernorPostingPanel
                  role={user.role === "faculty-governor" ? "faculty" : "department"}
                  department={user.departmentName}
                />
              </div>
            )}

            {currentPage === "admin" && user.role === "admin" && <AdminPanel />}
          </div>
        </main>
      </div>

      <DeveloperWatermark />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;