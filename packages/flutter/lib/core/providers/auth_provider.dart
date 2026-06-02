import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import '../api/client.dart';

class AuthState {
  const AuthState({this.user, this.isLoading = false});
  final User? user;
  final bool isLoading;
  bool get isAuthenticated => user != null;
}

class AuthNotifier extends Notifier<AuthState> {
  static const _storage = FlutterSecureStorage();

  @override
  AuthState build() {
    _restore();
    return const AuthState(isLoading: true);
  }

  Dio get _dio => ref.read(dioProvider);

  Future<void> _restore() async {
    try {
      final token = await _storage.read(key: 'access_token');
      if (token == null) {
        state = const AuthState();
        return;
      }
      final res = await _dio.get('/users/me');
      state = AuthState(user: User.fromJson(res.data as Map<String, dynamic>));
    } catch (_) {
      state = const AuthState();
    }
  }

  Future<void> login(String email, String password) async {
    final res = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    await _saveTokens(res.data as Map<String, dynamic>);
  }

  Future<void> register(String name, String email, String password) async {
    final res = await _dio.post('/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
    });
    await _saveTokens(res.data as Map<String, dynamic>);
  }

  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } catch (_) {}
    await _storage.deleteAll();
    state = const AuthState();
  }

  Future<void> refreshUser() async {
    try {
      final res = await _dio.get('/users/me');
      state = AuthState(user: User.fromJson(res.data as Map<String, dynamic>));
    } catch (_) {}
  }

  Future<void> _saveTokens(Map<String, dynamic> data) async {
    await _storage.write(key: 'access_token', value: data['accessToken'] as String);
    await _storage.write(key: 'refresh_token', value: data['refreshToken'] as String);
    final user = User.fromJson(data['user'] as Map<String, dynamic>);
    state = AuthState(user: user);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

final dioProvider = Provider<Dio>((ref) => createDioClient());
