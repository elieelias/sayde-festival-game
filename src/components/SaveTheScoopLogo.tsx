import Image from "next/image";
import styles from "./SaveTheScoopLogo.module.css";

type Props = {
  compact?: boolean;
};

export function SaveTheScoopLogo({ compact = false }: Props) {
  return (
    <div className={`${styles.logo} ${compact ? styles.compact : ""}`}>
      <Image
        className={styles.image}
        src="/save-the-scoop-logo.png"
        alt="Save the Scoop"
        width={1448}
        height={1086}
        priority={!compact}
      />
    </div>
  );
}
