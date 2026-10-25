import React, { useEffect, useState } from 'react';
import CustomAlert from '../components/CustomAlert';

let showAlertFn: any = null;

export function showAlert(config: { title: string, message?: string, confirmText?: string, onConfirm?: () => void, isDestructive?: boolean }) {
  if (showAlertFn) showAlertFn(config);
}

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    showAlertFn = (newConfig: any) => {
      setConfig(newConfig);
      setVisible(true);
    };
  }, []);

  return (
    <>
      {children}
      <CustomAlert
        visible={visible}
        title={config.title}
        message={config.message}
        confirmText={config.confirmText || 'DELETE'}
        isDestructive={config.isDestructive !== false}
        onCancel={() => setVisible(false)}
        onConfirm={() => {
          setVisible(false);
          if (config.onConfirm) config.onConfirm();
        }}
      />
    </>
  );
}
