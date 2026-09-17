import styles from './brand.module.css';

export function Brand() {
  return (
    <div className={styles.root} aria-label="Class">
      <span className={styles.mark} aria-hidden="true">
        C
      </span>
      <strong>Class</strong>
    </div>
  );
}
