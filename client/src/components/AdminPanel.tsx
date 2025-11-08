import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Download, Upload, Plus, Trash2, Users, MessageSquare, UserX, Send } from "lucide-react";

interface Room {
  id: string;
  name: string;
  type: "general" | "department" | "custom";
  members: number;
}

export default function AdminPanel() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [newRoomName, setNewRoomName] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [backupStatus, setBackupStatus] = useState('');

  useEffect(() => {
    loadRooms();
    loadUsers();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch('/api/rooms', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', { credentials: 'include' });
      if (response.ok) {
        const allUsers = await response.json();
        // Show all users (students, governors, and admin)
        setUsers(allUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRoomName, type: 'custom' }),
      });

      if (response.ok) {
        setNewRoomName("");
        loadRooms();
      }
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        loadRooms();
      }
    } catch (error) {
      console.error('Error deleting room:', error);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        alert('User deleted successfully');
        loadUsers();
      } else {
        const error = await response.json();
        alert(`Delete failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. Please try again.');
    }
  };

  const handleBackupCredentials = async () => {
    try {
      const response = await fetch('/api/admin/backup');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Backup failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admin_backup.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setBackupStatus('Backup downloaded successfully');
      setTimeout(() => setBackupStatus(''), 3000);
    } catch (error: any) {
      console.error('Backup error:', error);
      setBackupStatus('Backup failed: ' + error.message);
      setTimeout(() => setBackupStatus(''), 3000);
    }
  };

  const handleRestoreCredentials = () => {
    console.log('Restoring credentials from backup...');
  };

  const handleTelegramBackup = async () => {
    try {
      const response = await fetch('/api/admin/telegram-backup', {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setBackupStatus(data.message || 'Backup sent to Telegram successfully');
        setTimeout(() => setBackupStatus(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to send backup to Telegram');
      }
    } catch (error: any) {
      console.error('Telegram backup error:', error);
      setBackupStatus('Telegram backup failed: ' + error.message);
      setTimeout(() => setBackupStatus(''), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Credential Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Backup all user credentials</Label>
              <p className="text-xs text-muted-foreground">
                Download all login credentials to /data/admin_backup.json
              </p>
              <Button
                onClick={handleBackupCredentials}
                className="w-full"
                data-testid="button-backup-credentials"
              >
                <Download className="w-4 h-4 mr-2" />
                Backup Credentials
              </Button>
              {backupStatus && (
                <p className={`text-sm ${backupStatus.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
                  {backupStatus}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Restore credentials from backup</Label>
              <p className="text-xs text-muted-foreground">
                On app restart, credentials are auto-restored from backup file
              </p>
              <Button
                onClick={handleRestoreCredentials}
                variant="outline"
                className="w-full"
                data-testid="button-restore-credentials"
              >
                <Upload className="w-4 h-4 mr-2" />
                Manual Restore
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Room Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Create New Room</Label>
              <div className="flex gap-2">
                <Input
                  id="room-name"
                  placeholder="Room name"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  data-testid="input-room-name"
                />
                <Button
                  onClick={handleCreateRoom}
                  disabled={!newRoomName.trim()}
                  data-testid="button-create-room"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Telegram Backup
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Initiate an immediate backup of all credentials and send it to the configured Telegram chat.
            </p>
            <Button
              onClick={handleTelegramBackup}
              className="w-full"
              data-testid="button-telegram-backup"
            >
              <Send className="w-4 h-4 mr-2" />
              Send Backup to Telegram
            </Button>
            {backupStatus && (
              <p className={`text-sm ${backupStatus.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
                {backupStatus}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">{user.username}</h4>
                    <p className="text-xs text-muted-foreground">
                      {user.role} • {user.departmentName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                  {user.role !== "admin" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      data-testid={`button-delete-user-${user.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Chat Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <h4 className="font-medium text-sm">{room.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {room.members} members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={room.type === "general" ? "default" : "secondary"}>
                    {room.type}
                  </Badge>
                  {room.type === "custom" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRoom(room.id)}
                      data-testid={`button-delete-room-${room.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}