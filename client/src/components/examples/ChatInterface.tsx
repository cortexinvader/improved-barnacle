import ChatInterface from '../ChatInterface';

export default function ChatInterfaceExample() {
  return (
    <div className="h-screen">
      <ChatInterface roomName="General Chat" currentUser="You" />
    </div>
  );
}
