import AuthPage from '../AuthPage';

export default function AuthPageExample() {
  return (
    <AuthPage 
      onLogin={(username, role) => console.log('Login:', username, role)}
      onShowTutorial={() => console.log('Show tutorial')}
    />
  );
}
