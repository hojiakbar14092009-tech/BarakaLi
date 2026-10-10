import type { CateringServiceId } from '@barakali/shared';
import { create } from 'zustand';

interface RequestSelectionState {
  /** Service type picked on a card; the request form starts with it selected. */
  serviceTypeId: CateringServiceId | null;
  select: (serviceTypeId: CateringServiceId) => void;
}

export const useRequestSelection = create<RequestSelectionState>((set) => ({
  serviceTypeId: null,
  select: (serviceTypeId) => set({ serviceTypeId }),
}));
