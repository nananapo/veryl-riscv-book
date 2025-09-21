import{u as o,c as m,o as i,af as c,j as a,t,k as n,a as e}from"./chunks/framework.D5l_65jD.js";const x=JSON.parse('{"title":"Runtime API Examples","description":"","frontmatter":{"outline":"deep"},"headers":[],"relativePath":"api-examples.md","filePath":"api-examples.md"}'),h={name:"api-examples.md"},j=Object.assign(h,{setup(d){const{site:g,theme:l,page:p,frontmatter:r}=o();return(u,s)=>(i(),m("div",null,[s[0]||(s[0]=c(`<h1 id="runtime-api-examples" tabindex="-1">Runtime API Examples <a class="header-anchor" href="#runtime-api-examples" aria-label="Permalink to “Runtime API Examples”">​</a></h1><p>This page demonstrates usage of some of the runtime APIs provided by VitePress.</p><p>The main <code>useData()</code> API can be used to access site, theme, and page data for the current page. It works in both <code>.md</code> and <code>.vue</code> files:</p><div class="language-md"><button title="Copy Code" class="copy"></button><span class="lang">md</span><pre class="hljs"><code><span class="language-xml"><span class="hljs-tag">&lt;<span class="hljs-name">script</span> <span class="hljs-attr">setup</span>&gt;</span></span>
import { useData } from &#39;vitepress&#39;

const { theme, page, frontmatter } = useData()
<span class="language-xml"><span class="hljs-tag">&lt;/<span class="hljs-name">script</span>&gt;</span></span>

<span class="hljs-section">## Results</span>

<span class="hljs-section">### Theme Data</span>
<span class="language-xml"><span class="hljs-tag">&lt;<span class="hljs-name">pre</span>&gt;</span></span>{{ theme }}<span class="language-xml"><span class="hljs-tag">&lt;/<span class="hljs-name">pre</span>&gt;</span></span>

<span class="hljs-section">### Page Data</span>
<span class="language-xml"><span class="hljs-tag">&lt;<span class="hljs-name">pre</span>&gt;</span></span>{{ page }}<span class="language-xml"><span class="hljs-tag">&lt;/<span class="hljs-name">pre</span>&gt;</span></span>

<span class="hljs-section">### Page Frontmatter</span>
<span class="language-xml"><span class="hljs-tag">&lt;<span class="hljs-name">pre</span>&gt;</span></span>{{ frontmatter }}<span class="language-xml"><span class="hljs-tag">&lt;/<span class="hljs-name">pre</span>&gt;</span></span>
</code></pre></div><h2 id="results" tabindex="-1">Results <a class="header-anchor" href="#results" aria-label="Permalink to “Results”">​</a></h2><h3 id="theme-data" tabindex="-1">Theme Data <a class="header-anchor" href="#theme-data" aria-label="Permalink to “Theme Data”">​</a></h3>`,6)),a("pre",null,t(n(l)),1),s[1]||(s[1]=a("h3",{id:"page-data",tabindex:"-1"},[e("Page Data "),a("a",{class:"header-anchor",href:"#page-data","aria-label":"Permalink to “Page Data”"},"​")],-1)),a("pre",null,t(n(p)),1),s[2]||(s[2]=a("h3",{id:"page-frontmatter",tabindex:"-1"},[e("Page Frontmatter "),a("a",{class:"header-anchor",href:"#page-frontmatter","aria-label":"Permalink to “Page Frontmatter”"},"​")],-1)),a("pre",null,t(n(r)),1),s[3]||(s[3]=a("h2",{id:"more",tabindex:"-1"},[e("More "),a("a",{class:"header-anchor",href:"#more","aria-label":"Permalink to “More”"},"​")],-1)),s[4]||(s[4]=a("p",null,[e("Check out the documentation for the "),a("a",{href:"https://vitepress.dev/reference/runtime-api#usedata",target:"_blank",rel:"noreferrer"},"full list of runtime APIs"),e(".")],-1))]))}});export{x as __pageData,j as default};
