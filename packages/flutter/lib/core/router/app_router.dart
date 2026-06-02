import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../features/auth/login_page.dart';
import '../../features/auth/register_page.dart';
import '../../features/auth/verify_email_page.dart';
import '../../features/auth/forgot_password_page.dart';
import '../../features/auth/reset_password_page.dart';
import '../../shared/widgets/app_shell.dart';
import '../../features/dashboard/dashboard_page.dart';
import '../../features/workout/agenda_page.dart';
import '../../features/workout/day_view_page.dart';
import '../../features/workout/history_page.dart';
import '../../features/stats/stats_page.dart';
import '../../features/stats/cardio_page.dart';
import '../../features/routines/routines_page.dart';
import '../../features/routines/routine_editor_page.dart';
import '../../features/nutrition/nutrition_page.dart';
import '../../features/notes/notes_page.dart';
import '../../features/insights/insights_page.dart';
import '../../features/duelos/duelos_page.dart';
import '../../features/config/config_page.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authListenable = _AuthListenable(ref);

  return GoRouter(
    refreshListenable: authListenable,
    redirect: (context, state) {
      final auth = ref.read(authProvider);
      final isLoading = auth.isLoading;
      final isAuthenticated = auth.isAuthenticated;
      final isOnAuthPage = state.matchedLocation.startsWith('/auth');

      if (isLoading) return null;
      if (!isAuthenticated && !isOnAuthPage) return '/auth/login';
      if (isAuthenticated && isOnAuthPage) return '/';
      return null;
    },
    routes: [
      // Rutas públicas de autenticación
      GoRoute(path: '/auth/login',    builder: (_, _) => const LoginPage()),
      GoRoute(path: '/auth/register', builder: (_, _) => const RegisterPage()),
      GoRoute(path: '/auth/verificar-email', builder: (_, _) => const VerifyEmailPage()),
      GoRoute(path: '/auth/olvide-contrasena', builder: (_, _) => const ForgotPasswordPage()),
      GoRoute(path: '/auth/restablecer-contrasena', builder: (_, _) => const ResetPasswordPage()),

      // Shell de la app (bottom nav)
      StatefulShellRoute.indexedStack(
        builder: (_, _, shell) => AppShell(shell: shell),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/',         builder: (_, _) => const DashboardPage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/agenda',
              builder: (_, _) => const AgendaPage(),
              routes: [
                GoRoute(
                  path: ':dayId',
                  builder: (_, s) => DayViewPage(dayId: s.pathParameters['dayId']!),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/rutinas',
              builder: (_, _) => const RoutinesPage(),
              routes: [
                GoRoute(path: 'nueva', builder: (_, _) => const RoutineEditorPage()),
                GoRoute(
                  path: ':routineId',
                  builder: (_, s) => RoutineEditorPage(routineId: s.pathParameters['routineId']),
                ),
              ],
            ),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/stats', builder: (_, _) => const StatsPage()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/nutricion', builder: (_, _) => const NutritionPage()),
          ]),
        ],
      ),

      // Rutas secundarias (sin bottom nav propio)
      GoRoute(path: '/historial', builder: (_, _) => const HistoryPage()),
      GoRoute(path: '/cardio',    builder: (_, _) => const CardioPage()),
      GoRoute(path: '/notas',     builder: (_, _) => const NotesPage()),
      GoRoute(path: '/insights',  builder: (_, _) => const InsightsPage()),
      GoRoute(path: '/duelos',    builder: (_, _) => const DuelosPage()),
      GoRoute(path: '/config',    builder: (_, _) => const ConfigPage()),
    ],
  );
});

// Listenable que dispara GoRouter cuando cambia el estado de auth
class _AuthListenable extends ChangeNotifier {
  _AuthListenable(this._ref) {
    _ref.listen(authProvider, (_, _) => notifyListeners());
  }
  final Ref _ref;
}
