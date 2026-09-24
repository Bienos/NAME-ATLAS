import { AtlasField } from "../components/AtlasField";
import { NameSearch } from "../components/NameSearch";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";
import styles from "./page.module.css";

/**
 * Landing — visual system §39 screen 01. A small wordmark; a large serif
 * line; the surname field as the second-largest object; open Paper; an
 * extremely subtle Atlas Thread in the lower right. User focus: the input.
 */
export default function HomePage() {
  return (
    <div className={styles.page} data-landing="">
      <SiteHeader />
      <main id="main" className={styles.stage}>
        <h1 className={styles.headline}>
          Every surname <em>begins somewhere.</em>
        </h1>
        <p className={styles.lede}>
          See what Poland&rsquo;s official register records about a surname &mdash; with the source
          and date behind every figure, and an honest blank wherever the evidence runs out.
        </p>
        <div className={styles.search}>
          <NameSearch autoFocus />
        </div>
        <div className={styles.field}>
          <AtlasField />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
