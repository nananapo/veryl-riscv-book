import { defineConfig } from 'vitepress'
import footnote from 'markdown-it-footnote'

import hljs from 'highlight.js'
import veryl from 'highlightjs-veryl'

hljs.registerLanguage('veryl', veryl)

// https://vitepress.dev/reference/site-config
export default defineConfig({
  srcDir: "contents",
  
  title: "veryl-riscv-book",
  description: "Write RISC-V CPU in Veryl",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      // { text: 'Home', link: '/' },
      { text: 'プログラムを入手する', link: 'https://github.com/nananapo/bluecore' }
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
  },
  
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
          )
      }

      if (lang == 'terminal') {
        lang = 'shellsession';
      }
      if (lang && hljs.getLanguage(lang)) {
        try {
          const result = hljs.highlight(str, { language: lang, ignoreIllegals: true });
          return escapeHtml(`<pre class="hljs" v-pre><code>${result.value}</code></pre>`);
        } catch (__) {}
      }
      const escaped = hljs.highlight(str, { language: 'plaintext', ignoreIllegals: true }).value;
      return escapeHtml(`<pre class="hljs" v-pre><code>${escaped}</code></pre>`);
    }
  }
})