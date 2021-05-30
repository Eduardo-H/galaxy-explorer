import { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import Head from 'next/head';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useEffect } from 'react';
import { Comments } from '../../components/Comments';

interface PreviewPost {
  title: string;
  slug: string;
}

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  preview: boolean;
  prevPost: PreviewPost | null;
  nextPost: PreviewPost | null;
}

export default function Post({
  post,
  preview,
  prevPost,
  nextPost
}: PostProps): JSX.Element {
  const router = useRouter();
  const readingTime = calculateReadingTime();

  function calculateReadingTime() {
    const words = post.data.content.map(content => {
      return [
        ...content.heading.split(' '), 
        ...content.body.map(body => {
          if (body.text) {
            return [...body.text.split(' ')]
          }
        })
      ];
    }).flat();

    let totalWords = words.flat().length;

    // Um leitor comum lê em média 150 palavras por minuto, logo, se dividirmos
    // o total de palavras por 150, teremos o tempo de leitura em minutos.
    return Math.round(totalWords / 150);
  }
  
  return (
    <>
      {
        router.isFallback 
        ? (
          <p>Carregando...</p>
        ) : (
          <>
            <Head>
              <title>{post.data.title} | Galaxy Explorer</title>
            </Head>

            <header className={styles.header}>
              <img src={post.data.banner.url} alt={post.data.title} />
            </header>
            <main className={commonStyles.contentContainer}>
              <section className={styles.main}>
                <h1>{post.data.title}</h1>
                <div className={styles.articleInfo}>
                  <span>
                    <FiCalendar />
                    <p>
                      {post.first_publication_date}
                    </p>
                  </span>
                  <span>
                    <FiUser />
                    <p>{post.data.author}</p>
                  </span>
                  <span>
                    <FiClock />
                    <p>{readingTime} min</p>
                  </span>
                </div>
                {post.last_publication_date && (
                  <p>{post.last_publication_date}</p>
                )}
              </section>

              <article className={styles.content}>
                {post.data.content.map(content => (
                  <div key={content.heading}>
                    <h2>{content.heading}</h2>

                    <div
                      dangerouslySetInnerHTML={
                        {__html: RichText.asHtml(content.body)}
                      }
                    />
                  </div>
                ))}
              </article>
            </main>
            
            <footer className={`${commonStyles.contentContainer}  ${styles.footer}`}>
              <hr className={styles.divider} />

              <div className={styles.postControllers}>
                  {prevPost && (
                    <div className={styles.previousPost}>
                      <Link href={`/post/${prevPost.slug}`}>
                        <a>{prevPost.title}</a>
                      </Link>
                      <p>Post anterior</p>
                    </div>
                  )}
                  
                  {nextPost && (
                    <div className={styles.nextPost}>
                      <Link href={`/post/${nextPost.slug}`}>
                        <a>{nextPost.title}</a>
                      </Link>
                      <p>Próximo post</p>
                    </div>
                  )}
              </div>

              <Comments />

              {
                preview && (
                  <aside className={commonStyles.exitPreview}>
                    <Link href="/api/exit-preview">
                      <a>Sair do modo Preview</a>
                    </Link>
                  </aside>
                )
              }
            </footer>
          </>
        ) 
      }
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    fetch: [
      'post.title', 'post.subtitle', 'post.author', 
      'post.banner', 'post.content'
    ],
    pageSize: 10
  });

  const paths = posts.results.map(post => {
    return {
      params: {slug: post.uid}
    }
  });

  return {
    paths,
    fallback: 'blocking'
  }
};

export const getStaticProps: GetStaticProps = async ({
  params, 
  preview = false, 
  previewData
}) => {
  const prismic = getPrismicClient();
  const { slug } = params;
  const response = await prismic.getByUID('post', String(slug), {
    ref: previewData?.ref ?? null
  });

  const prevPostResponse = (await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date]'
  })).results[0];

  const nextPostResponse = (await prismic.query([
    Prismic.predicates.at('document.type', 'post')
  ], {
    pageSize: 1,
    after: response.id,
    orderings: '[document.first_publication_date desc]'
  })).results[0];

  const post = {
    first_publication_date: format(
      new Date(response.first_publication_date), 'd MMM yyyy', { locale: ptBR }
    ),
    last_publication_date: response.last_publication_date && format(
      new Date(response.last_publication_date), "'*editado em' d MMM yyyy, 'às' HH:mm", { locale: ptBR }
    ),
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url
      },
      author: response.data.author,
      content: response.data.content.map(content => ({
        heading: content.heading,
        body: [...content.body]
      }))
    },
    uid: response.uid
  };

  return {
    props: {
      post,
      preview,
      prevPost: prevPostResponse ? {
        title: prevPostResponse.data.title,
        slug: prevPostResponse.uid
      } : null,
      nextPost: nextPostResponse ? {
        title: nextPostResponse.data.title,
        slug: nextPostResponse.uid
      } : null
    }
  };
};
