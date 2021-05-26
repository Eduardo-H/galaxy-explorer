import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import { useRouter } from 'next/router';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';


interface Post {
  first_publication_date: string | null;
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
}

export default function Post({post}: PostProps) {
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
                      {format(
                        new Date(post.first_publication_date), 'd MMM yyyy', { locale: ptBR }
                      )}
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

export const getStaticProps: GetStaticProps = async context => {
  const prismic = getPrismicClient();
  const { slug } = context.params;
  const response = await prismic.getByUID('post', String(slug), {});

  const post = {
    first_publication_date: response.first_publication_date,
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
      post
    }
  };
};
