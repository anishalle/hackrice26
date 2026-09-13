import AuthForm from '../components/AuthForm';

export default function SignupScreen({ onDone, onBack, onLogin }) {
  return <AuthForm signup onDone={onDone} onBack={onBack} onSwitch={onLogin} />;
}
