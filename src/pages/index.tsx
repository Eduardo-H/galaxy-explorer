import { GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import { getPrismicClient } from '../services/prismic';
import Prismic from '@prismicio/client';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiUser } from "react-icons/fi";

import commonStyles from '../styles/common.module.scss';
import styles from './home.module.scss';
import { useState } from 'react';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    author: string;
  };
}

interface PostPagination {
  next_page: string;
  results: Post[];
}

interface HomeProps {
  postsPagination: PostPagination;
  preview: boolean;
}

export default function Home({
  postsPagination, preview
}: HomeProps): JSX.Element {
  const [posts, setPosts] = useState<Post[]>(postsPagination.results);
  const [nextPage, setNextPage] = useState(postsPagination.next_page);

  async function handleLoadButtonClick() {
    const response = await fetch(nextPage)
      .then(response => response.json())
      .then(data => data);
    
    const newPosts = [];
    response.results.map(post => {
      newPosts.push({
        uid: post.uid,
        first_publication_date: post.first_publication_date,
        data: {
          title: post.data.title,
          subtitle: post.data.subtitle,
          author: post.data.author
        }
      });
    });

    setPosts([...posts, ...newPosts]);
    setNextPage(response.next_page);
  }

  return (
    <>
      <Head>
          <title>Home | Galaxy Explorer</title>
      </Head>
      
      <main className={commonStyles.postsContainer}>
        <div className={styles.post}>
          { posts.map(post => (
            <Link href={`/post/${post.uid}`} key={post.uid}>
              <a>
                <strong>{post.data.title}</strong>
                <p>{post.data.subtitle}</p>

                <span className={styles.publicationDate}>
                  <FiCalendar />
                  <span>
                    {format(
                      new Date(post.first_publication_date), 'd MMM yyyy', { locale: ptBR }
                    )}
                  </span>
                </span>
                
                <span className={styles.author}>
                  <FiUser />
                  <span>{post.data.author}</span>
                </span>
              </a>
            </Link>  
          )) }

          { 
            nextPage && (
              <div className={styles.loadMore}>
                <button onClick={handleLoadButtonClick}>
                  Carregar mais posts
                </button>
              </div>
            )
          }

          
        </div>
        {
          preview && (
            <aside className={commonStyles.exitPreview}>
              <Link href="/api/exit-preview">
                <a>Sair do modo Preview</a>
              </Link>
            </aside>
          )
        }
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({
  preview = false,
  previewData
}) => {
  const prismic = getPrismicClient();
  const postsResponse = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    fetch: [
      'post.title', 'post.subtitle', 'post.author', 
      'post.banner', 'post.content'
    ],
    pageSize: 4,
    orderings: '[document.first_publication_date desc]',
    ref: previewData?.ref ?? null
  });

  const posts = postsResponse.results.map(post => {
    return {
      uid: post.uid,
      first_publication_date: post.first_publication_date,
      data: {
        title: post.data.title,
        subtitle: post.data.subtitle,
        author: post.data.author,
      }
    }
  });

  return {
    props: {
      postsPagination: {
        next_page: postsResponse.next_page,
        results: posts
      },
      preview
    }
  }
};