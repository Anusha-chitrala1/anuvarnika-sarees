import React, { useEffect, useRef } from 'react';
import { api } from '../lib/api.js';

const SESSION_WINDOW_MS = 30 * 60 * 1000; // 30 minutes
const LAST_VISIT_DATE_KEY = 'av_last_visit_date';
const SESSION_TS_KEY = 'av_session_ts';

function getIstDateString(): string {
  const istOffsetMs = 330 * 60 * 1000;
  return new Date(Date.now() + istOffsetMs).toISOString().slice(0, 10);
}

interface VisitorTrackerProps {
  onVisitorCount?: (count: number) => void;
}

export const VisitorTracker: React.FC<VisitorTrackerProps> = ({ onVisitorCount }) => {
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    try {
      const now = Date.now();
      const todayIst = getIstDateString();
      const lastDate = window.localStorage.getItem(LAST_VISIT_DATE_KEY);
      const lastSessionTsRaw = window.localStorage.getItem(SESSION_TS_KEY);
      const lastSessionTs = lastSessionTsRaw ? Number(lastSessionTsRaw) : 0;

      const isSessionActive = Number.isFinite(lastSessionTs) && now - lastSessionTs < SESSION_WINDOW_MS;
      if (isSessionActive) {
        return;
      }

      const isUniqueToday = lastDate !== todayIst;
      window.localStorage.setItem(SESSION_TS_KEY, String(now));
      if (isUniqueToday) {
        window.localStorage.setItem(LAST_VISIT_DATE_KEY, todayIst);
      }

      api
        .recordVisit(isUniqueToday)
        .then((res) => {
          if (typeof res.totalVisitors === 'number' && onVisitorCount) {
            onVisitorCount(res.totalVisitors);
          }
        })
        .catch(() => {
          // Silently ignore telemetry errors so storefront UX is never affected
        });
    } catch {
      // Ignore storage access errors in strict privacy browsers
    }
  }, [onVisitorCount]);

  return null;
};
