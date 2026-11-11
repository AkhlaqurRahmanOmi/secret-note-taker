import { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth';
import { AuthPage } from '../pages/auth-page';
import { NoteEditorRoute } from '../pages/note-editor';
import { NoNoteSelected, NotesPage } from '../pages/notes-page';
import { Shell } from '../pages/shell';
import { UsersPage } from '../pages/users-page';

function SignedIn({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/notes" replace />;
  return children;
}

function SignedOut({ children }: { children: ReactNode }) {
  return useAuth().user ? <Navigate to="/notes" replace /> : children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<SignedOut><AuthPage mode="login" /></SignedOut>} />
      <Route path="/register" element={<SignedOut><AuthPage mode="register" /></SignedOut>} />
      <Route element={<SignedIn><Shell /></SignedIn>}>
        <Route path="/notes" element={<NotesPage />}>
          <Route index element={<NoNoteSelected />} />
          <Route path=":id" element={<NoteEditorRoute />} />
        </Route>
        <Route path="/admin/users" element={<SignedIn admin><UsersPage /></SignedIn>} />
      </Route>
      <Route path="*" element={<Navigate to="/notes" replace />} />
    </Routes>
  );
}

export default App;
