import { defineConfig } from 'vitepress'
import footnote from 'markdown-it-footnote'

import hljs from 'highlight.js'
import veryl from 'highlightjs-veryl'

hljs.registerLanguage('veryl', veryl)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "contents",
  
  title: "Verylで作るCPU",
  description: "Write RISC-V CPU in Veryl",
  themeConfig: {
    nav: [
      // { text: 'プログラムを入手する', link: 'https://github.com/nananapo/bluecore' }
    ],
    sidebar: [
      {
        text: '第I部 RV32I/RV64Iの実装',
        items: [
          { text: 'まえがき', link: '/00-preface' },
          { text: '1 環境構築', link: '/02-setup' },
          { text: '2 ハードウェア記述言語 Veryl', link: '/03-veryl' },
          { text: '3 RV32Iの実装', link: '/04-impl-rv32i' },
          { text: '4 Zicsr拡張の実装', link: '/04a-zicsr' },
          { text: '5 riscv-testsによるテスト', link: '/04b-riscvtests' },
          { text: '6 RV64Iの実装', link: '/05-impl-rv64i' },
          { text: '7 CPUのパイプライン化', link: '/05a-pipeline' },
          { text: '8 CPUの合成', link: '/05b-synth' }
        ]
      },
      {
        text: '第II部 RV64IMACの実装',
        items: [
          { text: '9 M拡張の実装', link: '/10-impl-m' },
          { text: '10 例外の実装', link: '/11-impl-exception' },
          { text: '11 Memory-mapped I/Oの実装', link: '/12-impl-mmio' },
          { text: '12 A拡張の実装', link: '/13-impl-a' },
          { text: '13 C拡張の実装', link: '/14-impl-c' }
        ]
      },
      {
        text: '第III部 特権/割り込みの実装',
        items: [
          { text: '14 M-modeの実装 (1. CSRの実装)', link: '/20-mmode-csr' },
          { text: '15 M-modeの実装 (2. 割り込みの実装)', link: '/21-impl-interrupt' },
          { text: '16 U-modeの実装', link: '/22-umode-csr' },
          { text: '17 S-modeの実装 (1. CSRの実装)', link: '/23-smode-csr' },
          { text: '18 S-modeの実装 (2. 仮想記憶システム)', link: '/24-impl-paging' },
          { text: '19 PLICの実装', link: '/25-impl-plic' },
          { text: '20 Linuxを動かす', link: '/26-run-linux' },
          { text: 'あとがき (第Ⅰ部)', link: '/99-postface' },
          { text: 'あとがき (第Ⅱ部、第Ⅲ部)', link: '/99b-postface' },
          { text: 'このプロジェクトに貢献する', link: '/100-contribute' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/nananapo/veryl-riscv-book' }
    ],
    
    outline: {
      level: [2, 4]
    },

    search: {
      provider: 'local',
      options: {
        miniSearch: {
          options: {
            tokenize: (term) => {
              if (typeof term === 'string') term = term.toLowerCase();
              const segmenter = Intl.Segmenter && new Intl.Segmenter('ja-JP', { granularity: 'word' });
              if (!segmenter) return [term];
              const tokens = [];
              for (const seg of segmenter.segment(term)) {
                // @ts-ignore
                // ignore spaces
                if (seg.segment.trim() !== '') tokens.push(seg.segment);
              }
              return tokens;
            },
          },
        },
      },
    }
  },

  head: [
    ["script", { async: "true", src: "https://www.googletagmanager.com/gtag/js?id=G-EM6HSGNSVY"}],
    ["script", {}, "window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', 'G-EM6HSGNSVY');"],
    ["meta", { property: "og:image", content: "https://cpu.kanataso.net/images/ogp.png" }],
    ["meta", { name: "twitter:image", content: "https://cpu.kanataso.net/images/ogp.png" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["style", {}, `
      @keyframes blink {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
      }
      .foldable-code .fold-content {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .foldable-code.expanded .fold-content {
        position: static;
        width: auto;
        height: auto;
        margin: 0;
        overflow: visible;
        clip: auto;
        white-space: pre;
      }
      .foldable-code.expanded .fold-trigger { display: none; }
      
      .fold-trigger {
        display: block;
        cursor: pointer;
        background-color: var(--vp-c-bg-soft, #f6f6f7);
        border-top: 1px solid var(--vp-c-divider, #e2e2e3);
        border-bottom: 1px solid var(--vp-c-divider, #e2e2e3);
        color: var(--vp-c-text-2, #666);
        padding: 4px 16px;
        text-align: center;
        font-size: 12px;
        font-weight: 500;
        transition: background-color 0.2s;
        user-select: none;
        line-height: 1.5;
        margin: 4px 0;
        animation: blink 1.5s infinite ease-in-out;
      }
      .fold-trigger:hover {
        background-color: var(--vp-c-bg-mute, #f1f1f1);
        color: var(--vp-c-text-1, #333);
        animation: none;
      }
      .fold-trigger::before {
        content: "⋮ Click to expand";
      }
    `]
  ],
  
  markdown: {
    config: (md) => {
      md.use(footnote)
    },
    highlight: (str, lang) => {

      function escapeHtml(text) {
        return text.replace(
            /@@@@(.*?)@@@@/g,
            '<span class="custom-hl-bold">$1</span>'
          ).replace(
            /~~~~(.*?)~~~~/g,
            '<span class="custom-hl-del">$1</span>'
          ).replace(
            /\^\^\^\^(.*?)\^\^\^\^/g,
            '<span class="custom-hl-line">$1</span>'
          ).replace(
            /(<span[^>]*>)?====FOLD_START====(<\/span>)?\n?/g,
            '<span class="foldable-code"><span class="fold-trigger" onclick="this.parentElement.classList.add(\'expanded\')"></span><span class="fold-content">'
          ).replace(
            /(<span[^>]*>)?====FOLD_END====(<\/span>)?\n?/g,
            '</span></span>'
          );
      }

      function highlight(code, language) {
        let result = hljs.highlight(code, { language: language, ignoreIllegals: true });
        return escapeHtml(`<pre class="hljs" v-pre><code>${result.value}</code></pre>`);
      }

      if (lang == 'terminal') lang = 'shellsession';
      if (lang && hljs.getLanguage(lang)) {
        try {
          return highlight(str, lang);
        } catch (__) {}
      }
      return highlight(str, 'plaintext');
    }
  }
})