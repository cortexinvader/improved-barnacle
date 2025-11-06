import UserProfile from '../UserProfile';

export default function UserProfileExample() {
  return (
    <div className="p-6 flex justify-center">
      <UserProfile
        username="Ahmed Hassan"
        phone="+20 123 456 7890"
        regNumber="CS2021-0145"
        role="student"
        department="Computer Engineering"
      />
    </div>
  );
}
