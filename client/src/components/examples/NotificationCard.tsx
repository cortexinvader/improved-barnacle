import NotificationCard from '../NotificationCard';

export default function NotificationCardExample() {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <NotificationCard
        id="1"
        type="urgent"
        title="Final Exam Schedule Released"
        content="The final examination schedule for the current semester has been published. Please check your student portal for detailed timings and locations."
        author="Faculty Governor"
        timestamp="2 hours ago"
        reactions={{ heart: 24, like: 45 }}
        commentCount={8}
      />
      
      <NotificationCard
        id="2"
        type="cruise"
        title="Graduation Ceremony Invitation"
        content="Congratulations to all graduating students! The ceremony will be held on June 15th. Family and friends are welcome to attend."
        author="Dr. Ahmed Hassan"
        timestamp="1 day ago"
        department="Computer Engineering"
        reactions={{ heart: 156, like: 203 }}
        commentCount={42}
      />
    </div>
  );
}
