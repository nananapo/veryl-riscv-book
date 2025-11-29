import{_ as c,c as l,o as p,ah as e,j as a,a as s,aH as o,aI as d,aJ as t,aK as r,aL as i,aM as b,aN as f,aO as h,aP as _,aQ as m,aR as u,aS as g,aT as y,aU as j,aV as k,aW as E,aX as P,aY as L,aZ as C,a_ as v,a$ as D,b0 as w,b1 as A,b2 as x,b3 as T,b4 as M,b5 as I,b6 as O,b7 as N,b8 as R,b9 as S,ba as q,bb as V,bc as F,bd as U,be as Y,bf as G,bg as H,bh as K,bi as W,bj as Q,bk as X,bl as Z,bm as z,bn as $,bo as B,bp as J,bq as aa,br as sa,bs as ea,bt as na,bu as ca,bv as la,bw as pa,bx as oa,by as da,bz as ta}from"./chunks/framework.BNheOMQd.js";const ga=JSON.parse('{"title":"CPUの合成","description":"","frontmatter":{},"headers":[],"relativePath":"05b-synth.md","filePath":"05b-synth.md"}'),ra={name:"05b-synth.md"};function ia(ba,n,fa,ha,_a,ma){return p(),l("div",null,[...n[0]||(n[0]=[e('<h1 id="cpuの合成" tabindex="-1">CPUの合成 <a class="header-anchor" href="#cpuの合成" aria-label="Permalink to “CPUの合成”">​</a></h1><p>これまでの章では、RV64IのCPUを作成してパイプライン化しました。 今までは動作確認とテストはシミュレータで行っていましたが、 本章では実機(FPGA)でCPUを動かします。</p><p><img src="'+o+'" alt="PYNQ-Z1"></p><h2 id="fpgaとは何か" tabindex="-1">FPGAとは何か？ <a class="header-anchor" href="#fpgaとは何か" aria-label="Permalink to “FPGAとは何か？”">​</a></h2><p>集積回路を製造するには手間と時間とお金が必要です。 FPGAを使うと、少しの手間と少しの時間、安価に集積回路の実現をお試しできます。</p><p><strong>FPGA</strong>(Field Programmable Gate Array)は、 任意の論理回路を実現できる集積回路のことです。 ハードウェア記述言語で設計した論理回路をFPGA上に設定することで、 実際に集積回路を製造しなくても実機で論理回路を再現できます。</p><p>「任意の論理回路を実現できる集積回路」は、 主にプロダクトターム方式、またはルックアップ・テーブル方式で構成されています。 本書では<strong>ルックアップ・テーブル</strong>(Lookup Table, <strong>LUT</strong>)方式のFPGAを利用します。</p><div id="lut_sample_truth" class="table"><p class="caption">表8.1: 真理値表の例</p><table><tr class="hline"><th>X</th><th>Y</th><th>A</th></tr><tr class="hline"><td>0</td><td>0</td><td>0</td></tr><tr class="hline"><td>0</td><td>1</td><td>1</td></tr><tr class="hline"><td>1</td><td>0</td><td>1</td></tr><tr class="hline"><td>1</td><td>1</td><td>0</td></tr></table></div> ![表1を実現するLUT](./images/05b-synth/lut.png) LUTとは、真理値表を記憶素子に保存しておいて、 入力によって記憶された真理値を選択して出力する回路のことです。 例えば、2つの入力`X`と`Y`を受け取って`A`を出力する論理回路(表1)は、図2の回路で実現できます。 ここでマルチプレクサ(multiplexer, MUX)とは、複数の入力を選択信号によって選択して出力する回路のことです。 <p>図2では、記憶素子のデータを<code>Y</code>によって選択し、さらに<code>X</code>によって選択することで2入力1出力の真理値表の論理回路を実現しています。 入力がN個で出力がM個のLUTのことをN入力M出力LUTと呼びます。</p><p>ルックアップ・テーブル方式のFPGAは、多数のLUT、入出力装置、これらを相互接続するための配線によって構成されています。 また、乗算回路やメモリなどの部品はFPGAよりも専用の回路で実現した方が良い<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>ので、 メモリや乗算回路の部品が内蔵されていることがあります。</p><p>本書では2つのFPGA(Tang Nano 9K、PYNQ-Z1)を使用して実機でCPUを動作させます。 2024年11月12日時点ではどちらも秋月電子通商で入手できて、 Tang Nano 9Kは3000円くらい、 PYNQ-Z1は50000円くらいで入手できます。</p><h2 id="ledの制御" tabindex="-1">LEDの制御 <a class="header-anchor" href="#ledの制御" aria-label="Permalink to “LEDの制御”">​</a></h2><p><img src="'+d+'" alt="Tang Mega 138K ProのLED(6個)"> 大抵のFPGAボードにはLEDがついています。 本章では2つのテストプログラム(LEDを点灯させる、LEDを点滅させる)によって、CPUの動作確認を行います。</p><p>LEDはトップモジュールのポートを経由して制御します(図4)。 ポートとLEDの接続方法は合成系によって異なるため、それらの接続方法は後で考えます。 CPUからLEDを制御するには、メモリ経由で制御する、CSRによって制御するなどの方法が考えられます。 本書ではLEDを制御するためのCSRを実装して、CSRをトップモジュールのポートに接続することでLEDを制御します。</p><p><img src="'+t+`" alt="CSRのLED制御用レジスタがLEDに接続される"></p><h3 id="csrにled制御用レジスタを実装する" tabindex="-1">CSRにLED制御用レジスタを実装する <a class="header-anchor" href="#csrにled制御用レジスタを実装する" aria-label="Permalink to “CSRにLED制御用レジスタを実装する”">​</a></h3><p>RISC-VのCSRのアドレス空間には、読み込みと書き込みができるCSRを自由に定義できる場所(<code>0x800</code>から<code>0x8FF</code>)が用意されています<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>。 これの先頭アドレス<code>0x800</code>をLEDの制御用レジスタのアドレスとして実装を進めます。</p><p>まず、<code>CsrAddr</code>型にLED制御用レジスタのアドレスを追加します(リスト1)。</p><p><span class="caption">▼リスト8.1: LEDの制御用レジスタのアドレスを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrAddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; {
    MTVEC = <span class="hljs-number">12&#39;h305</span>,
    MEPC = <span class="hljs-number">12&#39;h341</span>,
    MCAUSE = <span class="hljs-number">12&#39;h342</span>,
    <span class="custom-hl-bold">LED = <span class="hljs-number">12&#39;h800</span>,</span>
}
</code></pre></div><p>書き込みマスクはすべて書き込み可にします(リスト2)。</p><p><span class="caption">▼リスト8.2: LEDの制御用レジスタの書き込みマスク (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> LED_WMASK   : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
</code></pre></div><p>LEDの制御用レジスタをcsrunitモジュールのポートに定義します。CSRの幅はUIntXです(リスト3)。</p><p><span class="caption">▼リスト8.3: LEDの制御用レジスタを定義する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p>`,26),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"module"),s(` csrunit (
    clk        : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"clock"),s(`       ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s("    rst        : "),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"reset"),s(`       ,
    valid      : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    pc         : `),a("span",{class:"hljs-keyword"},"input"),s(`  Addr        ,
    ctrl       : `),a("span",{class:"hljs-keyword"},"input"),s(`  InstCtrl    ,
    rd_addr    : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"5"),s(`> ,
    csr_addr   : `),a("span",{class:"hljs-keyword"},"input"),s("  "),a("span",{class:"hljs-keyword"},"logic"),s("   <"),a("span",{class:"hljs-number"},"12"),s(`>,
`)])]),s("    rs1        : "),a("span",{class:"hljs-keyword"},"input"),s(`  UIntX       ,
    rdata      : `),a("span",{class:"hljs-keyword"},"output"),s(` UIntX       ,
    raise_trap : `),a("span",{class:"hljs-keyword"},"output"),s(),a("span",{class:"hljs-keyword"},"logic"),s(`       ,
    trap_vector: `),a("span",{class:"hljs-keyword"},"output"),s(` Addr        ,
    `),a("span",{class:"custom-hl-bold"},[s("led        : "),a("span",{class:"hljs-keyword"},"output"),s(" UIntX       ,")]),s(`
) {
`)])])],-1),e(`<p><code>rdata</code>と<code>wmask</code>にLEDの制御用レジスタの値を割り当てます(リスト4)。</p><p><span class="caption">▼リスト8.4: rdataとwmaskに値を割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// read</span>
rdata = <span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::MTVEC : mtvec,
    CsrAddr::MEPC  : mepc,
    CsrAddr::MCAUSE: mcause,
    <span class="custom-hl-bold">CsrAddr::LED   : led,</span>
    <span class="hljs-keyword">default</span>        : &#39;x,
};
<span class="hljs-comment">// write</span>
wmask = <span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::MTVEC : MTVEC_WMASK,
    CsrAddr::MEPC  : MEPC_WMASK,
    CsrAddr::MCAUSE: MCAUSE_WMASK,
    <span class="custom-hl-bold">CsrAddr::LED   : LED_WMASK,</span>
    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,
};
</code></pre></div><p>リセット時にLEDの制御用レジスタの値を0に設定します(リスト5)。</p><p><span class="caption">▼リスト8.5: リセット値の設定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if_reset</span> {
    mtvec  = <span class="hljs-number">0</span>;
    mepc   = <span class="hljs-number">0</span>;
    mcause = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">led    = <span class="hljs-number">0</span>;</span>
} <span class="hljs-keyword">else</span> {
</code></pre></div><p>LEDの制御用レジスタへの書き込み処理を実装します(リスト6)。</p><p><span class="caption">▼リスト8.6: LEDの制御用レジスタへの書き込み (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::MTVEC : mtvec  = wdata;
    CsrAddr::MEPC  : mepc   = wdata;
    CsrAddr::MCAUSE: mcause = wdata;
    <span class="custom-hl-bold">CsrAddr::LED   : led    = wdata;</span>
    <span class="hljs-keyword">default</span>        : {}
}
</code></pre></div><h3 id="トップモジュールにledを制御するポートを実装する" tabindex="-1">トップモジュールにLEDを制御するポートを実装する <a class="header-anchor" href="#トップモジュールにledを制御するポートを実装する" aria-label="Permalink to “トップモジュールにLEDを制御するポートを実装する”">​</a></h3><p>LEDはトップモジュールのポートを経由して制御します(図4)。 そのため、トップモジュールにLEDを制御するポートを作成して、csrunitのLEDの制御用レジスタの値を接続します (リスト7、リスト8、リスト9、リスト10)。 LEDの個数はFPGAによって異なるため、とりあえずXLEN(=64)ビットのポートを定義します。</p><p><span class="caption">▼リスト8.7: coreモジュールにポートを追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> core (
    clk     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                                    ,
    rst     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                                    ,
    i_membus: <span class="hljs-keyword">modport</span> membus_if::&lt;ILEN, XLEN&gt;::master          ,
    d_membus: <span class="hljs-keyword">modport</span> membus_if::&lt;MEM_DATA_WIDTH, XLEN&gt;::master,
    <span class="custom-hl-bold">led     : <span class="hljs-keyword">output</span>  UIntX                                    ,</span>
</code></pre></div><p><span class="caption">▼リスト8.8: csrunitモジュールのledポートと接続する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p>`,14),a("div",{class:"language-veryl"},[a("button",{title:"Copy Code",class:"copy"}),a("span",{class:"lang"},"veryl"),a("pre",{class:"hljs"},[a("code",null,[a("span",{class:"hljs-keyword"},"inst"),s(` csru: csrunit (
    clk                            ,
`),a("span",{class:"foldable-code"},[a("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),a("span",{class:"fold-content"},[s(`    rst                            ,
    valid   : mems_valid           ,
    pc      : mems_pc              ,
    ctrl    : mems_ctrl            ,
    rd_addr : mems_rd_addr         ,
    csr_addr: mems_inst_bits[`),a("span",{class:"hljs-number"},"31"),s(":"),a("span",{class:"hljs-number"},"20"),s(`],
    rs1     : `),a("span",{class:"hljs-keyword"},"if"),s(" mems_ctrl.funct3["),a("span",{class:"hljs-number"},"2"),s("] == "),a("span",{class:"hljs-number"},"1"),s(" && mems_ctrl.funct3["),a("span",{class:"hljs-number"},"1"),s(":"),a("span",{class:"hljs-number"},"0"),s("] != "),a("span",{class:"hljs-number"},"0"),s(` ?
        {`),a("span",{class:"hljs-number"},"1'b0"),s(),a("span",{class:"hljs-keyword"},"repeat"),s(" XLEN - $bits(memq_rdata.rs1_addr), memq_rdata.rs1_addr} "),a("span",{class:"hljs-comment"},"// rs1を0で拡張する"),s(`
    :
        memq_rdata.rs1_data
`)])]),s(`    ,
    rdata      : csru_rdata      ,
    raise_trap : csru_raise_trap ,
    trap_vector: csru_trap_vector,
    `),a("span",{class:"custom-hl-bold"},"led                          ,"),s(`
);
`)])])],-1),e(`<p><span class="caption">▼リスト8.9: topモジュールにポートを追加する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> top #(
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH_IS_ENV: <span class="hljs-keyword">bit</span>    = <span class="hljs-number">1</span>                 ,
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH       : <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>,
) (
    #[ifdef(TEST_MODE)]
    test_success: <span class="hljs-keyword">output</span> <span class="hljs-keyword">bit</span>,

    clk: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>,
    rst: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>,
    <span class="custom-hl-bold">led: <span class="hljs-keyword">output</span> UIntX,</span>
) {
</code></pre></div><p><span class="caption">▼リスト8.10: coreモジュールのledポートと接続する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17~1..f3cfc228fc0ec0a6b96c4da85a9f8be7bfdb3b17#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk       ,
    rst       ,
    i_membus  ,
    d_membus  ,
    <span class="custom-hl-bold">led       ,</span>
);
</code></pre></div><p>CSRの読み書きによってLED制御用のポートを制御できるようになりました。</p><h3 id="テストを作成する" tabindex="-1">テストを作成する <a class="header-anchor" href="#テストを作成する" aria-label="Permalink to “テストを作成する”">​</a></h3><h4 id="ledを点灯させるプログラム" tabindex="-1">LEDを点灯させるプログラム <a class="header-anchor" href="#ledを点灯させるプログラム" aria-label="Permalink to “LEDを点灯させるプログラム”">​</a></h4><p>LEDを点灯させるプログラムを作成します(リスト11、リスト12)。 CSRRWI命令で<code>0x800</code>に12(<code>&#39;b01100</code>)を書き込みます。</p><p><span class="caption">▼リスト8.11: LEDを点灯させるプログラム (test/led.asm)</span> <a href="https://github.com/nananapo/bluecore/compare/67d82e241c60cee8c795dbb854b19ee535721dd1~1..67d82e241c60cee8c795dbb854b19ee535721dd1#diff-284afde569993ef66f621362c3367f42ad28b59b7784a967fb76fecfaf1cdf34">差分をみる</a></p><div class="language-asm"><button title="Copy Code" class="copy"></button><span class="lang">asm</span><pre class="hljs"><code>80065073 //  0: csrrwi x0, 0x800, 12
00000067 //  4: jal x0, 0
</code></pre></div><p><span class="caption">▼リスト8.12: LEDを点灯させるプログラム (test/led.hex)</span> <a href="https://github.com/nananapo/bluecore/compare/67d82e241c60cee8c795dbb854b19ee535721dd1~1..67d82e241c60cee8c795dbb854b19ee535721dd1#diff-bb7cb663c9af36f3d1c8abf0808fcce6ba06f23d970b15280e94460c26a9fe8e">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>0000006780065073
</code></pre></div><h4 id="ledを点滅させるプログラム" tabindex="-1">LEDを点滅させるプログラム <a class="header-anchor" href="#ledを点滅させるプログラム" aria-label="Permalink to “LEDを点滅させるプログラム”">​</a></h4><p>LEDを点滅させるプログラムを作成します(リスト13、リスト14)。 これはちょっと複雑です。</p><p><span class="caption">▼リスト8.13: LEDを点滅させるプログラム (test/led_counter.asm)</span> <a href="https://github.com/nananapo/bluecore/compare/67d82e241c60cee8c795dbb854b19ee535721dd1~1..67d82e241c60cee8c795dbb854b19ee535721dd1#diff-790bb5a898a4cda6cc0bb5372bcef8a568ba4515bad7cde1b6eada40dd3bf722">差分をみる</a></p><div class="language-asm"><button title="Copy Code" class="copy"></button><span class="lang">asm</span><pre class="hljs"><code>000f40b7 //  0: lui x1, 244
24008093 //  4: addi x1, x1, 576
00000113 //  8: addi x2, x0, 0
00110113 //  c: addi x2, x2, 1
fe209ee3 // 10: bne x1, x2, -4
800031f3 // 14: csrrc x3, 0x800, x0
00118193 // 18: addi x3, x3, 1
80019073 // 1c: csrrw x0, 0x800, x3
00000067 // 20: jalr x0, 0(x0)
00000067 // 24: jalr x0, 0(x0)
</code></pre></div><p><span class="caption">▼リスト8.14: LEDを点滅させるプログラム (test/led_counter.hex)</span> <a href="https://github.com/nananapo/bluecore/compare/67d82e241c60cee8c795dbb854b19ee535721dd1~1..67d82e241c60cee8c795dbb854b19ee535721dd1#diff-7b1096a1fcb8625b84a31972d791d48e1d3588dc31e6f4a03f4d4dbab5c7803c">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>24008093000f40b7
0011011300000113
800031f3fe209ee3
8001907300118193
0000006700000067
</code></pre></div><p>リスト13は次のように動作します。</p><ol><li>x1に1000000(<code>(244 &lt;&lt; 12) + 576</code>)を代入する</li><li>x2に0を代入</li><li>x2がx1と一致するまでx2に1を足し続ける</li><li>LEDのCSRをx3に読み取り、1を足した値を書き込む</li><li>1 ~ 4を繰り返す</li></ol><p>これにより、LEDの制御用レジスタは一定の時間ごとに<code>0</code>→<code>1</code>→<code>2</code>と値が変わっていきます。</p><h2 id="fpgaへの合成1-tang-nano-9k" tabindex="-1">FPGAへの合成① (Tang Nano 9K) <a class="header-anchor" href="#fpgaへの合成1-tang-nano-9k" aria-label="Permalink to “FPGAへの合成① (Tang Nano 9K)”">​</a></h2><p>Tang Nano 9KをターゲットにCPUを合成します。 使用するEDAのバージョンは次の通りです。</p><ul><li>GOWIN FPGA Designer V1.9.10.03</li><li>Gowin Programmer Version 1.9.9</li></ul><h3 id="合成用のモジュールを作成する" tabindex="-1">合成用のモジュールを作成する <a class="header-anchor" href="#合成用のモジュールを作成する" aria-label="Permalink to “合成用のモジュールを作成する”">​</a></h3><p><img src="`+r+`" alt="Tang Nano 9KのLED(6個)"> Tang Nano 9KにはLEDが6個実装されています(図5)。 そのため、LEDの制御には6ビット必要です。 それに対して、topモジュールの<code>led</code>ポートは64ビットであるため、ビット幅が一致しません。</p><p>Tang Nano 9Kのためだけにtopモジュールの<code>led</code>ポートのビット幅を変更すると柔軟性がなくなってしまうため、 topモジュールの上位に合成用のモジュールを作成して調整します。</p><p><code>src/top_tang.veryl</code>を作成し、次のように記述します(リスト15)。 top_tangモジュールの<code>led</code>ポートは6ビットとして定義して、topモジュールの<code>led</code>ポートの下位6ビットを接続しています。</p><p><span class="caption">▼リスト8.15: Tang Nano 9K用の最上位モジュール (top_tang.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/770939ec6d9bbe8675823c49e22e20eb1c4c5db5~1..770939ec6d9bbe8675823c49e22e20eb1c4c5db5#diff-d42403b0f19988d812545af3abe4af7bd399daf260948eaeee62f0317aa33c40">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> top_tang (
    clk: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>   ,
    rst: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>   ,
    led: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt;,
) {
    <span class="hljs-comment">// CSRの下位ビットをLEDに接続する</span>
    <span class="hljs-keyword">var</span> led_top: UIntX;
    <span class="hljs-keyword">always_comb</span> {
        led = led_top[<span class="hljs-number">5</span>:<span class="hljs-number">0</span>];
    }

    <span class="hljs-keyword">inst</span> t: top #(
        MEMORY_FILEPATH_IS_ENV: <span class="hljs-number">0</span> ,
        MEMORY_FILEPATH       : <span class="hljs-string">&quot;&quot;</span>,
    ) (
        #[ifdef(TEST_MODE)]
        test_success: _,

        clk         ,
        rst         ,
        led: led_top,
    );
}
</code></pre></div><h3 id="プロジェクトを作成する" tabindex="-1">プロジェクトを作成する <a class="header-anchor" href="#プロジェクトを作成する" aria-label="Permalink to “プロジェクトを作成する”">​</a></h3><p>新規プロジェクトを作成します。 GOWIN FPGA Designerを開いて、Quick Startの<code>New Project...</code>を選択します。 選択したら表示されるウィンドウでは、FPGA Design Projectを選択してOKを押してください(図6)。</p><p><img src="`+i+'" alt="FPGA Design Projectを選択する"> プロジェクト名と場所を指定します。 プロジェクト名はtangnano9k、場所は好きな場所に指定してください(図7)。</p><p><img src="'+b+'" alt="プロジェクト名と場所の指定"> ターゲットのFPGAを選択します。 <code>GW1NR-LV9QN88PC6/I5</code>を選択して、Nextを押してください(図8)。</p><p><img src="'+f+'" alt="ターゲットを選択する"> プロジェクトが作成されました(図9)。</p><p><img src="'+h+'" alt="プロジェクトが作成された"></p><h3 id="設定を変更する" tabindex="-1">設定を変更する <a class="header-anchor" href="#設定を変更する" aria-label="Permalink to “設定を変更する”">​</a></h3><p>プロジェクトのデフォルト設定ではSystemVerilogを利用できないため、設定を変更します。</p><p>ProjectのConfigurationから、設定画面を開きます(図10)。</p><p><img src="'+_+'" alt="設定画面を開く"> SynthesizeのVerilog Languageを<code>System Verilog 2017</code>に設定します。 同じ画面でトップモジュール(Top Module/Entity)を設定できるため、<code>core_top_tang</code>を指定します(図11)。</p><p><img src="'+m+`" alt="設定を変更する"></p><h3 id="設計ファイルを追加する" tabindex="-1">設計ファイルを追加する <a class="header-anchor" href="#設計ファイルを追加する" aria-label="Permalink to “設計ファイルを追加する”">​</a></h3><p>Verylのソースファイルをビルドして、 生成されるファイルリスト(<code>core.f</code>)を利用して、 生成されたSystemVerilogソースファイルをプロジェクトに追加します。</p><p>Gowin FPGA Programmerでファイルを追加するには、 ウィンドウ下部のConsole画面で<code>add_file</code>を実行します。 しかし、<code>add_file</code>はファイルリストの読み込みに対応していないので、 ファイルリストを読み込んで<code>add_file</code>を実行するスクリプトを作成します(リスト16)。</p><p><span class="caption">▼リスト8.16: add_files.tcl</span> <a href="https://github.com/nananapo/bluecore/compare/770939ec6d9bbe8675823c49e22e20eb1c4c5db5~1..770939ec6d9bbe8675823c49e22e20eb1c4c5db5#diff-8283e6a9dfc65ef0dd7452f296df23cf3b41035c897450800e5915214043eafe">差分をみる</a></p><div class="language-tcl"><button title="Copy Code" class="copy"></button><span class="lang">tcl</span><pre class="hljs"><code><span class="hljs-keyword">set</span> file_list [<span class="hljs-keyword">open</span> <span class="hljs-string">&quot;ファイルリストのパス&quot;</span> r]
<span class="hljs-keyword">while</span> {[<span class="hljs-keyword">gets</span> <span class="hljs-variable">$file_list</span> line] != <span class="hljs-number">-1</span>} {
<span class="hljs-comment">    # skip blank or comment line</span>
    <span class="hljs-keyword">if</span> {[<span class="hljs-keyword">string</span> trim <span class="hljs-variable">$line</span>] eq <span class="hljs-string">&quot;&quot;</span> || [<span class="hljs-keyword">string</span> index <span class="hljs-variable">$line</span> <span class="hljs-number">0</span>] eq <span class="hljs-string">&quot;#&quot;</span>} {
        <span class="hljs-keyword">continue</span>
    }
<span class="hljs-comment">    # add file to project</span>
    add_file <span class="hljs-variable">$line</span>
}
<span class="hljs-keyword">close</span> <span class="hljs-variable">$file_list</span>
</code></pre></div><p>ウィンドウの下部にあるConsole画面で、次のコマンドを実行します(リスト17、図12)。 VerylをWSLで実行してGOWIN FPGA DesignerをWindowsで開いている場合、ファイルリスト内のパスをWindowsから参照できるパスに変更する必要があります。</p><p><span class="caption">▼リスト8.17: Tclスクリプトを実行する</span></p><div class="language-add_files"><button title="Copy Code" class="copy"></button><span class="lang">add_files</span><pre class="hljs"><code>source add_files.tclのパス
</code></pre></div><p><img src="`+u+'" alt="コマンドを実行する"> ソースファイルを追加できました(図13)。</p><p><img src="'+g+'" alt="ソースファイルの追加に成功した"></p><h3 id="制約ファイルを作成する" tabindex="-1">制約ファイルを作成する <a class="header-anchor" href="#制約ファイルを作成する" aria-label="Permalink to “制約ファイルを作成する”">​</a></h3><h4 id="物理制約" tabindex="-1">物理制約 <a class="header-anchor" href="#物理制約" aria-label="Permalink to “物理制約”">​</a></h4><p>top_tangモジュールのclk、rst、ledポートを、 それぞれTang Nano 9Kの水晶発振器、ボタン、LEDに接続します。 接続の設定には物理制約ファイルを作成します。</p><p>新しくファイルを作成するので、プロジェクトを左クリックしてNew Fileを選択します(図14)。</p><p><img src="'+y+'" alt="New Fileを選択する"> 物理制約ファイルを選択します(図15)。</p><p><img src="'+j+'" alt="物理制約ファイルを選択する"> 名前は<code>tangnano9k.cst</code>にします(図16)。</p><p><img src="'+k+`" alt="名前を設定する"> 物理制約ファイルには、次のように記述します(リスト18)。</p><p><span class="caption">▼リスト8.18: 物理制約ファイル (tangnano9k.cst)</span> <a href="https://github.com/nananapo/bluecore/compare/770939ec6d9bbe8675823c49e22e20eb1c4c5db5~1..770939ec6d9bbe8675823c49e22e20eb1c4c5db5#diff-c70d3c5fe63fe640ec329df49b4aa07be8d2b8d1a7fa428f623ccfa45af29764">差分をみる</a></p><div class="language-cst"><button title="Copy Code" class="copy"></button><span class="lang">cst</span><pre class="hljs"><code>// Clock and Reset
IO_LOC &quot;clk&quot; 52;
IO_PORT &quot;clk&quot; IO_TYPE=LVCMOS33 PULL_MODE=UP;
IO_LOC &quot;rst&quot; 4;
IO_PORT &quot;rst&quot; PULL_MODE=UP;

// LED
IO_LOC &quot;led[5]&quot; 16;
IO_LOC &quot;led[4]&quot; 15;
IO_LOC &quot;led[3]&quot; 14;
IO_LOC &quot;led[2]&quot; 13;
IO_LOC &quot;led[1]&quot; 11;
IO_LOC &quot;led[0]&quot; 10;

IO_PORT &quot;led[5]&quot; PULL_MODE=UP DRIVE=8;
IO_PORT &quot;led[4]&quot; PULL_MODE=UP DRIVE=8;
IO_PORT &quot;led[3]&quot; PULL_MODE=UP DRIVE=8;
IO_PORT &quot;led[2]&quot; PULL_MODE=UP DRIVE=8;
IO_PORT &quot;led[1]&quot; PULL_MODE=UP DRIVE=8;
IO_PORT &quot;led[0]&quot; PULL_MODE=UP DRIVE=8;
</code></pre></div><p><code>IO_LOC</code>で接続する場所の名前を指定します。</p><p>場所の名前はTang Nano 9Kのデータシートで確認できます。 例えば図17と図18から、 LEDは<code>10</code>、<code>11</code>、<code>13</code>、<code>14</code>、<code>15</code>、<code>16</code>に割り当てられていることが分かります。 また、LEDが負論理(<code>1</code>で消灯、<code>0</code>で点灯)であることが分かります。 水晶発信器とボタンについても、データシートを見て確認してください。</p><p><img src="`+E+'" alt="LED"><img src="'+P+'" alt="PIN10_IOL～の接続先"></p><h4 id="タイミング制約" tabindex="-1">タイミング制約 <a class="header-anchor" href="#タイミング制約" aria-label="Permalink to “タイミング制約”">​</a></h4><p>FPGAが何MHzで動くかをタイミング制約ファイルに記述します。</p><p>物理制約ファイルと同じようにAdd Fileを選択して、 タイミング制約ファイルを作成します(図19)。</p><p><img src="'+L+'" alt="タイミング制約ファイルを選択する"> 名前は<code>timing.sdc</code>にします(図20)。</p><p><img src="'+C+`" alt="名前を設定する"> タイミング制約ファイルには、次のように記述します(リスト19)。</p><p><span class="caption">▼リスト8.19: タイミング制約ファイル (timing.sdc)</span> <a href="https://github.com/nananapo/bluecore/compare/770939ec6d9bbe8675823c49e22e20eb1c4c5db5~1..770939ec6d9bbe8675823c49e22e20eb1c4c5db5#diff-3e6d45fecec520db4054200018c09a23e1ddc0f244d284912592561fddd47210">差分をみる</a></p><div class="language-sdc"><button title="Copy Code" class="copy"></button><span class="lang">sdc</span><pre class="hljs"><code>create_clock -name clk -period 37.037 -waveform {0 18.518} [get_ports {clk}]
</code></pre></div><p>Tang Nano 9Kの水晶発振器は27MHzで振動します。 そのため、<code>create_clock</code>で<code>clk</code>ポートの周期を<code>37.037</code>ナノ秒(27MHz)に設定しています。</p><h3 id="テスト" tabindex="-1">テスト <a class="header-anchor" href="#テスト" aria-label="Permalink to “テスト”">​</a></h3><h4 id="ledの点灯を確認する" tabindex="-1">LEDの点灯を確認する <a class="header-anchor" href="#ledの点灯を確認する" aria-label="Permalink to “LEDの点灯を確認する”">​</a></h4><p>まず、LEDの点灯を確認します。</p><p>インポートされた<code>top_tang.sv</code>のtopモジュールをインスタンス化している場所で、 <code>MEMORY_FILEPATH</code>パラメータの値を<code>test/led.hex</code>のパスに設定します(リスト20)。</p><p><span class="caption">▼リスト8.20: 読み込むファイルを設定する (top_tang.sv)</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        (&quot;test/led.hexへのパス&quot;)
) t (
</code></pre></div><p>ProcessタブのSynthesizeをクリックし、合成します(図21)。</p><p><img src="`+v+'" alt="Processタブ"> そうすると、合成に失敗して図22のようなエラーが表示されます。</p><p><img src="'+D+'" alt="合成するとエラーが発生する"> これは、Tang Nano 9Kに搭載されているメモリ用の部品の数が足りないために発生しているエラーです。 この問題を回避するために、eeiパッケージの<code>MEM_ADDR_WIDTH</code>の値を<code>10</code>に変更します<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>。 メモリの幅を変更したら、Verylファイルをビルドしなおして、もう一度合成します。</p><p><img src="'+w+'" alt="合成と配置配線に成功した"> 合成に成功したら、<code>Place &amp; Route</code>を押して、論理回路の配置配線情報を生成します(図23)。 それが終了したら、Tang Nano 9KをPCに接続して、Gowin Programmerを開いて設計をFPGAに書き込みます(図24)。</p><p><img src="'+A+'" alt="Program / Configureボタンを押して書き込む"> Tang Nano 9Kの中央2つ以外のLEDが点灯していることを確認できます。 図5の左下のボタンを押すと全てのLEDが点灯します。</p><p><img src="'+x+`" alt="LEDの制御用レジスタの値が12()なので中央2つのLEDが点灯せず、それ以外が点灯する"></p><h4 id="ledの点滅を確認する" tabindex="-1">LEDの点滅を確認する <a class="header-anchor" href="#ledの点滅を確認する" aria-label="Permalink to “LEDの点滅を確認する”">​</a></h4><p><code>MEMORY_FILEPATH</code>パラメータの値を<code>test/led_counter.hex</code>のパスに設定します(リスト21)。</p><p><span class="caption">▼リスト8.21: 読み込むファイルを変更する (top_tang.sv)</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>core_top #(
    .MEMORY_FILEPATH_IS_ENV (0 ),
    .MEMORY_FILEPATH        (&quot;test/led_counter.hexへのパス&quot;)
) t (
</code></pre></div><p>合成、配置配線しなおして、設計をFPGAに書き込むとLEDが点滅します<sup class="footnote-ref"><a href="#fn4" id="fnref4">[4]</a></sup>。 図5の左下のボタンを押すと状態がリセットされます。</p><h2 id="fpgaへの合成2-pynq-z1" tabindex="-1">FPGAへの合成② (PYNQ-Z1) <a class="header-anchor" href="#fpgaへの合成2-pynq-z1" aria-label="Permalink to “FPGAへの合成② (PYNQ-Z1)”">​</a></h2><p>PYNQ-Z1をターゲットにCPUを合成します。 使用するEDAのバージョンは次の通りです。</p><ul><li>Vivado v2023.2</li></ul><p>初めてPYNQ-Z1を使う人は、<a href="https://www.pynq.io/boards.html" target="_blank" rel="noreferrer">PYNQのドキュメント</a>やACRiの記事を参考に起動方法を確認して、Vivadoにボードファイルを追加してください。</p><h3 id="合成用のモジュールを作成する-1" tabindex="-1">合成用のモジュールを作成する <a class="header-anchor" href="#合成用のモジュールを作成する-1" aria-label="Permalink to “合成用のモジュールを作成する”">​</a></h3><p><img src="`+T+`" alt="PYNQ-Z1のLED(6個)"> PYNQ-Z1にはLEDが6個実装されています(図26)。 本章ではボタンの上の横並びの4つのLED(図26右下)を使用します。</p><p><a href="./05b-synth.html">「8.3.1 合成用のモジュールを作成する」</a>とおなじように、 <code>led</code>ポートのビット幅を一致させるためにPYNQ-Z1の合成のためのトップモジュールを作成します。</p><p><code>src/top_pynq_z1.veryl</code>を作成し、次のように記述します(リスト22)。 top_pynq_z1モジュールの<code>led</code>ポートは4ビットとして定義して、topモジュールの<code>led</code>ポートの下位4ビットを接続しています。</p><p><span class="caption">▼リスト8.22: PYNQ-Z1用の最上位モジュール (top_pynq_z1.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/70d12437720f90babf2a2228c8fe6b9eae6de17f~1..70d12437720f90babf2a2228c8fe6b9eae6de17f#diff-257ab0e195148813de1fa11a8132d7651c48ef788d6c85108bcd5ca3c44dce04">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> top_pynq_z1 #(
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH: <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;&quot;</span>,
) (
    clk: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>   ,
    rst: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>   ,
    led: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">4</span>&gt;,
) {

    <span class="hljs-comment">// CSRの下位ビットをLEDに接続する</span>
    <span class="hljs-keyword">var</span> led_top: UIntX;
    <span class="hljs-keyword">always_comb</span> {
        led = led_top[<span class="hljs-number">3</span>:<span class="hljs-number">0</span>];
    }

    <span class="hljs-keyword">inst</span> t: top #(
        MEMORY_FILEPATH_IS_ENV: <span class="hljs-number">0</span>              ,
        MEMORY_FILEPATH       : MEMORY_FILEPATH,
    ) (
        #[ifdef(TEST_MODE)]
        test_success: _,

        clk         ,
        rst         ,
        led: led_top,
    );
}
</code></pre></div><h3 id="プロジェクトを作成する-1" tabindex="-1">プロジェクトを作成する <a class="header-anchor" href="#プロジェクトを作成する-1" aria-label="Permalink to “プロジェクトを作成する”">​</a></h3><p>Vivadoを開いて、プロジェクトを作成します。 Quick StartのCreate Projectを押すと、図27が出るのでNextを押します。</p><p><img src="`+M+'" alt="Nextを押す"> プロジェクト名とフォルダを入力します(図28)。 好きな名前と場所を入力したらNextを押します。</p><p><img src="'+I+'" alt="プロジェクト名とフォルダを入力する"> プロジェクトの形式を設定します(図29)。 RTL Projectを選択して、<code>Do not specify sources at this time</code>にチェックを入れてNextを押します。</p><p><img src="'+O+'" alt="プロジェクトの形式を選択する"> ターゲットのFPGAボードを選択します(図30)。 今回はPYNQ-Z1がターゲットなので、Boardsタブに移動してPYNQ-Z1を選択します。 PYNQ-Z1が表示されない場合、ボードファイルをVivadoに追加してください。</p><p><img src="'+N+'" alt="PYNQ-Z1を選択する"> 概要を確認して、Nextを押します(図31)。</p><p><img src="'+R+'" alt="Nextを押す"> プロジェクトが作成されました(図32)。</p><p><img src="'+S+`" alt="プロジェクトの画面"></p><h3 id="設計ファイルを追加する-1" tabindex="-1">設計ファイルを追加する <a class="header-anchor" href="#設計ファイルを追加する-1" aria-label="Permalink to “設計ファイルを追加する”">​</a></h3><p>Verylのソースファイルをビルドして、 生成されるファイルリスト(<code>core.f</code>)を利用して、 生成されたSystemVerilogソースファイルをプロジェクトに追加します。</p><p>Vivadoでファイルを追加するには、 ウィンドウ下部のTcl Console画面で<code>add_file</code>を実行します。 しかし、<code>add_file</code>はファイルリストの読み込みに対応していないので、 ファイルリストを読み込んで<code>add_file</code>を実行するスクリプトを作成します(リスト23)。</p><p><span class="caption">▼リスト8.23: add_files.tcl</span> <a href="https://github.com/nananapo/bluecore/compare/70d12437720f90babf2a2228c8fe6b9eae6de17f~1..70d12437720f90babf2a2228c8fe6b9eae6de17f#diff-6d6caefddfb7ea011537f7f850f1944fb9b76ed30bf128fe381ffae2ce91009c">差分をみる</a></p><div class="language-tcl"><button title="Copy Code" class="copy"></button><span class="lang">tcl</span><pre class="hljs"><code><span class="hljs-keyword">set</span> file_list [<span class="hljs-keyword">open</span> <span class="hljs-string">&quot;ファイルリストのパス&quot;</span> r]
<span class="hljs-keyword">while</span> {[<span class="hljs-keyword">gets</span> <span class="hljs-variable">$file_list</span> line] != <span class="hljs-number">-1</span>} {
<span class="hljs-comment">    # skip blank or comment line</span>
    <span class="hljs-keyword">if</span> {[<span class="hljs-keyword">string</span> trim <span class="hljs-variable">$line</span>] eq <span class="hljs-string">&quot;&quot;</span> || [<span class="hljs-keyword">string</span> index <span class="hljs-variable">$line</span> <span class="hljs-number">0</span>] eq <span class="hljs-string">&quot;#&quot;</span>} {
        <span class="hljs-keyword">continue</span>
    }
<span class="hljs-comment">    # add file to project</span>
    add_files -force -norecurse <span class="hljs-variable">$line</span>
}
<span class="hljs-keyword">close</span> <span class="hljs-variable">$file_list</span>
</code></pre></div><p>ウィンドウの下部にあるTcl Console画面で、次のコマンドを実行します(リスト24、図33)。 VerylをWSLで実行してVivadoをWindowsで開いている場合、ファイルリスト内のパスをWindowsから参照できるパスに変更する必要があります。</p><p><span class="caption">▼リスト8.24: Tclスクリプトを実行する</span></p><div class="language-add_files"><button title="Copy Code" class="copy"></button><span class="lang">add_files</span><pre class="hljs"><code>source add_files.tclのパス
</code></pre></div><p><img src="`+q+'" alt="add_files.tclを実行する"> ソースファイルが追加されました(図34)。</p><p><img src="'+V+`" alt="ソースファイルが追加された"></p><h3 id="verilogのトップモジュールを作成する" tabindex="-1">Verilogのトップモジュールを作成する <a class="header-anchor" href="#verilogのトップモジュールを作成する" aria-label="Permalink to “Verilogのトップモジュールを作成する”">​</a></h3><p>VerylファイルはSystemVerilogファイルに変換されますが、 VivadoではトップモジュールにSystemVerilogファイルを使用できません。 この問題を回避するために、Verilogでtop_pynq_z1モジュールをインスタンス化するモジュールを記述します(リスト25)。</p><p><span class="caption">▼リスト8.25: PYNQ-Z1用の最上位モジュール (core_top_v.v)</span> <a href="https://github.com/nananapo/bluecore/compare/70d12437720f90babf2a2228c8fe6b9eae6de17f~1..70d12437720f90babf2a2228c8fe6b9eae6de17f#diff-f323ca209cf787da8d19417a60c4ea4f405111e190010d48711e4bc2e8eee283">差分をみる</a></p><div class="language-v"><button title="Copy Code" class="copy"></button><span class="lang">v</span><pre class="hljs"><code><span class="hljs-keyword">module</span> core_top_v #(
    <span class="hljs-keyword">parameter</span> MEMORY_FILEPATH = <span class="hljs-string">&quot;&quot;</span>
) (
    <span class="hljs-keyword">input</span> <span class="hljs-keyword">wire</span>          clk,
    <span class="hljs-keyword">input</span> <span class="hljs-keyword">wire</span>          rst,
    <span class="hljs-keyword">output</span> <span class="hljs-keyword">wire</span> [<span class="hljs-number">3</span>:<span class="hljs-number">0</span>]   led
);
    core_top_pynq_z1 #(
        <span class="hljs-variable">.MEMORY_FILEPATH</span>(MEMORY_FILEPATH)
    ) t (
        <span class="hljs-variable">.clk</span>(clk),
        <span class="hljs-variable">.rst</span>(rst),
        <span class="hljs-variable">.led</span>(led)
    );
<span class="hljs-keyword">endmodule</span>
</code></pre></div><p><code>core_top_v.v</code>をadd_filesでプロジェクトに追加します(リスト26)。</p><p><span class="caption">▼リスト8.26: Tcl Consoleで実行する</span></p><div class="language-add_files"><button title="Copy Code" class="copy"></button><span class="lang">add_files</span><pre class="hljs"><code>add_files -norecurse core_top_v.vのパス
</code></pre></div><h3 id="ブロック図を作成する" tabindex="-1">ブロック図を作成する <a class="header-anchor" href="#ブロック図を作成する" aria-label="Permalink to “ブロック図を作成する”">​</a></h3><p>Vivadoではモジュール間の接続をブロック図によって行えます。 設計したモジュールをブロック図に追加して、クロックやリセット、LEDの接続を行います。</p><h4 id="ブロック図の作成とトップモジュールの設定" tabindex="-1">ブロック図の作成とトップモジュールの設定 <a class="header-anchor" href="#ブロック図の作成とトップモジュールの設定" aria-label="Permalink to “ブロック図の作成とトップモジュールの設定”">​</a></h4><p>画面左のFlow Navigatorで<code>Create Block Design</code>を押してブロック図を作成します(図35)。</p><p><img src="`+F+'" alt="IP INTEGRATOR  Create Block Design"> 名前は適当なものに設定します(図36)。</p><p><img src="'+U+'" alt="名前を入力する"> Sourcesタブに作成されたブロック図が追加されるので、右クリックして<code>Create HDL Wrapper...</code>を押します(図37)。</p><p><img src="'+Y+'" alt="Create HDL Wrapper...を押す"> そのままOKを押します(図38)。</p><p><img src="'+G+'" alt="OKを押す"> ブロック図がVerilogモジュールになるので、 <code>Set as Top</code>を押して、これをトップモジュールにします(図39)。</p><p><img src="'+H+'" alt="Set as Topを押す"> ブロック図がトップモジュールに設定されました(図40)。</p><p><img src="'+K+'" alt="ブロック図がトップモジュールに設定された"></p><h4 id="ブロック図の設計" tabindex="-1">ブロック図の設計 <a class="header-anchor" href="#ブロック図の設計" aria-label="Permalink to “ブロック図の設計”">​</a></h4><p>Diagram画面でブロック図を組み立てます。</p><p>まず、core_top_vモジュールを追加します。 適当な場所で右クリックして、<code>Add Module...</code>を押します(図41)。</p><p><img src="'+W+'" alt="Add Module...を押す"> core_top_vを選択して、OKを押します(図42)。</p><p><img src="'+Q+'" alt="core_top_vを選択する"> core_top_vが追加されるので、 ledポートをクリックして<code>Make External</code>を押します(<code>xilinx/bd/8</code>)。</p><p><img src="'+X+'" alt="Make Externalを押す"> led_0ポートが追加されました(図44)。 これがブロック図のoutputポートになります。</p><p><img src="'+Z+'" alt="led_0ポートが追加された"> led_0を選択して、左側のExternal Port PropertiesのNameをledに変更します。</p><p><img src="'+z+'" alt="名前をledに変更した"> 次に、+ボタンを押して ZYNQ7 Processing System、 Processor System Reset、 Clocking Wizardを追加します(図46、図47)。</p><p><img src="'+$+'" alt="+ボタンを押す"><img src="'+B+'" alt="3つIPを追加する"> 上に<code>Designer Assistance Available</code>と出るので、<code>Run Block Automation</code>を押します(図48)。</p><p><img src="'+J+'" alt="Run Block Automationを押す"> 図49のようになっていることを確認して、OKを押します。</p><p><img src="'+aa+'" alt="DDRとFIXED_IOが追加された"> 図50のようにポートを接続します。 接続元から接続先にドラッグすることでポートを接続できます。 また、proc_sys_reset_0のext_reset_inをMake Externalしてrstを作成してください。</p><p><img src="'+sa+'" alt="ポートを接続する"> ZYNQ7 Processing Systemのoutputポートには、100MHzのクロック信号<code>FCLK_CLK0</code>が定義されています。 これをそのままcore_top_vに供給しても良いですが、 現状のコードではcore_top_vが100MHzで動くように合成できません。 そのため、Clocking Wizardで50MHzに変換したクロックをcore_top_vに供給します。</p><p>clk_wiz_0をダブルクリックして、入力を50MHzに変換するように設定します。 clk_out1のRequestedを50に変更してください。 また、Enable Optional ～のresetとlockedのチェックを外します(図51)。</p><p><img src="'+ea+'" alt="Clocking Wizardの設定を変更する"> clk_wiz_0が少しコンパクトになりました(図52)。</p><p><img src="'+na+`" alt="Clocking Wizardが変更された"></p><h3 id="制約ファイルを作成する-1" tabindex="-1">制約ファイルを作成する <a class="header-anchor" href="#制約ファイルを作成する-1" aria-label="Permalink to “制約ファイルを作成する”">​</a></h3><p>ブロック図のrst、ledを、それぞれPYNQ-Z1のボタン(BTN0)、LED(LD0、LD1、LD2、LD3)に接続します。 接続の設定には物理制約ファイルを作成します。</p><p><code>pynq.xdc</code>を作成し、次のように記述します(リスト27)。</p><p><span class="caption">▼リスト8.27: 物理制約ファイル (pynq.xdc)</span> <a href="https://github.com/nananapo/bluecore/compare/70d12437720f90babf2a2228c8fe6b9eae6de17f~1..70d12437720f90babf2a2228c8fe6b9eae6de17f#diff-cf2026c8356c3bc2eb4a5665159c95b3c4e47821527e57564cdc376b43fdf4df">差分をみる</a></p><div class="language-xdc"><button title="Copy Code" class="copy"></button><span class="lang">xdc</span><pre class="hljs"><code># reset (BTN0)
set_property -dict { PACKAGE_PIN D19 IOSTANDARD LVCMOS33} [ get_ports rst ]

# led (LD0 - LD4)
set_property -dict { PACKAGE_PIN R14 IOSTANDARD LVCMOS33 } [ get_ports led[0] ];
set_property -dict { PACKAGE_PIN P14 IOSTANDARD LVCMOS33 } [ get_ports led[1] ];
set_property -dict { PACKAGE_PIN N16 IOSTANDARD LVCMOS33 } [ get_ports led[2] ];
set_property -dict { PACKAGE_PIN M14 IOSTANDARD LVCMOS33 } [ get_ports led[3] ];
</code></pre></div><p>リスト27では、 rstにD19を割り当てて、 led[0]、led[1]、led[2]、led[3]にR14、P14、N16、M14を割り当てます(図53)。 ボタンは押されていないときに<code>1</code>、押されているときに<code>0</code>になります。 LEDは<code>1</code>のときに点灯して、<code>0</code>のときに消灯します。</p><p><img src="`+ca+'" alt="LEDとボタン"></p><h3 id="テスト-1" tabindex="-1">テスト <a class="header-anchor" href="#テスト-1" aria-label="Permalink to “テスト”">​</a></h3><h4 id="ledの点灯を確認する-1" tabindex="-1">LEDの点灯を確認する <a class="header-anchor" href="#ledの点灯を確認する-1" aria-label="Permalink to “LEDの点灯を確認する”">​</a></h4><p>ブロック図のcore_top_v_0をダブルクリックすることで、 core_top_vモジュールの<code>MEMORY_FILEPATH</code>パラメータを変更します。 パラメータにはテストのHEXファイルのパスを設定します(図54)。 LEDの点灯のテストのために<code>test/led.hex</code>のパスを入力します。</p><p><img src="'+la+'" alt="テストのHEXファイルのパスを設定する"> PROGRAM AND DEBUGの<code>Generate Bitstream</code>を押して合成と配置配線を実行します(図55)。</p><p><img src="'+pa+'" alt="合成、配置配線"> 合成が完了したら<code>Open Hardware Manager</code>を押して、 開かれたHARDWARE MANAGERの<code>Open Target</code>の<code>Auto Connect</code>を押してPYNQ-Z1と接続します(図56)。</p><p><img src="'+oa+'" alt="PYNQ-Z1を接続する"><code>Program device</code>を押すと、PYNQ-Z1に設計が書き込まれます。</p><p><img src="'+da+'" alt="設計を書き込む"> LEDが点灯しているのを確認できます(図58)。 BTN0を押すとLEDが消灯します。</p><p><img src="'+ta+'" alt="LEDの制御用レジスタの値が12()なので、LD3、LD2が点灯する"></p><h4 id="ledの点滅を確認する-1" tabindex="-1">LEDの点滅を確認する <a class="header-anchor" href="#ledの点滅を確認する-1" aria-label="Permalink to “LEDの点滅を確認する”">​</a></h4><p>core_top_vモジュールの<code>MEMORY_FILEPATH</code>パラメータの値を<code>test/ledcounter.hex</code>のパスに変更して、 再度<code>Generate Bitstream</code>を実行します。</p><p>Hardware Managerを開いてProgram deviceを押すとLEDが点滅します<sup class="footnote-ref"><a href="#fn5" id="fnref5">[5]</a></sup>。 BTN0を押すと状態がリセットされます。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>例えばメモリは同じパターンの論理回路の繰り返しで大きな面積を要します。メモリはよく利用される回路であるため、専用の回路を用意した方が空間的な効率が改善される上に、遅延が少なくなるという利点があります <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>The RISC-V Instruction Set Manual Volume II: Privileged Architecture version 20240411 Table 3. Allocation of RISC-V CSR address ranges. <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>適当な値です <a href="#fnref3" class="footnote-backref">↩︎</a></p></li><li id="fn4" class="footnote-item"><p><a href="https://youtu.be/OpXiXha-ZnI" target="_blank" rel="noreferrer">https://youtu.be/OpXiXha-ZnI</a> <a href="#fnref4" class="footnote-backref">↩︎</a></p></li><li id="fn5" class="footnote-item"><p><a href="https://youtu.be/byCr_464dW4" target="_blank" rel="noreferrer">https://youtu.be/byCr_464dW4</a> <a href="#fnref5" class="footnote-backref">↩︎</a></p></li></ol></section>',168)])])}const ya=c(ra,[["render",ia]]);export{ga as __pageData,ya as default};
