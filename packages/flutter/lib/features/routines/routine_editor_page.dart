import 'package:flutter/material.dart';

class RoutineEditorPage extends StatelessWidget {
  const RoutineEditorPage({super.key, this.routineId});
  final String? routineId;
  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: Text(routineId == null ? 'Nueva rutina' : 'Editar rutina')), body: const Center(child: Text('TODO')));
}
