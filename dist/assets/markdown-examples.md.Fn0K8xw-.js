import{_ as a,c as n,o as t,af as e}from"./chunks/framework.D5l_65jD.js";const m=JSON.parse('{"title":"Markdown Extension Examples","description":"","frontmatter":{},"headers":[],"relativePath":"markdown-examples.md","filePath":"markdown-examples.md"}'),i={name:"markdown-examples.md"};function o(l,s,r,p,d,c){return t(),n("div",null,[...s[0]||(s[0]=[e(`<h1 id="markdown-extension-examples" tabindex="-1">Markdown Extension Examples <a class="header-anchor" href="#markdown-extension-examples" aria-label="Permalink to “Markdown Extension Examples”">​</a></h1><p>This page demonstrates some of the built-in markdown extensions provided by VitePress.</p><h2 id="syntax-highlighting" tabindex="-1">Syntax Highlighting <a class="header-anchor" href="#syntax-highlighting" aria-label="Permalink to “Syntax Highlighting”">​</a></h2><p>VitePress provides Syntax Highlighting powered by <a href="https://github.com/shikijs/shiki" target="_blank" rel="noreferrer">Shiki</a>, with additional features like line-highlighting:</p><p><strong>Input</strong></p><div class="language-md"><button title="Copy Code" class="copy"></button><span class="lang">md</span><pre class="hljs"><code><span class="hljs-code">\`\`\`js{4}
export default {
  data () {
    return {
      msg: &#39;Highlighted!&#39;
    }
  }
}
\`\`\`</span>
</code></pre></div><p><strong>Output</strong></p><div class="language-js"><button title="Copy Code" class="copy"></button><span class="lang">js</span><pre class="hljs"><code><span class="hljs-keyword">export</span> <span class="hljs-keyword">default</span> {
  <span class="hljs-title function_">data</span> () {
    <span class="hljs-keyword">return</span> {
      <span class="hljs-attr">msg</span>: <span class="hljs-string">&#39;Highlighted!&#39;</span>
    }
  }
}
</code></pre></div><h2 id="custom-containers" tabindex="-1">Custom Containers <a class="header-anchor" href="#custom-containers" aria-label="Permalink to “Custom Containers”">​</a></h2><p><strong>Input</strong></p><div class="language-md"><button title="Copy Code" class="copy"></button><span class="lang">md</span><pre class="hljs"><code>::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::
</code></pre></div><p><strong>Output</strong></p><div class="info custom-block"><p class="custom-block-title custom-block-title-default">INFO</p><p>This is an info box.</p></div><div class="tip custom-block"><p class="custom-block-title custom-block-title-default">TIP</p><p>This is a tip.</p></div><div class="warning custom-block"><p class="custom-block-title custom-block-title-default">WARNING</p><p>This is a warning.</p></div><div class="danger custom-block"><p class="custom-block-title custom-block-title-default">DANGER</p><p>This is a dangerous warning.</p></div><details class="details custom-block"><summary>Details</summary><p>This is a details block.</p></details><h2 id="more" tabindex="-1">More <a class="header-anchor" href="#more" aria-label="Permalink to “More”">​</a></h2><p>Check out the documentation for the <a href="https://vitepress.dev/guide/markdown" target="_blank" rel="noreferrer">full list of markdown extensions</a>.</p>`,19)])])}const g=a(i,[["render",o]]);export{m as __pageData,g as default};
