import Dashboard from '../Dashboard';

export default function DashboardExample() {
  return (
    <Dashboard
      user={{
        username: "Ahmed Hassan",
        role: "Student",
        department: "Computer Engineering"
      }}
      onNavigate={(page) => console.log('Navigate to:', page)}
      onLogout={() => console.log('Logout')}
    />
  );
}
