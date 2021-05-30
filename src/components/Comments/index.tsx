import { useEffect } from 'react';

const addUtterancesScript = (
  parentElement: HTMLElement,
  repo: string,
  issueTerm: string,
  theme: string,
  isIssueNumber: boolean
): void => {
  const script = document.createElement('script');
  script.setAttribute('src', 'https://utteranc.es/client.js');
  script.setAttribute('crossorigin', 'anonymous');
  script.setAttribute('async', 'true');
  script.setAttribute('repo', repo);

  if (isIssueNumber) {
    script.setAttribute('issue-number', issueTerm);
  } else {
    script.setAttribute('issue-term', issueTerm);
  }

  script.setAttribute('theme', theme);

  parentElement.appendChild(script);
};

export function Comments (): JSX.Element  {
  const repo = 'Eduardo-H/galaxy-explorer-comments';
  const theme = 'github-dark';
  const issueTerm = 'pathname';

  useEffect(() => {
    const commentsBox = document.getElementById('commentsBox');

    if (!commentsBox) {
      return;
    }

    const utterances = document.getElementsByClassName('utterances')[0];

    if (utterances) {
      utterances.remove();
    }

    addUtterancesScript(commentsBox, repo, issueTerm, theme, false);
  });

  return <div id="commentsBox" />;
};