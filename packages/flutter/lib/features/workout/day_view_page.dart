import 'package:flutter/material.dart';

class DayViewPage extends StatelessWidget {
  const DayViewPage({super.key, required this.dayId});
  final String dayId;
  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: Text('Día $dayId')), body: const Center(child: Text('TODO')));
}
