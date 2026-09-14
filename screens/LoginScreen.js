import AuthForm from '../components/AuthForm';

export default function LoginScreen({ onDone, onBack, onSignup }) {
  return <AuthForm onDone={onDone} onBack={onBack} onSwitch={onSignup} />;
}
