import { useAuth } from './auth/AuthContext';
import { Footer } from './components/Footer';
import { LoginScreen } from './components/LoginScreen';
import { Workspace } from './Workspace';

/** Gerbang aplikasi: layar login bila belum masuk, ruang kerja pengguna bila sudah. */
export default function App() {
  const { user, owner, logout } = useAuth();
  return (
    <div className="flex min-h-screen flex-col">
      {/* key = owner: setiap pengguna mendapat ruang kerja (dan data) yang benar-benar terpisah. */}
      {user && owner ? (
        <Workspace key={owner} user={user} owner={owner} onLogout={logout} />
      ) : (
        <main className="flex-1">
          <LoginScreen />
        </main>
      )}
      <Footer />
    </div>
  );
}
