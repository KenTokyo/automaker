import { useEffect, useState } from 'react';
import {
  DEFAULT_SIDEBAR_WIDTH,
  LEFT_OPEN_STORAGE_KEY,
  LEFT_WIDTH_STORAGE_KEY,
  RIGHT_OPEN_STORAGE_KEY,
  RIGHT_WIDTH_STORAGE_KEY,
  readStoredBoolean,
  readStoredWidth,
} from '../components/chat-view-utils';

export type SidebarTab = 'history' | 'overview';

const SIDEBAR_TAB_STORAGE_KEY = 'automaker:chat:v2:sidebar-tab';

function readStoredSidebarTab(): SidebarTab {
  try {
    const raw = window.localStorage.getItem(SIDEBAR_TAB_STORAGE_KEY);
    if (raw === 'history' || raw === 'overview') return raw;
  } catch {
    // ignore
  }
  return 'history';
}

export function useChatPanelPreferences() {
  const [leftOpen, setLeftOpen] = useState(() => readStoredBoolean(LEFT_OPEN_STORAGE_KEY, true));
  const [rightOpen, setRightOpen] = useState(() =>
    readStoredBoolean(RIGHT_OPEN_STORAGE_KEY, false)
  );
  const [leftWidth, setLeftWidth] = useState(() =>
    readStoredWidth(LEFT_WIDTH_STORAGE_KEY, DEFAULT_SIDEBAR_WIDTH)
  );
  const [rightWidth, setRightWidth] = useState(() =>
    readStoredWidth(RIGHT_WIDTH_STORAGE_KEY, DEFAULT_SIDEBAR_WIDTH)
  );
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>(readStoredSidebarTab);

  useEffect(() => {
    window.localStorage.setItem(LEFT_OPEN_STORAGE_KEY, String(leftOpen));
  }, [leftOpen]);

  useEffect(() => {
    window.localStorage.setItem(RIGHT_OPEN_STORAGE_KEY, String(rightOpen));
  }, [rightOpen]);

  useEffect(() => {
    window.localStorage.setItem(LEFT_WIDTH_STORAGE_KEY, String(leftWidth));
  }, [leftWidth]);

  useEffect(() => {
    window.localStorage.setItem(RIGHT_WIDTH_STORAGE_KEY, String(rightWidth));
  }, [rightWidth]);

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_TAB_STORAGE_KEY, activeSidebarTab);
  }, [activeSidebarTab]);

  return {
    leftOpen,
    rightOpen,
    leftWidth,
    rightWidth,
    activeSidebarTab,
    setLeftOpen,
    setRightOpen,
    setLeftWidth,
    setRightWidth,
    setActiveSidebarTab,
  };
}
