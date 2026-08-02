import 'package:flutter/material.dart';
import 'package:mee_events/theme/app_colors.dart';
import 'package:mee_events/theme/app_spacing.dart';
import 'package:mee_events/theme/app_radius.dart';
import 'package:mee_events/theme/app_typography.dart';

class ChatViewOverlay extends StatelessWidget {
  const ChatViewOverlay({Key? key}) : super(key: key);

  static void show(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (context) => const ChatViewOverlay(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final messages = [
      {'text': 'Hello! I\'m Priya, your event manager for the wedding.', 'isMe': false},
      {'text': 'Hi Priya! We\'re excited about the wedding planning.', 'isMe': true},
      {'text': 'I\'ve reviewed your requirements. The venue at Taj Falaknuma is an excellent choice!', 'isMe': false},
      {'text': 'Can we discuss the decoration options?', 'isMe': true},
    ];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Event Manager', style: TextStyle(color: AppColors.ink, fontSize: 16)),
            Text('Priya - Marketing Manager', style: TextStyle(color: AppColors.muted, fontSize: 12)),
          ],
        ),
        backgroundColor: AppColors.canvas,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.close, color: AppColors.ink),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: messages.length,
              itemBuilder: (context, index) {
                final msg = messages[index];
                final isMe = msg['isMe'] as bool;
                final text = msg['text'] as String;

                return Align(
                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    constraints: const BoxConstraints(maxWidth: 280),
                    margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: isMe ? AppColors.ink : AppColors.surfaceCard,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(AppRadius.lg),
                        topRight: const Radius.circular(AppRadius.lg),
                        bottomLeft: isMe ? const Radius.circular(AppRadius.lg) : Radius.zero,
                        bottomRight: isMe ? Radius.zero : const Radius.circular(AppRadius.lg),
                      ),
                      border: isMe ? null : Border.all(color: AppColors.hairlineSoft),
                    ),
                    child: Text(
                      text,
                      style: AppTypography.bodyMd.copyWith(color: isMe ? AppColors.canvas : AppColors.ink),
                    ),
                  ),
                );
              },
            ),
          ),
          Container(
            color: AppColors.surfaceCard,
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Type a message...',
                      border: OutlineInputBorder(
                        borderRadius: AppRadius.pillAll,
                        borderSide: BorderSide.none,
                      ),
                      filled: true,
                      fillColor: AppColors.canvas,
                      contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                    ),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                const CircleAvatar(
                  radius: 22,
                  backgroundColor: AppColors.ink,
                  child: Icon(Icons.send, color: AppColors.canvas, size: 18),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
