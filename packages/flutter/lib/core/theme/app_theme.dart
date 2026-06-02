import 'package:flutter/material.dart';

// ── Accent colors (equivalente a los 5 accents del diseño React) ──────────────
enum AccentColor { teal, forest, ocean, ember, violet }

const _accents = {
  AccentColor.teal:   Color(0xFF2DD4BF),
  AccentColor.forest: Color(0xFF4ADE80),
  AccentColor.ocean:  Color(0xFF60A5FA),
  AccentColor.ember:  Color(0xFFFB923C),
  AccentColor.violet: Color(0xFFA78BFA),
};

Color accentSeed(AccentColor a) => _accents[a]!;

// ── Dark theme ────────────────────────────────────────────────────────────────
ThemeData darkTheme(AccentColor accent) {
  final seed = accentSeed(accent);
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    colorSchemeSeed: seed,
    scaffoldBackgroundColor: const Color(0xFF171614),
    cardColor: const Color(0xFF1E1C1A),
    fontFamily: 'Lexend',
    textTheme: _textTheme(Brightness.dark),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFF171614),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF1E1C1A),
      indicatorColor: seed.withValues(alpha: 0.2),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF2A2825),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    ),
  );
}

// ── Light theme ───────────────────────────────────────────────────────────────
ThemeData lightTheme(AccentColor accent) {
  final seed = accentSeed(accent);
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    colorSchemeSeed: seed,
    scaffoldBackgroundColor: const Color(0xFFF5F4F2),
    cardColor: Colors.white,
    fontFamily: 'Lexend',
    textTheme: _textTheme(Brightness.light),
    appBarTheme: const AppBarTheme(
      backgroundColor: Color(0xFFF5F4F2),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: seed.withValues(alpha: 0.15),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
    ),
  );
}

TextTheme _textTheme(Brightness brightness) {
  final base = brightness == Brightness.dark ? Colors.white : const Color(0xFF1A1917);
  return TextTheme(
    displayLarge: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w700),
    headlineLarge: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w600),
    headlineMedium: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w600),
    titleLarge: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w600),
    titleMedium: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w500),
    bodyLarge: TextStyle(fontFamily: 'Lexend', color: base),
    bodyMedium: TextStyle(fontFamily: 'Lexend', color: base),
    labelLarge: TextStyle(fontFamily: 'Lexend', color: base, fontWeight: FontWeight.w500),
  );
}
