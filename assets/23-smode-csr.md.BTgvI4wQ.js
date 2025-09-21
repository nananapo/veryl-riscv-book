import{_ as a,c as n,o as e,af as l,bR as p,bS as t,bT as c}from"./chunks/framework.D5l_65jD.js";const v=JSON.parse('{"title":"S-modeの実装 (1. CSRの実装)","description":"","frontmatter":{},"headers":[],"relativePath":"23-smode-csr.md","filePath":"23-smode-csr.md"}'),r={name:"23-smode-csr.md"};function o(d,s,i,u,m,h){return e(),n("div",null,[...s[0]||(s[0]=[l(`<h1 id="s-modeの実装-1-csrの実装" tabindex="-1">S-modeの実装 (1. CSRの実装) <a class="header-anchor" href="#s-modeの実装-1-csrの実装" aria-label="Permalink to “S-modeの実装 (1. CSRの実装)”">​</a></h1><p>本章ではSupervisorモード(S-mode)を実装します。 S-modeは主にOSのようなシステムアプリケーションを動かすために使用される特権レベルです。 S-modeがある環境には必ずU-modeが実装されています。</p><p>S-modeを導入することで変わる主要な機能はトラップです。 M-mode、U-modeだけの環境ではトラップで特権レベルをM-modeに変更していましたが、 M-modeではなくS-modeに遷移できるようになります。 これに伴い、トラップ関連のCSR(stvec、sepc、scause、stvalなど)が追加されます。</p><p>S-modeで新しく導入される大きな機能として仮想記憶システムがあります。 仮想記憶システムはページングを使って仮想的なアドレスを使用できるようにする仕組みです。 これについては第18章「S-modeの実装 (2. 仮想記憶システム)」で解説します。</p><p>他にはscounterenレジスタ、トラップから戻るためのSRET命令などが追加されます。 また、Supervisor software interruptを提供するSSWIデバイスも実装します。 それぞれ解説しながら実装します。</p><p>eeiパッケージに、本書で実装するS-modeのCSRをすべて定義します。</p><p><span class="caption">▼リスト17.1: CSRのアドレスを定義する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrAddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; {
    <span class="hljs-comment">// Supervisor Trap Setup</span>
    SSTATUS = <span class="hljs-number">12&#39;h100</span>,
    SIE = <span class="hljs-number">12&#39;h104</span>,
    STVEC = <span class="hljs-number">12&#39;h105</span>,
    SCOUNTEREN = <span class="hljs-number">12&#39;h106</span>,
    <span class="hljs-comment">// Supervisor Trap Handling</span>
    SSCRATCH = <span class="hljs-number">12&#39;h140</span>,
    SEPC = <span class="hljs-number">12&#39;h141</span>,
    SCAUSE = <span class="hljs-number">12&#39;h142</span>,
    STVAL = <span class="hljs-number">12&#39;h143</span>,
    SIP = <span class="hljs-number">12&#39;h144</span>,
    <span class="hljs-comment">// Supervisor Protection and Translation</span>
    SATP = <span class="hljs-number">12&#39;h180</span>,
</code></pre></div><h2 id="misa-extensions、mstatus-sxl、mstatus-mppの実装" tabindex="-1">misa.Extensions、mstatus.SXL、mstatus.MPPの実装 <a class="header-anchor" href="#misa-extensions、mstatus-sxl、mstatus-mppの実装" aria-label="Permalink to “misa.Extensions、mstatus.SXL、mstatus.MPPの実装”">​</a></h2><p>S-modeを実装しているかどうかはmisa.ExtensionsのSビットで確認できます。</p><p>misa.ExtensionsのSビットを<code>1</code>に設定します (リスト2)。</p><p><span class="caption">▼リスト17.2: Sビットを1にする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> misa      : UIntX  = {<span class="hljs-number">2&#39;d2</span>, <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">28</span>, <span class="hljs-number">26&#39;b0000010</span><span class="custom-hl-bold"><span class="hljs-number">1</span></span><span class="hljs-number">000001000100000101</span>}; <span class="hljs-comment">// U, <span class="custom-hl-bold">S</span>, M, I, C, A</span>
</code></pre></div><p>S-modeのときのXLENはSXLENと定義されており、mstatus.SXLで確認できます。 本書ではSXLENが常に<code>64</code>になるように実装します。</p><p>mstatus.SXLを<code>64</code>を示す値である<code>2</code>に設定します ( リスト3、 リスト4 )。</p><p><span class="caption">▼リスト17.3: mstatus.SXLの定義 (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_UXL: UInt64 = <span class="hljs-number">2</span> &lt;&lt; <span class="hljs-number">32</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">const</span> MSTATUS_SXL: UInt64 = <span class="hljs-number">2</span> &lt;&lt; <span class="hljs-number">34</span>;</span>
</code></pre></div><p><span class="caption">▼リスト17.4: mstatus.SXLの初期値を設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        mode       = PrivMode::M;
        mstatus    = <span class="custom-hl-bold">MSTATUS_SXL |</span> MSTATUS_UXL;
</code></pre></div><p>今のところmstatus.MPPにはM-modeとU-modeを示す値しか書き込めないようにしているので、 S-modeの値(<code>2&#39;b10</code>)も書き込めるように変更します (リスト5)。 これにより、MRET命令でS-modeに移動できるようになります。</p><p><span class="caption">▼リスト17.5: MPPにS-modeを書き込めるようにする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> validate_mstatus (
    mstatus: <span class="hljs-keyword">input</span> UIntX,
    wdata  : <span class="hljs-keyword">input</span> UIntX,
) -&gt; UIntX {
    <span class="hljs-keyword">var</span> result: UIntX;
    result = wdata;
    <span class="hljs-comment">// MPP</span>
    <span class="hljs-keyword">if</span> <span class="custom-hl-bold">wdata[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>] == <span class="hljs-number">2&#39;b10</span></span> {
        result[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>] = mstatus[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>];
    }
    <span class="hljs-keyword">return</span> result;
}
</code></pre></div><h2 id="scounterenレジスタの実装" tabindex="-1">scounterenレジスタの実装 <a class="header-anchor" href="#scounterenレジスタの実装" aria-label="Permalink to “scounterenレジスタの実装”">​</a></h2><p><a href="./22-umode-csr.html">「16.6 mcounterenレジスタの実装」</a>では、 ハードウェアパフォーマンスモニタにU-modeでアクセスできるかをmcounterenレジスタで制御できるようにしました。 S-modeを導入するとmcounterenレジスタは S-modeがハードウェアパフォーマンスモニタにアクセスできるかを制御するレジスタに変わります。 また、mcounterenレジスタの代わりに U-modeでハードウェアパフォーマンスモニタにアクセスできるかを制御する32ビットのscounterenレジスタが追加されます。</p><p>scounterenレジスタのフィールドのビット配置はmcounterenレジスタと同じです。 また、U-modeでハードウェアパフォーマンスにアクセスできる条件は、 mcounterenレジスタとscounterenレジスタの両方によって許可されている場合になります。</p><p>scounterenレジスタを作成し、読み書きできるようにします ( リスト6、 リスト7、 リスト8、 リスト9、 リスト10、 リスト11 )。</p><p><span class="caption">▼リスト17.6: scounternレジスタの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> scounteren: UInt32;
</code></pre></div><p><span class="caption">▼リスト17.7: scounterenレジスタを0でリセットする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>mtval      = <span class="hljs-number">0</span>;
<span class="custom-hl-bold">scounteren = <span class="hljs-number">0</span>;</span>
led        = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト17.8: rdataにscounterenレジスタの値を設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVAL     : mtval,
<span class="custom-hl-bold">CsrAddr::SCOUNTEREN: {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">32</span>, scounteren},</span>
CsrAddr::LED       : led,
</code></pre></div><p><span class="caption">▼リスト17.9: 書き込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SCOUNTEREN_WMASK: UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0007</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.10: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVAL     : MTVAL_WMASK,
<span class="custom-hl-bold">CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,</span>
CsrAddr::LED       : LED_WMASK,
</code></pre></div><p><span class="caption">▼リスト17.11: scounterenレジスタに書き込む (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVAL     : mtval      = wdata;
<span class="custom-hl-bold">CsrAddr::SCOUNTEREN: scounteren = wdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>];</span>
CsrAddr::LED       : led        = wdata;
</code></pre></div><p>ハードウェアパフォーマンスモニタにアクセスするときに許可を確認する仕組みを実装します (リスト12)。 S-modeでアクセスするときはmcounterenレジスタだけ確認し、 U-modeでアクセスするときはmcounterenレジスタとscounterenレジスタを確認します。</p><p><span class="caption">▼リスト17.12: 許可の確認ロジックを変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_zicntr_priv       : <span class="hljs-keyword">logic</span> = is_wsc &amp;&amp; <span class="custom-hl-bold">(</span>mode <span class="custom-hl-bold">&lt;=</span> PrivMode::S &amp;&amp; <span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::CYCLE  : !mcounteren[<span class="hljs-number">0</span>],
    CsrAddr::TIME   : !mcounteren[<span class="hljs-number">1</span>],
    CsrAddr::INSTRET: !mcounteren[<span class="hljs-number">2</span>],
    <span class="hljs-keyword">default</span>         : <span class="hljs-number">0</span>,
} <span class="custom-hl-bold">|| mode &lt;= PrivMode::U &amp;&amp; <span class="hljs-keyword">case</span> csr_addr</span> <span class="custom-hl-bold">{</span>
    <span class="custom-hl-bold">CsrAddr::CYCLE  : !scounteren[<span class="hljs-number">0</span>],</span>
    <span class="custom-hl-bold">CsrAddr::TIME   : !scounteren[<span class="hljs-number">1</span>],</span>
    <span class="custom-hl-bold">CsrAddr::INSTRET: !scounteren[<span class="hljs-number">2</span>],</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span>         : <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">})</span>; <span class="hljs-comment">// attempt to access Zicntr CSR without permission</span>
</code></pre></div><h2 id="sstatusレジスタの実装" tabindex="-1">sstatusレジスタの実装 <a class="header-anchor" href="#sstatusレジスタの実装" aria-label="Permalink to “sstatusレジスタの実装”">​</a></h2><p><img src="`+p+`" alt="sstatusレジスタ"> sstatusレジスタはmstatusレジスタの一部をS-modeで読み込み、書き込みできるようにしたSXLENビットのレジスタです。 本章ではmstatusレジスタに読み込み、書き込みマスクを適用することでsstatusレジスタを実装します。</p><p>sstatusレジスタの書き込みマスクを定義します ( リスト13、 リスト14 )。</p><p><span class="caption">▼リスト17.13: 書き込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0000</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.14: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVAL     : MTVAL_WMASK,
<span class="custom-hl-bold">CsrAddr::SSTATUS   : SSTATUS_WMASK,</span>
CsrAddr::SCOUNTEREN: SCOUNTEREN_WMASK,
</code></pre></div><p>読み込みマスクを定義し、mstatusレジスタにマスクを適用した値をsstatusレジスタの値にします ( リスト15、 リスト16、 リスト17 )。</p><p><span class="caption">▼リスト17.15: 読み込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SSTATUS_RMASK: UIntX = <span class="hljs-number">&#39;h8000_0003_018f_e762</span>;
</code></pre></div><p><span class="caption">▼リスト17.16: sstatusの値をmstatusにマスクを適用したものにする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> sstatus   : UIntX  = mstatus &amp; SSTATUS_RMASK;
</code></pre></div><p><span class="caption">▼リスト17.17: rdataにsstatusレジスタの値を設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVAL     : mtval,
<span class="custom-hl-bold">CsrAddr::SSTATUS   : sstatus,</span>
CsrAddr::SCOUNTEREN: {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">32</span>, scounteren},
</code></pre></div><p>マスクを適用した書き込みを実装します (リスト18)。 書き込みマスクが適用されたwdataと、 書き込みマスクをビット反転した値でマスクされたmstatusレジスタの値のORを書き込みます。</p><p><span class="caption">▼リスト17.18: sstatusレジスタへの書き込みでmstatusレジスタに書き込む (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SSTATUS   : mstatus    = validate_mstatus(mstatus, wdata | mstatus &amp; ~SSTATUS_WMASK);
</code></pre></div><h2 id="トラップの委譲" tabindex="-1">トラップの委譲 <a class="header-anchor" href="#トラップの委譲" aria-label="Permalink to “トラップの委譲”">​</a></h2><h3 id="トラップの委譲-1" tabindex="-1">トラップの委譲 <a class="header-anchor" href="#トラップの委譲-1" aria-label="Permalink to “トラップの委譲”">​</a></h3><p>S-modeが実装されているとき、 S-modeとU-modeで発生するトラップの遷移先の特権レベルをM-modeからS-modeに変更(委譲)することができます。 特権レベルがM-modeのときに発生したトラップの特権レベルの遷移先をS-modeに変更することはできません。</p><p>M-modeからS-modeに委譲されたトラップのトラップベクタは、mtvecではなくstvecになります。 また、 mepcではなくsepcにトラップが発生した命令アドレスを格納し、 scauseにトラップの原因を示す値、 stvalに例外に固有の情報、 sstatus.SPPにトラップ前の特権レベル、 sstatus.SPIEにsstatus.SIE、 sstatus.SIEに<code>0</code>を格納します。 これ以降、トラップでx-modeに遷移するときに変更、参照するCSRを例えば xtvec、xepc、xcause、xtval、mstatus.xPPのように頭文字をxにして呼ぶことがあります。</p><h4 id="例外の委譲" tabindex="-1">例外の委譲 <a class="header-anchor" href="#例外の委譲" aria-label="Permalink to “例外の委譲”">​</a></h4><p>medelegレジスタは、どの例外を委譲するかを制御する64ビットのレジスタです。 medelegレジスタの下から<code>i</code>番目のビットが立っているとき、S-mode、U-modeで発生したcauseが<code>i</code>の例外をS-modeに委譲します。 M-modeで発生した例外はS-modeに委譲されません。</p><p>Environment call from M-mode例外のように委譲することができない命令のmedelegレジスタのビットは<code>1</code>に変更できません。</p><h4 id="割り込みの委譲" tabindex="-1">割り込みの委譲 <a class="header-anchor" href="#割り込みの委譲" aria-label="Permalink to “割り込みの委譲”">​</a></h4><p>midelegレジスタは、どの割り込みを委譲するかを制御するMXLENビットのレジスタです。 各割り込みはmie、mipレジスタと同じ場所のmidelegレジスタのビットによって委譲されるかどうかが制御されます。</p><p>M-mode、S-mode、U-modeが実装されたCPUで、割り込みでM-modeに遷移する条件は次の通りです。</p><ol><li>割り込み原因に対応したmipレジスタのビットが<code>1</code>である</li><li>割り込み原因に対応したmieレジスタのビットが<code>1</code>である</li><li>現在の特権レベルがM-mode未満である。またはmstatus.MIEが<code>1</code>である</li><li>割り込み原因に対応したmidelegレジスタのビットが<code>0</code>である</li></ol><p>割り込みでS-modeに遷移する条件は次の通りです。</p><ol><li>割り込み原因に対応したsipレジスタのビットが<code>1</code>である</li><li>割り込み原因に対応したsieレジスタのビットが<code>1</code>である</li><li>現在の特権レベルがS-mode未満である。またはS-modeのとき、sstatus.SIEが<code>1</code>である</li></ol><p>sip、sieレジスタは、それぞれmip、mieレジスタの委譲された割り込みのビットだけ読み込み、書き込みできるようにしたレジスタです。 委譲されていない割り込みに対応したビットは読み込み専用の<code>0</code>になります。 S-modeに委譲された割り込みは、特権レベルがM-modeのときは発生しません。</p><p>S-modeに委譲された割り込みは外部割り込み、ソフトウェア割り込み、タイマ割り込みの順に優先されます。 委譲されていない割り込みを同じタイミングで発生させられるとき、委譲されていない割り込みが優先されます。</p><p>本書ではM-modeの外部割り込み(Machine external interrupt)、 ソフトウェア割り込み(Machine software interrupt)、 タイマ割り込み(Machine timer interrupt)はS-modeに委譲できないように実装します<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><h3 id="トラップに関連するレジスタを作成する" tabindex="-1">トラップに関連するレジスタを作成する <a class="header-anchor" href="#トラップに関連するレジスタを作成する" aria-label="Permalink to “トラップに関連するレジスタを作成する”">​</a></h3><p>S-modeに委譲されたトラップで使用するstvec、sscratch、sepc、scause、stvalレジスタを作成します ( リスト19、 リスト20、 リスト21、 リスト22、 リスト23、 リスト24 )。</p><p><span class="caption">▼リスト17.19: レジスタの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> stvec     : UIntX ;
<span class="hljs-keyword">var</span> sscratch  : UIntX ;
<span class="hljs-keyword">var</span> sepc      : UIntX ;
<span class="hljs-keyword">var</span> scause    : UIntX ;
<span class="hljs-keyword">var</span> stval     : UIntX ;
</code></pre></div><p><span class="caption">▼リスト17.20: レジスタを0でリセットする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>stvec      = <span class="hljs-number">0</span>;
sscratch   = <span class="hljs-number">0</span>;
sepc       = <span class="hljs-number">0</span>;
scause     = <span class="hljs-number">0</span>;
stval      = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト17.21: rdataにレジスタの値を割り当てる (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::STVEC     : stvec,
CsrAddr::SSCRATCH  : sscratch,
CsrAddr::SEPC      : sepc,
CsrAddr::SCAUSE    : scause,
CsrAddr::STVAL     : stval,
</code></pre></div><p>それぞれ、mtvec、mscratch、mepc、mcause、mtvalレジスタと同じ書き込みマスクを設定します。</p><p><span class="caption">▼リスト17.22: 書き込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> STVEC_WMASK     : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_fffd</span>;
<span class="hljs-keyword">const</span> SSCRATCH_WMASK  : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
<span class="hljs-keyword">const</span> SEPC_WMASK      : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_fffe</span>;
<span class="hljs-keyword">const</span> SCAUSE_WMASK    : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
<span class="hljs-keyword">const</span> STVAL_WMASK     : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
</code></pre></div><p><span class="caption">▼リスト17.23: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::STVEC     : STVEC_WMASK,
CsrAddr::SSCRATCH  : SSCRATCH_WMASK,
CsrAddr::SEPC      : SEPC_WMASK,
CsrAddr::SCAUSE    : SCAUSE_WMASK,
CsrAddr::STVAL     : STVAL_WMASK,
</code></pre></div><p><span class="caption">▼リスト17.24: レジスタの書き込み (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::STVEC     : stvec      = wdata;
CsrAddr::SSCRATCH  : sscratch   = wdata;
CsrAddr::SEPC      : sepc       = wdata;
CsrAddr::SCAUSE    : scause     = wdata;
CsrAddr::STVAL     : stval      = wdata;
</code></pre></div><h3 id="stvecレジスタの実装" tabindex="-1">stvecレジスタの実装 <a class="header-anchor" href="#stvecレジスタの実装" aria-label="Permalink to “stvecレジスタの実装”">​</a></h3><p>トラップが発生するとき、 遷移先の特権レベルがS-modeならstvecレジスタの値にジャンプするようにします ( リスト25、 リスト26 )。 割り込み、例外それぞれにレジスタを選択する変数を定義し、 mtvecを使っていたところを新しい変数に置き換えます。</p><p><span class="caption">▼リスト17.25: トラップベクタを遷移先の特権レベルによって変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> interrupt_xtvec : Addr = <span class="hljs-keyword">if</span> interrupt_mode == PrivMode::M ? mtvec : stvec;</span>
<span class="hljs-keyword">let</span> interrupt_vector: Addr = <span class="hljs-keyword">if</span> <span class="custom-hl-bold">interrupt_x</span>tvec[<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> ?
    {<span class="custom-hl-bold">interrupt_x</span>tvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>}
: <span class="hljs-comment">// Direct</span>
    {<span class="custom-hl-bold">interrupt_x</span>tvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>] + interrupt_cause[<span class="hljs-keyword">msb</span> - <span class="hljs-number">2</span>:<span class="hljs-number">0</span>], <span class="hljs-number">2&#39;b0</span>}
; <span class="hljs-comment">// Vectored</span>
</code></pre></div><p><span class="caption">▼リスト17.26: トラップベクタを遷移先の特権レベルによって変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> expt_xtvec : Addr     = <span class="hljs-keyword">if</span> expt_mode == PrivMode::M ? mtvec : stvec;</span>
<span class="hljs-keyword">let</span> expt_vector: Addr     = {<span class="custom-hl-bold">expt_x</span>tvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>};
</code></pre></div><h3 id="トラップでsepc、scause、stvalレジスタを変更する" tabindex="-1">トラップでsepc、scause、stvalレジスタを変更する <a class="header-anchor" href="#トラップでsepc、scause、stvalレジスタを変更する" aria-label="Permalink to “トラップでsepc、scause、stvalレジスタを変更する”">​</a></h3><p>トラップが発生するとき、 遷移先の特権レベルがS-modeならsepc、scause、stvalレジスタを変更するようにします。</p><p>トラップ時に<code>trap_mode_next</code>で処理を分岐します (リスト27)。</p><p><span class="caption">▼リスト17.27: 遷移先の特権レベルによってトラップ処理を分岐する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> raise_expt || raise_interrupt {
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> x</span>epc<span class="custom-hl-bold">: Addr</span> = <span class="hljs-keyword">if</span> raise_expt ? pc : <span class="hljs-comment">// exception</span>
    <span class="hljs-keyword">if</span> raise_interrupt &amp;&amp; is_wfi ? pc + <span class="hljs-number">4</span> : pc; <span class="hljs-comment">// interrupt when wfi / interrupt</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> trap_mode_next == PrivMode::M {</span>
        <span class="custom-hl-bold">mepc   = xepc;</span>
        mcause = trap_cause;
        <span class="hljs-keyword">if</span> raise_expt {
            mtval = expt_value;
        }
        <span class="hljs-comment">// save mstatus.mie to mstatus.mpie</span>
        <span class="hljs-comment">// and set mstatus.mie = 0</span>
        mstatus[<span class="hljs-number">7</span>] = mstatus[<span class="hljs-number">3</span>];
        mstatus[<span class="hljs-number">3</span>] = <span class="hljs-number">0</span>;
        <span class="hljs-comment">// save current privilege level to mstatus.mpp</span>
        mstatus[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>] = mode;
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
    <span class="custom-hl-bold">   sepc   = xepc;</span>
    <span class="custom-hl-bold">   scause = trap_cause;</span>
    <span class="custom-hl-bold">   <span class="hljs-keyword">if</span> raise_expt {</span>
    <span class="custom-hl-bold">       stval = expt_value;</span>
    <span class="custom-hl-bold">   }</span>
    <span class="custom-hl-bold">}</span>
</code></pre></div><h3 id="mstatusのsie、spie、sppビットを実装する" tabindex="-1">mstatusのSIE、SPIE、SPPビットを実装する <a class="header-anchor" href="#mstatusのsie、spie、sppビットを実装する" aria-label="Permalink to “mstatusのSIE、SPIE、SPPビットを実装する”">​</a></h3><p>mstatusレジスタのSIE、SPIE、SPPビットを実装します。 mstatus.SIEはS-modeに委譲された割り込みのグローバル割り込みイネーブルビットです。 mstatus.SPIEはS-modeに委譲されたトラップが発生するときにmstatus.SIEを退避するビットです。 mstatus.SPPはS-modeに委譲されたトラップが発生するときに、トラップ前の特権レベルを書き込むビットです。 S-modeに委譲されたトラップはS-modeかU-modeでしか発生しないため、 mstatus.SPPは特権レベルを区別するために十分な1ビット幅のフィールドになっています。</p><p>mstatus、sstatusレジスタのSIE、SPIE、SPPビットに書き込めるようにします ( リスト28、 リスト29 )。</p><p><span class="caption">▼リスト17.28: 書き込みマスクを変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_0020_1</span><span class="custom-hl-bold"><span class="hljs-number">9</span>aa</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.29: 書き込みマスクを変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0</span><span class="custom-hl-bold"><span class="hljs-number">122</span></span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p>トラップでS-modeに遷移するとき、 sstatus.SPIEにsstatus.SIE、 sstatus.SIEに<code>0</code>、 sstatus.SPPにトラップ前の特権レベルを格納します (リスト30)。</p><p><span class="caption">▼リスト17.30: sstatus.SPIE、SIE、SPPをトラップで変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> {
    sepc   = xepc;
    scause = trap_cause;
    <span class="hljs-keyword">if</span> raise_expt {
        stval = expt_value;
    }
    <span class="custom-hl-bold"><span class="hljs-comment">// save sstatus.sie to sstatus.spie</span></span>
    <span class="custom-hl-bold"><span class="hljs-comment">// and set sstatus.sie = 0</span></span>
    <span class="custom-hl-bold">mstatus[<span class="hljs-number">5</span>] = mstatus[<span class="hljs-number">1</span>];</span>
    <span class="custom-hl-bold">mstatus[<span class="hljs-number">1</span>] = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold"><span class="hljs-comment">// save current privilege mode (S or U) to sstatus.spp</span></span>
    <span class="custom-hl-bold">mstatus[<span class="hljs-number">8</span>] = mode[<span class="hljs-number">0</span>];</span>
}
</code></pre></div><h3 id="sret命令を実装する" tabindex="-1">SRET命令を実装する <a class="header-anchor" href="#sret命令を実装する" aria-label="Permalink to “SRET命令を実装する”">​</a></h3><h4 id="sret命令の実装" tabindex="-1">SRET命令の実装 <a class="header-anchor" href="#sret命令の実装" aria-label="Permalink to “SRET命令の実装”">​</a></h4><p>SRET命令は、S-modeのCSR(sepc、sstatusなど)を利用してトラップ処理から戻るための命令です。 SRET命令はS-mode以上の特権レベルのときにしか実行できません。</p><p>inst_decoderモジュールでSRET命令をデコードできるようにします (リスト31)。</p><p><span class="caption">▼リスト17.31: SRET命令のときvalidを1にする (inst_decoder.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_SYSTEM: f3 != <span class="hljs-number">3&#39;b000</span> &amp;&amp; f3 != <span class="hljs-number">3&#39;b100</span> || <span class="hljs-comment">// CSRR(W|S|C)[I]</span>
 bits == <span class="hljs-number">32&#39;h00000073</span> || <span class="hljs-comment">// ECALL</span>
 bits == <span class="hljs-number">32&#39;h00100073</span> || <span class="hljs-comment">// EBREAK</span>
 bits == <span class="hljs-number">32&#39;h30200073</span> || <span class="hljs-comment">//MRET</span>
 <span class="custom-hl-bold">bits == <span class="hljs-number">32&#39;h10200073</span> || <span class="hljs-comment">//SRET</span></span>
 bits == <span class="hljs-number">32&#39;h10500073</span>, <span class="hljs-comment">// WFI</span>
</code></pre></div><p>SRET命令を判定し、ジャンプ先と遷移先の特権レベルを命令によって切り替えます ( リスト32、 リスト33、 リスト34 )。</p><p><span class="caption">▼リスト17.32: SRT命令の判定 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> is_sret: <span class="hljs-keyword">logic</span> = inst_bits == <span class="hljs-number">32&#39;h10200073</span>;
</code></pre></div><p><span class="caption">▼リスト17.33: SRET命令のとき遷移先の特権レベル、アドレスを変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> trap_return        = valid &amp;&amp; <span class="custom-hl-bold">(</span>is_mret <span class="custom-hl-bold">|| is_sret)</span> &amp;&amp; !raise_expt &amp;&amp; !raise_interrupt;
<span class="hljs-keyword">let</span> trap_return_mode  : PrivMode = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_mret ?</span> mstatus_mpp <span class="custom-hl-bold">: mstatus_spp</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> trap_return_vector: Addr     = <span class="hljs-keyword">if</span> is_mret ? mepc : sepc;</span>
</code></pre></div><p><span class="caption">▼リスト17.34: trap_return_vectorをtrap_vectorに割り当てる (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> trap_vector = <span class="hljs-keyword">switch</span> {
    raise_expt     : expt_vector,
    raise_interrupt: interrupt_vector,
    trap_return    : <span class="custom-hl-bold">trap_return_vector</span>,
    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,
};
</code></pre></div><p>SRET命令を実行するとき、 sstatus.SIEにsstatus.SPIE、 sstatus.SPIEに<code>0</code>、 sstatus.SPPに実装がサポートする最小の特権レベル(U-mode)を示す値を格納します (リスト35)。</p><p><span class="caption">▼リスト17.35: SRET命令によるsstatusの変更 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> trap_return {
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_mret {</span>
        <span class="hljs-comment">// set mstatus.mie = mstatus.mpie</span>
        <span class="hljs-comment">//     mstatus.mpie = 0</span>
        mstatus[<span class="hljs-number">3</span>] = mstatus[<span class="hljs-number">7</span>];
        mstatus[<span class="hljs-number">7</span>] = <span class="hljs-number">0</span>;
        <span class="hljs-comment">// set mstatus.mpp = U (least privilege level)</span>
        mstatus[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>] = PrivMode::U;
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> is_sret {</span>
    <span class="custom-hl-bold">    <span class="hljs-comment">// set sstatus.sie = sstatus.spie</span></span>
    <span class="custom-hl-bold">    <span class="hljs-comment">//     sstatus.spie = 0</span></span>
    <span class="custom-hl-bold">    mstatus[<span class="hljs-number">1</span>] = mstatus[<span class="hljs-number">5</span>];</span>
    <span class="custom-hl-bold">    mstatus[<span class="hljs-number">5</span>] = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">    <span class="hljs-comment">// set sstatus.spp = U (least privilege level)</span></span>
    <span class="custom-hl-bold">    mstatus[<span class="hljs-number">8</span>] = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><p>SRET命令をS-mode未満の特権レベルで実行しようとしたら例外が発生するようにします (リスト36)。</p><p><span class="caption">▼リスト17.36: SRET命令を実行するときに特権レベルを確認する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_trap_return_priv: <span class="hljs-keyword">logic</span> = (is_mret &amp;&amp; mode &lt;: PrivMode::M) <span class="custom-hl-bold">|| (is_sret &amp;&amp; mode &lt;: PrivMode::S)</span>;
</code></pre></div><h4 id="mstatus-tsrの実装" tabindex="-1">mstatus.TSRの実装 <a class="header-anchor" href="#mstatus-tsrの実装" aria-label="Permalink to “mstatus.TSRの実装”">​</a></h4><p>mstatusレジスタのTSR(Trap SRET)ビットは、 SRET命令をS-modeで実行したときに例外を発生させるかを制御するビットです。 <code>1</code>のとき、Illegal instruction例外が発生するようになります。</p><p>mstatus.TSRを変更できるようにします (リスト37)。</p><p><span class="caption">▼リスト17.37: 書き込みマスクを変更する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MSTATUS_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_00</span><span class="custom-hl-bold"><span class="hljs-number">6</span></span><span class="hljs-number">0_19</span>aa <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p>例外を判定します ( リスト38、 リスト39 )。</p><p><span class="caption">▼リスト17.38: TSRビットを表す変数 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mstatus_tsr : <span class="hljs-keyword">logic</span>    = mstatus[<span class="hljs-number">22</span>];
</code></pre></div><p><span class="caption">▼リスト17.39: mstatus.TSRが1のときにS-modeでSRET命令を実行したら例外にする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_trap_return_priv: <span class="hljs-keyword">logic</span> = (is_mret &amp;&amp; mode &lt;: PrivMode::M) || (is_sret &amp;&amp; <span class="custom-hl-bold">(</span>mode &lt;: PrivMode::S <span class="custom-hl-bold">|| (mode == PrivMode::S &amp;&amp; mstatus_tsr)</span>));
</code></pre></div><h3 id="sei、ssi、stiを実装する" tabindex="-1">SEI、SSI、STIを実装する <a class="header-anchor" href="#sei、ssi、stiを実装する" aria-label="Permalink to “SEI、SSI、STIを実装する”">​</a></h3><p>S-modeを導入すると、 S-modeの外部割り込み(Supervisor external interrupt)、 ソフトウェア割り込み(Supervisor software interrupt)、 タイマ割り込み(Supervisor timer interrupt)に対応する mip、mieレジスタのビットを変更できるようになります。</p><p>例外、割り込みはそれぞれmedeleg、midelegレジスタでS-modeに処理を委譲することができます。 委譲された割り込みのmipレジスタの値はsipレジスタで観測できるようになり、 割り込みを有効にするかをsieレジスタで制御できるようになります。</p><h4 id="mip、mieレジスタの変更" tabindex="-1">mip、mieレジスタの変更 <a class="header-anchor" href="#mip、mieレジスタの変更" aria-label="Permalink to “mip、mieレジスタの変更”">​</a></h4><p>mipレジスタのSEIP、SSIP、STIPビット、 mieレジスタのSEIE、SSIE、STIEビットを変更できるようにします。</p><p>書き込みマスクを変更、実装します ( リスト40、 リスト41 )。</p><p><span class="caption">▼リスト17.40: 書き込みマスクの定義 / 変更 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">const</span> MIP_WMASK       : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0222</span> <span class="hljs-keyword">as</span> UIntX;</span>
<span class="hljs-keyword">const</span> MIE_WMASK       : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0</span><span class="custom-hl-bold"><span class="hljs-number">2</span>aa</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.41: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MIP       : MIP_WMASK,
</code></pre></div><p><code>mip_reg</code>レジスタを作成します。 <code>mip</code>の値を、<code>mip_reg</code>とACLINTの状態をOR演算したものに変更します (リスト42)。</p><p><span class="caption">▼リスト17.42: レジスタを作成して変数に適用する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">var</span> mip_reg: UIntX;</span>
<span class="hljs-keyword">let</span> mip    : UIntX = <span class="custom-hl-bold">mip_reg |</span> {
</code></pre></div><p><code>mip_reg</code>レジスタのリセット、書き込みを実装します ( リスト43、 リスト44 )。 <code>wdata</code>にはACLINTの状態が含まれているので、書き込みマスクをもう一度適用します。</p><p><span class="caption">▼リスト17.43: レジスタの値を0でリセットする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>mie        = <span class="hljs-number">0</span>;
<span class="custom-hl-bold">mip_reg    = <span class="hljs-number">0</span>;</span>
mcounteren = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト17.44: mipレジスタの書き込み (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MTVEC     : mtvec      = wdata;
<span class="custom-hl-bold">CsrAddr::MIP       : mip_reg    = wdata &amp; MIP_WMASK;</span>
CsrAddr::MIE       : mie        = wdata;
</code></pre></div><h4 id="causeの設定" tabindex="-1">causeの設定 <a class="header-anchor" href="#causeの設定" aria-label="Permalink to “causeの設定”">​</a></h4><p>S-modeの割り込みのcauseを設定します (リスト45)。</p><p><span class="caption">▼リスト17.45: 割り込み原因の追加 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> interrupt_cause  : UIntX = <span class="hljs-keyword">switch</span> {
    interrupt_pending[<span class="hljs-number">3</span>]: CsrCause::MACHINE_SOFTWARE_INTERRUPT,
    interrupt_pending[<span class="hljs-number">7</span>]: CsrCause::MACHINE_TIMER_INTERRUPT,
    <span class="custom-hl-bold">interrupt_pending[<span class="hljs-number">9</span>]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,</span>
    <span class="custom-hl-bold">interrupt_pending[<span class="hljs-number">1</span>]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,</span>
    <span class="custom-hl-bold">interrupt_pending[<span class="hljs-number">5</span>]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,</span>
    <span class="hljs-keyword">default</span>             : <span class="hljs-number">0</span>,
};
</code></pre></div><h4 id="medeleg、mideleg、sip、sieレジスタの実装" tabindex="-1">medeleg、mideleg、sip、sieレジスタの実装 <a class="header-anchor" href="#medeleg、mideleg、sip、sieレジスタの実装" aria-label="Permalink to “medeleg、mideleg、sip、sieレジスタの実装”">​</a></h4><p><img src="`+t+'" alt="sipレジスタ"><img src="'+c+`" alt="sieレジスタ"> medeleg、mideleg、sip、sieレジスタを実装します。</p><p>medeleg、midelegレジスタはそれぞれ委譲できる例外、割り込みに対応するビットだけ書き換えられるようにします。 sipレジスタはmidelegレジスタで委譲された割り込みに対応するビットだけ値を参照できるように、 sieレジスタはmidelegレジスタで委譲された割り込みに対応するビットだけ書き換えられるようにします。</p><p>レジスタを作成し、読み込めるようにします ( リスト46、 リスト47、 リスト48、 リスト49、 リスト50、 リスト51 )。</p><p><span class="caption">▼リスト17.46: medeleg、midelegレジスタの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> medeleg   : UInt64;
<span class="hljs-keyword">var</span> mideleg   : UIntX ;
</code></pre></div><p><span class="caption">▼リスト17.47: sie、sieレジスタの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> sip       : UIntX  = mip &amp; mideleg;
<span class="hljs-keyword">var</span> sie       : UIntX ;
</code></pre></div><p><span class="caption">▼リスト17.48: medeleg、midelegレジスタを0でリセットする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>medeleg    = <span class="hljs-number">0</span>;
mideleg    = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト17.49: sieレジスタを0でリセットする (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>sie        = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト17.50: rdataにmedeleg、midelegレジスタの値を割り当てる (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MEDELEG   : medeleg,
CsrAddr::MIDELEG   : mideleg,
</code></pre></div><p><span class="caption">▼リスト17.51: rdataにsip、sieレジスタの値を割り当てる (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SIP       : sip,
CsrAddr::SIE       : sie &amp; mideleg,
</code></pre></div><p>書き込みマスクを設定し、書き込めるようにします ( リスト52、 リスト53、 リスト54、 リスト55、 リスト56、 リスト57 )。</p><p><span class="caption">▼リスト17.52: 書き込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MEDELEG_WMASK   : UIntX = <span class="hljs-number">&#39;hffff_ffff_fffe_f7ff</span>;
<span class="hljs-keyword">const</span> MIDELEG_WMASK   : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0222</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.53: 書き込みマスクの定義 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> SIE_WMASK       : UIntX = <span class="hljs-number">&#39;h0000_0000_0000_0222</span> <span class="hljs-keyword">as</span> UIntX;
</code></pre></div><p><span class="caption">▼リスト17.54: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MEDELEG   : MEDELEG_WMASK,
CsrAddr::MIDELEG   : MIDELEG_WMASK,
</code></pre></div><p><span class="caption">▼リスト17.55: wmaskに書き込みマスクを設定する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SIE       : SIE_WMASK &amp; mideleg,
</code></pre></div><p><span class="caption">▼リスト17.56: medeleg、midelegレジスタの書き込み (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MEDELEG   : medeleg    = wdata;
CsrAddr::MIDELEG   : mideleg    = wdata;
</code></pre></div><p><span class="caption">▼リスト17.57: sieレジスタの書き込み (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::SIE       : sie        = wdata;
</code></pre></div><h3 id="割り込み条件、トラップの動作を変更する" tabindex="-1">割り込み条件、トラップの動作を変更する <a class="header-anchor" href="#割り込み条件、トラップの動作を変更する" aria-label="Permalink to “割り込み条件、トラップの動作を変更する”">​</a></h3><p>作成したCSRを利用して、割り込みが発生する条件、トラップが発生したときのCSRの操作を変更します。</p><p>例外が発生するとき、遷移先の特権レベルをmedelegレジスタによって変更します (リスト58）。</p><p><span class="caption">▼リスト17.58: 例外の遷移先の特権レベルを求める (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> expt_mode  : PrivMode = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> mode == PrivMode::M || !medeleg[expt_cause[<span class="hljs-number">5</span>:<span class="hljs-number">0</span>]] ?</span> PrivMode::M <span class="custom-hl-bold">: PrivMode::S</span>;
</code></pre></div><p>割り込みの発生条件と参照するCSRを、遷移先の特権レベルごとに用意します ( リスト59、 リスト60 ）。</p><p><span class="caption">▼リスト17.59: M-modeに遷移する割り込みを示す変数 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Interrupt to M-mode</span>
<span class="hljs-keyword">let</span> interrupt_pending_mmode: UIntX = mip &amp; mie &amp; ~mideleg;
<span class="hljs-keyword">let</span> raise_interrupt_mmode  : <span class="hljs-keyword">logic</span> = (mode != PrivMode::M || mstatus_mie) &amp;&amp; interrupt_pending_mmode != <span class="hljs-number">0</span>;
<span class="hljs-keyword">let</span> interrupt_cause_mmode  : UIntX = <span class="hljs-keyword">switch</span> {
    interrupt_pending_mmode[<span class="hljs-number">3</span>]: CsrCause::MACHINE_SOFTWARE_INTERRUPT,
    interrupt_pending_mmode[<span class="hljs-number">7</span>]: CsrCause::MACHINE_TIMER_INTERRUPT,
    interrupt_pending_mmode[<span class="hljs-number">9</span>]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,
    interrupt_pending_mmode[<span class="hljs-number">1</span>]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,
    interrupt_pending_mmode[<span class="hljs-number">5</span>]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,
    <span class="hljs-keyword">default</span>                   : <span class="hljs-number">0</span>,
};
</code></pre></div><p><span class="caption">▼リスト17.60: S-modeに遷移する割り込みを示す変数 (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Interrupt to S-mode</span>
<span class="hljs-keyword">let</span> interrupt_pending_smode: UIntX = sip &amp; sie;
<span class="hljs-keyword">let</span> raise_interrupt_smode  : <span class="hljs-keyword">logic</span> = (mode &lt;: PrivMode::S || (mode == PrivMode::S &amp;&amp; mstatus_sie)) &amp;&amp; interrupt_pending_smode != <span class="hljs-number">0</span>;
<span class="hljs-keyword">let</span> interrupt_cause_smode  : UIntX = <span class="hljs-keyword">switch</span> {
    interrupt_pending_smode[<span class="hljs-number">9</span>]: CsrCause::SUPERVISOR_EXTERNAL_INTERRUPT,
    interrupt_pending_smode[<span class="hljs-number">1</span>]: CsrCause::SUPERVISOR_SOFTWARE_INTERRUPT,
    interrupt_pending_smode[<span class="hljs-number">5</span>]: CsrCause::SUPERVISOR_TIMER_INTERRUPT,
    <span class="hljs-keyword">default</span>                   : <span class="hljs-number">0</span>,
};
</code></pre></div><p>M-mode向けの割り込みを優先して利用します (リスト61）。</p><p><span class="caption">▼リスト17.61: M-mode、S-modeに遷移する割り込みを調停する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Interrupt</span>
<span class="hljs-keyword">let</span> raise_interrupt : <span class="hljs-keyword">logic</span> = valid &amp;&amp; can_intr &amp;&amp; (<span class="custom-hl-bold">raise_interrupt_mmode || raise_interrupt_smode</span>);
<span class="hljs-keyword">let</span> interrupt_cause : UIntX = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_interrupt_mmode ? interrupt_cause_mmode : interrupt_cause_smode</span>;
<span class="hljs-keyword">let</span> interrupt_xtvec : Addr  = <span class="hljs-keyword">if</span> interrupt_mode == PrivMode::M ? mtvec : stvec;
<span class="hljs-keyword">let</span> interrupt_vector: Addr  = <span class="hljs-keyword">if</span> interrupt_xtvec[<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> ?
    {interrupt_xtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>], <span class="hljs-number">2&#39;b0</span>}
: <span class="hljs-comment">// Direct</span>
    {interrupt_xtvec[<span class="hljs-keyword">msb</span>:<span class="hljs-number">2</span>] + interrupt_cause[<span class="hljs-keyword">msb</span> - <span class="hljs-number">2</span>:<span class="hljs-number">0</span>], <span class="hljs-number">2&#39;b0</span>}
; <span class="hljs-comment">// Vectored</span>
<span class="hljs-keyword">let</span> interrupt_mode: PrivMode = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_interrupt_mmode ?</span> PrivMode::M <span class="custom-hl-bold">: PrivMode::S</span>;
</code></pre></div><h2 id="ソフトウェア割り込みの実装-sswi" tabindex="-1">ソフトウェア割り込みの実装 (SSWI) <a class="header-anchor" href="#ソフトウェア割り込みの実装-sswi" aria-label="Permalink to “ソフトウェア割り込みの実装 (SSWI)”">​</a></h2><p>SSWIデバイスはソフトウェア割り込み(Supervisor software insterrupt)を提供するためのデバイスです。 SSWIデバイスにはハードウェアスレッド毎に4バイトのSETSSIPレジスタが用意されています(表1) SETSSIPレジスタを読み込むと常に<code>0</code>を返しますが、 最下位ビットに<code>1</code>を書き込むとそれに対応するハードウェアスレッドのmip.SSIPビットが<code>1</code>になります。</p><div id="sswi.map.reg" class="table"><p class="caption">表17.1: SSWIデバイスのメモリマップ</p><table><tr class="hline"><th>オフセット</th><th>レジスタ</th></tr><tr class="hline"><td>0000</td><td>SETSSIP0</td></tr><tr class="hline"><td>0004</td><td>SETSSIP1</td></tr><tr class="hline"><td>..</td><td>..</td></tr><tr class="hline"><td>3ff8</td><td>SETSSIP4094</td></tr><tr class="hline"><td>3ffc</td><td>MTIME</td></tr></table></div> ![setssipレジスタ](./images/23-smode-csr/setssip.png) 今のところmhartidが\`0\`のハードウェアスレッドしか存在しないため、SETSSIP0のみ実装します。 aclint_ifインターフェースに、 mipレジスタのSSIPビットを\`1\`にする要求のための\`setssip\`を作成します ( リスト62 ）。 <p><span class="caption">▼リスト17.62: setssipをインターフェースに追加する (aclint_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">interface</span> aclint_if {
    <span class="hljs-keyword">var</span> msip   : <span class="hljs-keyword">logic</span> ;
    <span class="hljs-keyword">var</span> mtip   : <span class="hljs-keyword">logic</span> ;
    <span class="hljs-keyword">var</span> mtime  : UInt64;
    <span class="custom-hl-bold"><span class="hljs-keyword">var</span> setssip: <span class="hljs-keyword">logic</span> ;</span>
    <span class="hljs-keyword">modport</span> master {
        msip   : <span class="hljs-keyword">output</span>,
        mtip   : <span class="hljs-keyword">output</span>,
        mtime  : <span class="hljs-keyword">output</span>,
        <span class="custom-hl-bold">setssip: <span class="hljs-keyword">output</span>,</span>
    }
</code></pre></div><p>aclintモジュールでSETSSIP0への書き込みを検知し、最下位ビットを<code>setssip</code>に接続します ( リスト63 )。</p><p><span class="caption">▼リスト17.63: SETSSIP0に書き込むときsetssipにLSBを割り当てる (aclint_memory.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    aclint.setssip = <span class="hljs-number">0</span>;
    <span class="hljs-keyword">if</span> membus.valid &amp;&amp; membus.wen &amp;&amp; membus.addr == MMAP_ACLINT_SETSSIP {
        aclint.setssip = membus.wdata[<span class="hljs-number">0</span>];
    }
}
</code></pre></div><p>csrunitモジュールで<code>setssip</code>を確認し、mip.SSIPを立てるようにします ( リスト64、 リスト65、 リスト66 )。</p><p><span class="caption">▼リスト17.64: setssipをXLENビットに拡張する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> setssip: UIntX = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">2</span>, aclint.setssip, <span class="hljs-number">1&#39;b0</span>};
</code></pre></div><p><span class="caption">▼リスト17.65: setssipでmipを更新する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> {
    mcycle  += <span class="hljs-number">1</span>;
    mip_reg |= setssip;
</code></pre></div><p><span class="caption">▼リスト17.66: setssipでmipを更新する (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>CsrAddr::MIP       : mip_reg    = <span class="custom-hl-bold">(</span>wdata &amp; MIP_WMASK<span class="custom-hl-bold">) | setssip</span>;
</code></pre></div><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>多くの実装ではこれらの割り込みを委譲できないように実装するようです。そのため、本書で実装するコアでも委譲できないように実装します。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li></ol></section>`,221)])])}const b=a(r,[["render",o]]);export{v as __pageData,b as default};
