import PrivateRoute from '@/components/PrivateRoute';

export default function ProtectedLayout({ children }) {
  return (
    <PrivateRoute>
      {children}
    </PrivateRoute>
  );
}
