import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';

import styles from './index.module.css';
import { useEffect, useRef } from 'react';
import { BaseDemo } from '../components/BasicDemo';


const HomepageHeader = () => {
  const {siteConfig} = useDocusaurusContext();
  const ref = useRef<HTMLDivElement>(null);

  // useEffect(() => {
  //     if (!ref.current) return;

  //     const app = new BaseDemo(ref.current as HTMLDivElement);
  
  //     return () => {
  //         app.unmount();
  //     }

  // }, []);

  return (
    <div ref={ref} style={{backgroundColor: 'black'}}>
      <header className={clsx('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <Heading as="h1" className="hero__title">
            {siteConfig.title}
          </Heading>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro">
              Fluid Tutorial - 5min ⏱️
            </Link>
          </div>
        </div>
      </header>
    </div>
  );
}

const Home = () => {

  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout
      title={`Hello from ${siteConfig.title}`}
      description="Description will go into a meta tag in <head />"
    >
      <HomepageHeader />
      <main>
        <HomepageFeatures />
      </main>
    </Layout>
  );
};

export default Home;
