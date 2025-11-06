import ChatMessage from '../ChatMessage';

export default function ChatMessageExample() {
  return (
    <div className="p-6 max-w-2xl space-y-4 bg-background">
      <ChatMessage
        id="1"
        sender="Ahmed Hassan"
        content="Has anyone finished the database assignment yet?"
        timestamp="10:30 AM"
        reactions={{ heart: 2 }}
      />
      
      <ChatMessage
        id="2"
        sender="You"
        content="Yes, I submitted it yesterday. It was challenging but interesting!"
        timestamp="10:32 AM"
        isOwn={true}
        formatting={{ bold: true }}
      />
      
      <ChatMessage
        id="3"
        sender="AI Assistant"
        content="I can help you with database-related questions. Feel free to ask about SQL queries, normalization, or any other topics!"
        timestamp="10:33 AM"
        isAI={true}
      />
      
      <ChatMessage
        id="4"
        sender="Sara Mohamed"
        content="Thanks for the info! I'll work on it tonight."
        timestamp="10:35 AM"
        replyTo="Ahmed's message"
        reactions={{ heart: 1 }}
      />
    </div>
  );
}
