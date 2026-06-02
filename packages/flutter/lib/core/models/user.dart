class User {
  const User({
    required this.id,
    required this.email,
    required this.name,
    this.avatar = '💪',
    this.theme = 'dark',
    this.accentTheme = 'teal',
    this.activeRoutineId,
    this.currentWeek = 1,
    this.emailVerified = false,
    this.settings,
  });

  final String id;
  final String email;
  final String name;
  final String avatar;
  final String theme;
  final String accentTheme;
  final String? activeRoutineId;
  final int currentWeek;
  final bool emailVerified;
  final UserSettings? settings;

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        email: json['email'] as String,
        name: json['name'] as String,
        avatar: json['avatar'] as String? ?? '💪',
        theme: json['theme'] as String? ?? 'dark',
        accentTheme: json['accentTheme'] as String? ?? 'teal',
        activeRoutineId: json['activeRoutineId'] as String?,
        currentWeek: json['currentWeek'] as int? ?? 1,
        emailVerified: json['emailVerified'] as bool? ?? false,
        settings: json['settings'] != null
            ? UserSettings.fromJson(json['settings'] as Map<String, dynamic>)
            : null,
      );
}

class UserSettings {
  const UserSettings({
    this.calorieGoal = 2500,
    this.proteinGoal = 150,
    this.carbGoal = 250,
    this.fatGoal = 80,
    this.waterGoal = 8,
    this.sessionLength = '90-120 min',
    this.goal = 'Definición',
    this.cardioDefault = '20 min',
    this.aiKeySet = false,
    this.aiProvider,
    this.aiModel,
    this.reminderTime,
  });

  final int calorieGoal;
  final int proteinGoal;
  final int carbGoal;
  final int fatGoal;
  final int waterGoal;
  final String sessionLength;
  final String goal;
  final String cardioDefault;
  final bool aiKeySet;
  final String? aiProvider;
  final String? aiModel;
  final String? reminderTime;

  factory UserSettings.fromJson(Map<String, dynamic> json) => UserSettings(
        calorieGoal: json['calorieGoal'] as int? ?? 2500,
        proteinGoal: json['proteinGoal'] as int? ?? 150,
        carbGoal: json['carbGoal'] as int? ?? 250,
        fatGoal: json['fatGoal'] as int? ?? 80,
        waterGoal: json['waterGoal'] as int? ?? 8,
        sessionLength: json['sessionLength'] as String? ?? '90-120 min',
        goal: json['goal'] as String? ?? 'Definición',
        cardioDefault: json['cardioDefault'] as String? ?? '20 min',
        aiKeySet: json['aiKeySet'] as bool? ?? false,
        aiProvider: json['aiProvider'] as String?,
        aiModel: json['aiModel'] as String?,
        reminderTime: json['reminderTime'] as String?,
      );
}
