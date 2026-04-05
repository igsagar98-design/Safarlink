import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../constants/Colors';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  visible,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable
          style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {}}
        >
          <View style={[styles.iconBox, { backgroundColor: colors.warning + '20' }]}>
            <AlertTriangle size={28} color={colors.warning as string} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={onCancel}
              style={[styles.btn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.btnText, { color: colors.primaryForeground }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtn: {
    borderWidth: 0,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ConfirmDialog;
