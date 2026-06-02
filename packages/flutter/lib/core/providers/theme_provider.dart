import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_theme.dart';

class ThemeState {
  const ThemeState({
    this.isDark = true,
    this.accent = AccentColor.teal,
  });
  final bool isDark;
  final AccentColor accent;

  ThemeState copyWith({bool? isDark, AccentColor? accent}) => ThemeState(
        isDark: isDark ?? this.isDark,
        accent: accent ?? this.accent,
      );
}

class ThemeNotifier extends Notifier<ThemeState> {
  @override
  ThemeState build() {
    _load();
    return const ThemeState();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final isDark = prefs.getBool('theme_dark') ?? true;
    final accentIndex = prefs.getInt('theme_accent') ?? 0;
    state = ThemeState(
      isDark: isDark,
      accent: AccentColor.values[accentIndex.clamp(0, AccentColor.values.length - 1)],
    );
  }

  Future<void> setDark(bool value) async {
    state = state.copyWith(isDark: value);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('theme_dark', value);
  }

  Future<void> setAccent(AccentColor accent) async {
    state = state.copyWith(accent: accent);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt('theme_accent', accent.index);
  }
}

final themeProvider = NotifierProvider<ThemeNotifier, ThemeState>(
  ThemeNotifier.new,
);

final currentThemeProvider = Provider<ThemeData>((ref) {
  final t = ref.watch(themeProvider);
  return t.isDark ? darkTheme(t.accent) : lightTheme(t.accent);
});

final brightnessProvider = Provider<Brightness>((ref) {
  return ref.watch(themeProvider).isDark ? Brightness.dark : Brightness.light;
});
