import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <title>Meet Div AI</title>
      <meta property="og:title" content="Meet Div AI" />
      <meta
        property="og:description"
        content="Share Your World, Discover His"
      />
      <meta property="og:url" content="https://meetDiv.ai" />
      <meta property="og:image" content="http://meetDiv.ai/meetDivSocial.png" />
      <meta property="og:type" content="website" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Meet Div AI" />
      <meta
        name="twitter:description"
        content="Share Your World, Discover Hers"
      />
      <meta
        name="twitter:image"
        content="http://meetDiv.ai/meetDivSocial.png"
      />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
