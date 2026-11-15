import { create } from 'zustand';

export const useCallStore = create((set) => ({
  incomingCallVisible: false,
  incomingCaller: null,
  setIncomingCall: (visible: boolean, caller: any) => set({ incomingCallVisible: visible, incomingCaller: caller }),
}));
