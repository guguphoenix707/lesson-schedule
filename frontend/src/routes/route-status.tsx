import type { ReactNode } from 'react';
import styles from './route-status.module.css';

export function RouteStatus({ children }: { children: ReactNode }) {
  return <div className={styles.status}>{children}</div>;
}
