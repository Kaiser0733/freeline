<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  exclude-result-prefixes="xsl">

  <xsl:output method="html" version="4.0" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="color-scheme" content="dark"/>
        <title>Freeline alerts</title>
        <style>
          :root {
            --ground: #0b1210;
            --panel: #0f1715;
            --ink: #e9e3d4;
            --ink-2: #b8af9c;
            --ink-3: #948c7b;
            --brass: #d2a869;
            --rule: rgba(233, 227, 212, 0.13);
            --serif: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif;
            --sans: "Helvetica Neue", "Segoe UI", system-ui, sans-serif;
          }
          body { margin: 0; background: var(--ground); color: var(--ink); font: 400 14px/1.6 var(--sans); }
          .shell { max-width: 760px; margin: 0 auto; padding: 40px 20px 56px; }
          .brand { font: 400 22px/1 var(--serif); letter-spacing: 0.2em; }
          .brand a { color: var(--ink); text-decoration: none; }
          .frame { height: 1px; background: var(--rule); margin: 18px 0 0; }
          h1 { font: 400 34px/1.1 var(--serif); letter-spacing: 0.01em; margin: 28px 0 0; }
          .lede { margin: 12px 0 0; font-size: 15px; color: var(--ink-2); max-width: 62ch; }
          .howto { margin: 16px 0 0; font-size: 14px; color: var(--ink-2); max-width: 62ch; }
          .howto a, .foot a { color: var(--brass); text-decoration: none; border-bottom: 1px solid transparent; }
          .howto a:hover, .foot a:hover { border-bottom-color: var(--brass); }
          .feedurl { display: block; margin: 10px 0 0; padding: 10px 12px; border: 1px solid var(--rule); background: var(--panel); color: var(--ink); font: 400 12.5px/1.5 var(--sans); overflow-wrap: anywhere; }
          .list { list-style: none; margin: 24px 0 0; padding: 0; border-bottom: 1px solid var(--rule); }
          .item { padding: 14px 0; border-top: 1px solid var(--rule); }
          .item a { color: var(--brass); font: 400 17px/1.35 var(--serif); text-decoration: none; border-bottom: 1px solid transparent; }
          .item a:hover { border-bottom-color: var(--brass); }
          .date { display: block; margin-top: 4px; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-3); }
          .foot { margin-top: 28px; font-size: 13px; color: var(--ink-2); }
        </style>
      </head>
      <body>
        <div class="shell">
          <div class="brand"><a href="https://kaiser0733.github.io/freeline/">FREELINE</a></div>
          <div class="frame"></div>
          <h1>Freeline alerts</h1>
          <p class="lede"><xsl:value-of select="/rss/channel/description"/></p>
          <p class="howto">This page is an RSS feed. To get these alerts in an app, copy this page's address into any RSS reader. <a href="alerts.html">How alerts work</a>.</p>
          <code class="feedurl">https://kaiser0733.github.io/freeline/feed.xml</code>
          <ul class="list">
            <xsl:for-each select="/rss/channel/item">
              <li class="item">
                <a href="{link}"><xsl:value-of select="title"/></a>
                <span class="date"><xsl:call-template name="nicedate"><xsl:with-param name="raw" select="pubDate"/></xsl:call-template></span>
              </li>
            </xsl:for-each>
          </ul>
          <p class="foot"><a href="https://kaiser0733.github.io/freeline/">Back to the live board</a></p>
        </div>
      </body>
    </html>
  </xsl:template>

  <xsl:template name="nicedate">
    <xsl:param name="raw"/>
    <xsl:value-of select="substring($raw, 6, 2)"/>
    <xsl:text> </xsl:text>
    <xsl:value-of select="substring($raw, 9, 3)"/>
    <xsl:text> </xsl:text>
    <xsl:value-of select="substring($raw, 13, 4)"/>
  </xsl:template>

</xsl:stylesheet>
