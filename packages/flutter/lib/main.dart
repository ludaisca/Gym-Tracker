import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'core/router/app_router.dart';
import 'core/providers/theme_provider.dart';
import 'core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  runApp(const ProviderScope(child: GymTrackerApp()));
}

class GymTrackerApp extends ConsumerWidget {
  const GymTrackerApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    final theme = ref.watch(currentThemeProvider);
    final isDark = ref.watch(themeProvider).isDark;

    return MaterialApp.router(
      title: 'Gym Tracker',
      theme: isDark ? theme : lightThemeData(ref),
      darkTheme: theme,
      themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}

// Evita pasar el tema dos veces — simplifica leyendo el provider correcto
ThemeData lightThemeData(WidgetRef ref) {
  final accent = ref.read(themeProvider).accent;
  return lightTheme(accent);
}
