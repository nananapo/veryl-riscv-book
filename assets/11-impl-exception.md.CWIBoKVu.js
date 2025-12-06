import{_ as l,c,o as p,ah as e,j as s,a,bA as d}from"./chunks/framework.B0Vze7XN.js";const h=JSON.parse('{"title":"例外の実装","description":"","frontmatter":{},"headers":[],"relativePath":"11-impl-exception.md","filePath":"11-impl-exception.md"}'),t={name:"11-impl-exception.md"};function o(r,n,b,i,m,f){return p(),c("div",null,[...n[0]||(n[0]=[e(`<h1 id="例外の実装" tabindex="-1">例外の実装 <a class="header-anchor" href="#例外の実装" aria-label="Permalink to “例外の実装”">​</a></h1><h2 id="例外とは何か" tabindex="-1">例外とは何か? <a class="header-anchor" href="#例外とは何か" aria-label="Permalink to “例外とは何か?”">​</a></h2><p>CPUがソフトウェアを実行するとき、 処理を中断したり終了しなければならないような異常な状態<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>が発生することがあります。 例えば、実行環境(EEI)がサポートしていない、 または実行を禁止しているような違法(illegal)<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>な命令を実行しようとする場合です。 このとき、CPUはどのような動作をすればいいのでしょうか？</p><p>RISC-Vでは、命令によって引き起こされる異常な状態のことを<strong>例外(Exception)</strong>と呼び、 例外が発生した場合には<strong>トラップ(Trap)</strong>を引き起こします。 トラップとは例外、または割り込み(Interrupt)<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>によってCPUの状態、制御を変更することです。 具体的にはPCをトラップベクタ(trap vector)に移動したり、CSRを変更します。</p><p>本書では既にECALL命令の実行によって発生するEnvironment call from M-mode例外を実装しており、 例外が発生したら次のように動作します。</p><ol><li>mcauseレジスタにトラップの発生原因を示す値(<code>11</code>)を書き込む</li><li>mepcレジスタにPCの値を書き込む</li><li>PCをmtvecレジスタの値に設定する</li></ol><p>本章では、例外発生時に例外に固有の情報を書き込むmtvalレジスタと、現在の実装で発生する可能性がある例外を実装します。 本書ではこれ以降、トラップの発生原因を示す値のことをcauseと呼びます。</p><h2 id="例外情報の伝達" tabindex="-1">例外情報の伝達 <a class="header-anchor" href="#例外情報の伝達" aria-label="Permalink to “例外情報の伝達”">​</a></h2><h3 id="environment-call-from-m-mode例外をifステージで処理する" tabindex="-1">Environment call from M-mode例外をIFステージで処理する <a class="header-anchor" href="#environment-call-from-m-mode例外をifステージで処理する" aria-label="Permalink to “Environment call from M-mode例外をIFステージで処理する”">​</a></h3><p>今のところ、ECALL命令による例外はMEM(CSR)ステージのcsrunitモジュールで例外判定、処理されています。 ECALL命令によって例外が発生するかは命令がECALLであるかどうかだけを判定すれば分かるため、 命令をデコードする時点、つまりIDステージで判定できます。</p><p>本章で実装する例外にはMEMステージよりも前で発生する例外があるため、 IDステージから順に次のステージに例外の有無、causeを受け渡していく仕組みを実装します。</p><p>まず、例外が発生するかどうか(<code>valid</code>)、例外のcause(<code>cause</code>)をまとめた<code>ExceptionInfo</code>構造体を定義します (リスト1)。</p><p><span class="caption">▼リスト10.1: ExceptionInfo構造体を定義する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// 例外の情報を保存するための型</span>
<span class="hljs-keyword">struct</span> ExceptionInfo {
    valid: <span class="hljs-keyword">logic</span>   ,
    cause: CsrCause,
}
</code></pre></div><p>EXステージ、MEMステージのFIFOのデータ型に構造体を追加します (リスト2、リスト3)。</p><p><span class="caption">▼リスト10.2: EXステージのFIFOにExceptionInfoを追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> exq_type {
    addr: Addr         ,
    bits: Inst         ,
    ctrl: InstCtrl     ,
    imm : UIntX        ,
    <span class="custom-hl-bold">expt: ExceptionInfo,</span>
}
</code></pre></div><p><span class="caption">▼リスト10.3: MEMステージのFIFOにExceptionInfoを追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> memq_type {
    addr      : Addr            ,
    bits      : Inst            ,
    ctrl      : InstCtrl        ,
    imm       : UIntX           ,
    <span class="custom-hl-bold">expt      : ExceptionInfo   ,</span>
    alu_result: UIntX           ,
    rs1_addr  : <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">5</span>&gt;,
</code></pre></div><p>IDステージからEXステージに命令を渡すとき、 命令がECALL命令なら例外が発生することを伝えます (リスト4)。</p><p><span class="caption">▼リスト10.4: IDステージでECALL命令を判定する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// ID -&gt; EX</span>
    if_fifo_rready = exq_wready;
    exq_wvalid     = if_fifo_rvalid;
    exq_wdata.addr = if_fifo_rdata.addr;
    exq_wdata.bits = if_fifo_rdata.bits;
    exq_wdata.ctrl = ids_ctrl;
    exq_wdata.imm  = ids_imm;
    <span class="custom-hl-bold"><span class="hljs-comment">// exception</span></span>
    <span class="custom-hl-bold">exq_wdata.expt.valid = ids_inst_bits == <span class="hljs-number">32&#39;h00000073</span>; <span class="hljs-comment">// ECALL</span></span>
    <span class="custom-hl-bold">exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;</span>
}
</code></pre></div><p>EXステージで例外は発生しないので、 例外情報をそのままMEMステージに渡します (リスト5)。</p><p><span class="caption">▼リスト10.5: EXステージからMEMステージに例外情報を渡す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p>`,24),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"always_comb"),a(` {
    `),s("span",{class:"hljs-comment"},"// EX -> MEM"),a(`
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},`    exq_rready            = memq_wready && !exs_stall;
    memq_wvalid           = exq_rvalid && !exs_stall;
    memq_wdata.addr       = exq_rdata.addr;
    memq_wdata.bits       = exq_rdata.bits;
    memq_wdata.ctrl       = exq_rdata.ctrl;
    memq_wdata.imm        = exq_rdata.imm;
    memq_wdata.rs1_addr   = exs_rs1_addr;
    memq_wdata.rs1_data   = exs_rs1_data;
`)]),a(`    memq_wdata.rs2_data   = exs_rs2_data;
    memq_wdata.alu_result = `),s("span",{class:"hljs-keyword"},"if"),a(` exs_ctrl.is_muldiv ? exs_muldiv_result : exs_alu_result;
    memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) && exs_brunit_take;
    memq_wdata.jump_addr  = `),s("span",{class:"hljs-keyword"},"if"),a(" inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result & ~"),s("span",{class:"hljs-number"},"1"),a(`;
    `),s("span",{class:"custom-hl-bold"},"memq_wdata.expt       = exq_rdata.expt;"),a(`
}
`)])])],-1),e(`<p>csrunitモジュールを変更します。 <code>expt_info</code>ポートを追加して、MEMステージ以前の例外情報を受け取ります ( リスト6、 リスト7、 リスト8 )。</p><p><span class="caption">▼リスト10.6: csrunitモジュールに例外情報を受け取るためのポートを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> csrunit (
    clk        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>            ,
    rst        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>            ,
    valid      : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>            ,
    pc         : <span class="hljs-keyword">input</span>  Addr             ,
    ctrl       : <span class="hljs-keyword">input</span>  InstCtrl         ,
    <span class="custom-hl-bold">expt_info  : <span class="hljs-keyword">input</span>  ExceptionInfo    ,</span>
    rd_addr    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">5</span>&gt; ,
</code></pre></div><p><span class="caption">▼リスト10.7: MEMステージの例外情報の変数を作成する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">///////////////////////////////// MEM Stage /////////////////////////////////</span>
<span class="hljs-keyword">var</span> mems_is_new   : <span class="hljs-keyword">logic</span>           ;
<span class="hljs-keyword">let</span> mems_valid    : <span class="hljs-keyword">logic</span>            = memq_rvalid;
<span class="hljs-keyword">let</span> mems_pc       : Addr             = memq_rdata.addr;
<span class="hljs-keyword">let</span> mems_inst_bits: Inst             = memq_rdata.bits;
<span class="hljs-keyword">let</span> mems_ctrl     : InstCtrl         = memq_rdata.ctrl;
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> mems_expt     : ExceptionInfo    = memq_rdata.expt;</span>
<span class="hljs-keyword">let</span> mems_rd_addr  : <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">5</span>&gt; = mems_inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
</code></pre></div><p><span class="caption">▼リスト10.8: csrunitモジュールに例外情報を供給する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> csru: csrunit (
    clk                             ,
    rst                             ,
    valid    : mems_valid           ,
    pc       : mems_pc              ,
    ctrl     : mems_ctrl            ,
    <span class="custom-hl-bold">expt_info: mems_expt            ,</span>
    rd_addr  : mems_rd_addr         ,
</code></pre></div><p>ECALL命令かどうかを判定する<code>is_ecall</code>変数を削除して、 例外の発生条件、例外の種類を示す値を変更します ( リスト9、 リスト10 )。</p><p><span class="caption">▼リスト10.9: csrunitモジュールでのECALL命令の判定を削除する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSRR(W|S|C)[I]命令かどうか</span>
<span class="hljs-keyword">let</span> is_wsc: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span>;
<span class="custom-hl-del"><span class="hljs-comment">// ECALL命令かどうか</span></span>
<span class="custom-hl-del"><span class="hljs-keyword">let</span> is_ecall: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; csr_addr == <span class="hljs-number">0</span> &amp;&amp; rs1[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; ctrl.funct3 == <span class="hljs-number">0</span> &amp;&amp; rd_addr == <span class="hljs-number">0</span>;</span>
</code></pre></div><p><span class="caption">▼リスト10.10: ExceptionInfoを使って例外を起こす (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/3dd422f62d955514b95a57124c3ebc5522bdecb5~1..3dd422f62d955514b95a57124c3ebc5522bdecb5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Exception</span>
<span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; expt_info.valid;
<span class="hljs-keyword">let</span> expt_cause: UIntX = expt_info.cause;
</code></pre></div><h3 id="mtvalレジスタを実装する" tabindex="-1">mtvalレジスタを実装する <a class="header-anchor" href="#mtvalレジスタを実装する" aria-label="Permalink to “mtvalレジスタを実装する”">​</a></h3><p>例外が発生すると、CPUはトラップベクタにジャンプして例外を処理します。 mcauseレジスタを読むことでどの例外が発生したかを判別できますが、 その例外の詳しい情報を知りたいことがあります。</p><p><img src="`+d+`" alt="mtvalレジスタ"></p><p class="caption" style="text-align:center;font-weight:bold;">▲図1: mtvalレジスタ</p><p>RISC-Vには、例外が発生したときのソフトウェアによるハンドリングを補助するために、 MXLENビットのmtvalレジスタが定義されています(図1)。 例外が発生したとき、CPUはmtvalレジスタに例外に固有の情報を書き込みます。 これ以降、例外に固有の情報のことをtvalと呼びます。</p><p><code>ExceptionInfo</code>構造体に例外に固有の情報を示す<code>value</code>を追加します (リスト11)。</p><p><span class="caption">▼リスト10.11: tvalをExceptionInfoに追加する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> ExceptionInfo {
    valid: <span class="hljs-keyword">logic</span>   ,
    cause: CsrCause,
    <span class="custom-hl-bold">value: UIntX   ,</span>
}
</code></pre></div><p>ECALL命令はmtvalに書き込むような情報がないので<code>0</code>に設定します (リスト12)。</p><p><span class="caption">▼リスト10.12: ECALL命令のtvalを設定する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// exception</span>
exq_wdata.expt.valid = ids_inst_bits == <span class="hljs-number">32&#39;h00000073</span>; <span class="hljs-comment">// ECALL</span>
exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;
<span class="custom-hl-bold">exq_wdata.expt.value = <span class="hljs-number">0</span>;</span>
</code></pre></div><p><code>CsrAddr</code>型にmtvalレジスタのアドレスを追加します (リスト13)。</p><p><span class="caption">▼リスト10.13: mtvalのアドレスを定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrAddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; {
    MTVEC = <span class="hljs-number">12&#39;h305</span>,
    MEPC = <span class="hljs-number">12&#39;h341</span>,
    MCAUSE = <span class="hljs-number">12&#39;h342</span>,
    <span class="custom-hl-bold">MTVAL = <span class="hljs-number">12&#39;h343</span>,</span>
    LED = <span class="hljs-number">12&#39;h800</span>,
}
</code></pre></div><p>mtvalレジスタを実装して、書き込み、読み込みできるようにします ( リスト14、 リスト15、 リスト16、 リスト17、 リスト18 )。</p><p><span class="caption">▼リスト10.14: mtvalの書き込みマスクを定義する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MTVAL_WMASK : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_ffff</span>;
</code></pre></div><p><span class="caption">▼リスト10.15: mtvalレジスタを作成する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> mtvec : UIntX;
<span class="hljs-keyword">var</span> mepc  : UIntX;
<span class="hljs-keyword">var</span> mcause: UIntX;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mtval : UIntX;</span>
</code></pre></div><p><span class="caption">▼リスト10.16: mtvalの読み込みデータ、書き込みマスクを設定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// read</span>
    rdata = <span class="hljs-keyword">case</span> csr_addr {
        CsrAddr::MTVEC : mtvec,
        CsrAddr::MEPC  : mepc,
        CsrAddr::MCAUSE: mcause,
        <span class="custom-hl-bold">CsrAddr::MTVAL : mtval,</span>
        CsrAddr::LED   : led,
        <span class="hljs-keyword">default</span>        : &#39;x,
    };
    <span class="hljs-comment">// write</span>
    wmask = <span class="hljs-keyword">case</span> csr_addr {
        CsrAddr::MTVEC : MTVEC_WMASK,
        CsrAddr::MEPC  : MEPC_WMASK,
        CsrAddr::MCAUSE: MCAUSE_WMASK,
        <span class="custom-hl-bold">CsrAddr::MTVAL : MTVAL_WMASK,</span>
        CsrAddr::LED   : LED_WMASK,
        <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,
    };
</code></pre></div><p><span class="caption">▼リスト10.17: mtvalレジスタをリセットする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        mtvec  = <span class="hljs-number">0</span>;
        mepc   = <span class="hljs-number">0</span>;
        mcause = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">mtval  = <span class="hljs-number">0</span>;</span>
        led    = <span class="hljs-number">0</span>;
</code></pre></div><p><span class="caption">▼リスト10.18: mtvalに書き込めるようにする (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> {
    <span class="hljs-keyword">if</span> is_wsc {
        <span class="hljs-keyword">case</span> csr_addr {
            CsrAddr::MTVEC : mtvec  = wdata;
            CsrAddr::MEPC  : mepc   = wdata;
            CsrAddr::MCAUSE: mcause = wdata;
            <span class="custom-hl-bold">CsrAddr::MTVAL : mtval  = wdata;</span>
            CsrAddr::LED   : led    = wdata;
            <span class="hljs-keyword">default</span>        : {}
        }
    }
}
</code></pre></div><p>例外が発生するとき、mtvalレジスタに<code>expt_info.value</code>を書き込むようにします ( リスト19、 リスト20 )。</p><p><span class="caption">▼リスト10.19: tvalを変数に割り当てる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; expt_info.valid;
<span class="hljs-keyword">let</span> expt_cause: UIntX = expt_info.cause;
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> expt_value: UIntX = expt_info.value;</span>
</code></pre></div><p><span class="caption">▼リスト10.20: 例外が発生するとき、mtvalにtvalを書き込む (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/634ecdaad9df9ac4228c619d4b313082765e3b13~1..634ecdaad9df9ac4228c619d4b313082765e3b13#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> valid {
    <span class="hljs-keyword">if</span> raise_trap {
        <span class="hljs-keyword">if</span> raise_expt {
            mepc   = pc;
            mcause = trap_cause;
            <span class="custom-hl-bold">mtval  = expt_value;</span>
        }
</code></pre></div><h2 id="breakpoint例外の実装" tabindex="-1">Breakpoint例外の実装 <a class="header-anchor" href="#breakpoint例外の実装" aria-label="Permalink to “Breakpoint例外の実装”">​</a></h2><p>Breakpoint例外は、EBREAK命令によって引き起こされる例外です。 EBREAK命令はデバッガがプログラムを中断させる場合などに利用されます。 EBREAK命令はECALL命令と同様に例外を発生させるだけで、ほかに操作を行いません。 causeは<code>3</code>で、tvalは例外が発生した命令のアドレスになります。</p><p><code>CsrCause</code>型にBreakpoint例外のcauseを追加します (リスト21)。</p><p><span class="caption">▼リスト10.21: Breakpoint例外のcauseを定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/6464d8aeecbdd6e2466575131f2774fde27ff6c0~1..6464d8aeecbdd6e2466575131f2774fde27ff6c0#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    BREAKPOINT = <span class="hljs-number">3</span>,
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
}
</code></pre></div><p>IDステージでEBREAK命令を判定して、tvalにPCを設定します (リスト22)。</p><p><span class="caption">▼リスト10.22: IDステージでEBREAK命令を判定する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/6464d8aeecbdd6e2466575131f2774fde27ff6c0~1..6464d8aeecbdd6e2466575131f2774fde27ff6c0#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>exq_wdata.expt = <span class="hljs-number">0</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">if</span> ids_inst_bits == <span class="hljs-number">32&#39;h00000073</span> {</span>
    <span class="hljs-comment">// ECALL</span>
    exq_wdata.expt.valid = <span class="custom-hl-bold"><span class="hljs-number">1</span>;</span>
    exq_wdata.expt.cause = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;
    exq_wdata.expt.value = <span class="hljs-number">0</span>;
<span class="custom-hl-bold">} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> ids_inst_bits == <span class="hljs-number">32&#39;h00100073</span> {</span>
    <span class="custom-hl-bold"><span class="hljs-comment">// EBREAK</span></span>
    <span class="custom-hl-bold">exq_wdata.expt.valid = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">exq_wdata.expt.cause = CsrCause::BREAKPOINT;</span>
    <span class="custom-hl-bold">exq_wdata.expt.value = ids_pc;</span>
<span class="custom-hl-bold">}</span>
</code></pre></div><h2 id="illegal-instruction例外の実装" tabindex="-1">Illegal instruction例外の実装 <a class="header-anchor" href="#illegal-instruction例外の実装" aria-label="Permalink to “Illegal instruction例外の実装”">​</a></h2><p>Illegal instruction例外は、 現在の環境で実行できない命令を実行しようとしたときに発生する例外です。 causeは<code>2</code>で、tvalは例外が発生した命令のビット列になります。</p><p>本章では、 EEIが認識できない不正な命令ビット列を実行しようとした場合と、 読み込み専用のCSRに書き込もうとした場合の2つの状況で例外を発生させます。</p><h3 id="不正な命令ビット列で例外を起こす" tabindex="-1">不正な命令ビット列で例外を起こす <a class="header-anchor" href="#不正な命令ビット列で例外を起こす" aria-label="Permalink to “不正な命令ビット列で例外を起こす”">​</a></h3><p>CPUに実装していない命令、つまりデコードできない命令を実行しようとするとき、 Illegal instruction例外が発生します。</p><p>今のところ未知の命令は何もしない命令として実行しています。 ここで、inst_decoderモジュールを、未知の命令であることを報告するように変更します。</p><p>inst_decoderモジュールに、命令が有効かどうかを示す<code>valid</code>ポートを追加します ( リスト23、 リスト24 )。</p><p><span class="caption">▼リスト10.23: validポートを追加する (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> inst_decoder (
    bits : <span class="hljs-keyword">input</span>  Inst    ,
    <span class="custom-hl-bold">valid: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,</span>
    ctrl : <span class="hljs-keyword">output</span> InstCtrl,
    imm  : <span class="hljs-keyword">output</span> UIntX   ,
) {
</code></pre></div><p><span class="caption">▼リスト10.24: inst_decoderモジュールのvalidポートと変数を接続する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> ids_valid     : <span class="hljs-keyword">logic</span>    = if_fifo_rvalid;
<span class="hljs-keyword">let</span> ids_pc        : Addr     = if_fifo_rdata.addr;
<span class="hljs-keyword">let</span> ids_inst_bits : Inst     = if_fifo_rdata.bits;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> ids_inst_valid: <span class="hljs-keyword">logic</span>   ;</span>
<span class="hljs-keyword">var</span> ids_ctrl      : InstCtrl;
<span class="hljs-keyword">var</span> ids_imm       : UIntX   ;

<span class="hljs-keyword">inst</span> decoder: inst_decoder (
    bits : ids_inst_bits ,
    <span class="custom-hl-bold">valid: ids_inst_valid,</span>
    ctrl : ids_ctrl      ,
    imm  : ids_imm       ,
);
</code></pre></div><p>今のところ実装してある命令を有効な命令として判定する処理をalways_combブロックに記述します (リスト25)。</p><p><span class="caption">▼リスト10.25: 命令の有効判定を行う (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>valid = <span class="hljs-keyword">case</span> op {
    OP_LUI, OP_AUIPC, OP_JAL, OP_JALR: T,
    OP_BRANCH                        : f3 != <span class="hljs-number">3&#39;b010</span> &amp;&amp; f3 != <span class="hljs-number">3&#39;b011</span>,
    OP_LOAD                          : f3 != <span class="hljs-number">3&#39;b111</span>,
    OP_STORE                         : f3[<span class="hljs-number">2</span>] == <span class="hljs-number">1&#39;b0</span>,
    OP_OP                            : <span class="hljs-keyword">case</span> f7 {
        <span class="hljs-number">7&#39;b0000000</span>: T, <span class="hljs-comment">// RV32I</span>
        <span class="hljs-number">7&#39;b0100000</span>: f3 == <span class="hljs-number">3&#39;b000</span> || f3 == <span class="hljs-number">3&#39;b101</span>, <span class="hljs-comment">// SUB, SRA</span>
        <span class="hljs-number">7&#39;b0000001</span>: T, <span class="hljs-comment">// RV32M</span>
        <span class="hljs-keyword">default</span>   : F,
    },
    OP_OP_IMM: <span class="hljs-keyword">case</span> f3 {
        <span class="hljs-number">3&#39;b001</span> : f7[<span class="hljs-number">6</span>:<span class="hljs-number">1</span>] == <span class="hljs-number">6&#39;b000000</span>, <span class="hljs-comment">// SLLI (RV64I)</span>
        <span class="hljs-number">3&#39;b101</span> : f7[<span class="hljs-number">6</span>:<span class="hljs-number">1</span>] == <span class="hljs-number">6&#39;b000000</span> || f7[<span class="hljs-number">6</span>:<span class="hljs-number">1</span>] == <span class="hljs-number">6&#39;b010000</span>, <span class="hljs-comment">// SRLI, SRAI (RV64I)</span>
        <span class="hljs-keyword">default</span>: T,
    },
    OP_OP_32: <span class="hljs-keyword">case</span> f7 {
        <span class="hljs-number">7&#39;b0000001</span>: f3 == <span class="hljs-number">3&#39;b000</span> || f3[<span class="hljs-number">2</span>] == <span class="hljs-number">1&#39;b1</span>, <span class="hljs-comment">// RV64M</span>
        <span class="hljs-number">7&#39;b0000000</span>: f3 == <span class="hljs-number">3&#39;b000</span> || f3 == <span class="hljs-number">3&#39;b001</span> || f3 == <span class="hljs-number">3&#39;b101</span>, <span class="hljs-comment">// ADDW, SLLW, SRLW</span>
        <span class="hljs-number">7&#39;b0100000</span>: f3 == <span class="hljs-number">3&#39;b000</span> || f3 == <span class="hljs-number">3&#39;b101</span>, <span class="hljs-comment">// SUBW, SRAW</span>
        <span class="hljs-keyword">default</span>   : F,
    },
    OP_OP_IMM_32: <span class="hljs-keyword">case</span> f3 {
        <span class="hljs-number">3&#39;b000</span> : T, <span class="hljs-comment">// ADDIW</span>
        <span class="hljs-number">3&#39;b001</span> : f7 == <span class="hljs-number">7&#39;b0000000</span>, <span class="hljs-comment">// SLLIW</span>
        <span class="hljs-number">3&#39;b101</span> : f7 == <span class="hljs-number">7&#39;b0000000</span> || f7 == <span class="hljs-number">7&#39;b0100000</span>, <span class="hljs-comment">// SRLIW, SRAIW</span>
        <span class="hljs-keyword">default</span>: F,
    },
    OP_SYSTEM: f3 != <span class="hljs-number">3&#39;b000</span> &amp;&amp; f3 != <span class="hljs-number">3&#39;b100</span> || <span class="hljs-comment">// CSRR(W|S|C)[I]</span>
     bits == <span class="hljs-number">32&#39;h00000073</span> || <span class="hljs-comment">// ECALL</span>
     bits == <span class="hljs-number">32&#39;h00100073</span> || <span class="hljs-comment">// EBREAK</span>
     bits == <span class="hljs-number">32&#39;h30200073</span>, <span class="hljs-comment">//MRET</span>
    OP_MISC_MEM: T, <span class="hljs-comment">// FENCE</span>
    <span class="hljs-keyword">default</span>    : F,
};
</code></pre></div><p>riscv-testsでメモリ読み書きの順序を保証するFENCE命令<sup class="footnote-ref"><a href="#fn4" id="fnref4">[4]</a></sup>を使用しているため、 opcodeがOP-MISCである命令を合法な命令として取り扱っています。 OP-MISCのopcode(<code>7&#39;b0001111</code>)をeeiパッケージに定義してください (リスト26)。</p><p><span class="caption">▼リスト10.26: OP-MISCのビット列を定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> OP_MISC_MEM : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = <span class="hljs-number">7&#39;b0001111</span>;
</code></pre></div><p><code>CsrCause</code>型にIllegal instruction例外のcauseを追加します (リスト27)。</p><p><span class="caption">▼リスト10.27: Illegal instruction例外のcauseを定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    <span class="custom-hl-bold">ILLEGAL_INSTRUCTION = <span class="hljs-number">2</span>,</span>
    BREAKPOINT = <span class="hljs-number">3</span>,
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
}
</code></pre></div><p><code>valid</code>フラグを利用して、IDステージでIllegal instruction例外を発生させます (リスト28)。 tvalには、命令を右に詰めてゼロで拡張した値を設定します。</p><p><span class="caption">▼リスト10.28: 不正な命令のとき、例外を発生させる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/cc57ab2392b41a51a0466add84bcc7e0e2a25945~1..cc57ab2392b41a51a0466add84bcc7e0e2a25945#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>exq_wdata.expt = <span class="hljs-number">0</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">if</span> !ids_inst_valid {</span>
    <span class="custom-hl-bold"><span class="hljs-comment">// illegal instruction</span></span>
    <span class="custom-hl-bold">exq_wdata.expt.valid = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">exq_wdata.expt.cause = CsrCause::ILLEGAL_INSTRUCTION;</span>
    <span class="custom-hl-bold">exq_wdata.expt.value = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - ILEN, ids_inst_bits};</span>
<span class="custom-hl-bold">} <span class="hljs-keyword">else</span></span> <span class="hljs-keyword">if</span> ids_inst_bits == <span class="hljs-number">32&#39;h00000073</span> {
</code></pre></div><h3 id="読み込み専用のcsrへの書き込みで例外を起こす" tabindex="-1">読み込み専用のCSRへの書き込みで例外を起こす <a class="header-anchor" href="#読み込み専用のcsrへの書き込みで例外を起こす" aria-label="Permalink to “読み込み専用のCSRへの書き込みで例外を起こす”">​</a></h3><p>RISC-VのCSRには読み込み専用のレジスタが存在しており、 アドレスの上位2ビットが<code>2&#39;b11</code>のCSRが読み込み専用として定義されています。 読み込み専用のCSRに書き込みを行おうとするとIllegal instruction例外が発生します。</p><p>CSRに値が書き込まれるのは次のいずれかの場合です。 読み書き可能なレジスタ内の読み込み専用のフィールドへの書き込みは例外を引き起こしません。</p><ol><li>CSRRW、CSRRWI命令である</li><li>CSRRS命令でrs1が0番目のレジスタ以外である</li><li>CSRRSI命令で即値が<code>0</code>以外である</li><li>CSRRC命令でrs1が0番目のレジスタ以外である</li><li>CSRRCI命令で即値が<code>0</code>以外である</li></ol><p>ソースレジスタの値が<code>0</code>だとしても、0番目のレジスタではない場合にはCSRに書き込むと判断します。 CSRに書き込むかどうかを正しく判定するために、 csrunitモジュールの<code>rs1</code>ポートを<code>rs1_addr</code>と<code>rs1_data</code>に分解します ( リスト30、 リスト29、 リスト31 )<sup class="footnote-ref"><a href="#fn5" id="fnref5">[5]</a></sup>。 また、causeを設定するためにcsrunitモジュールに命令のビット列を供給します。</p><p><span class="caption">▼リスト10.29: csrunitモジュールのポート定義を変更する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> csrunit (
    clk        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>            ,
    rst        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>            ,
    valid      : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>            ,
    pc         : <span class="hljs-keyword">input</span>  Addr             ,
    <span class="custom-hl-bold">inst_bits  : <span class="hljs-keyword">input</span>  Inst             ,</span>
    ctrl       : <span class="hljs-keyword">input</span>  InstCtrl         ,
    expt_info  : <span class="hljs-keyword">input</span>  ExceptionInfo    ,
    rd_addr    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">5</span>&gt; ,
    csr_addr   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">12</span>&gt;,
    <span class="custom-hl-bold">rs1_addr   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        &lt;<span class="hljs-number">5</span>&gt; ,</span>
    <span class="custom-hl-bold">rs1_data   : <span class="hljs-keyword">input</span>  UIntX            ,</span>
    rdata      : <span class="hljs-keyword">output</span> UIntX            ,
    raise_trap : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>            ,
    trap_vector: <span class="hljs-keyword">output</span> Addr             ,
    led        : <span class="hljs-keyword">output</span> UIntX            ,
) {
</code></pre></div><p><span class="caption">▼リスト10.30: csrunitモジュールのポート定義を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> csru: csrunit (
    clk                               ,
    rst                               ,
    valid      : mems_valid           ,
    pc         : mems_pc              ,
    <span class="custom-hl-bold">inst_bits  : mems_inst_bits       ,</span>
    ctrl       : mems_ctrl            ,
    expt_info  : mems_expt            ,
    rd_addr    : mems_rd_addr         ,
    csr_addr   : <span class="custom-hl-bold">mems_inst_bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>],</span>
    <span class="custom-hl-bold">rs1_addr   : memq_rdata.rs1_addr  ,</span>
    <span class="custom-hl-bold">rs1_data   : memq_rdata.rs1_data  ,</span>
    rdata      : csru_rdata           ,
    raise_trap : csru_raise_trap      ,
    trap_vector: csru_trap_vector     ,
    led                               ,
);
</code></pre></div><p><span class="caption">▼リスト10.31: rs1の変更に対応する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> wsource: UIntX = <span class="hljs-keyword">if</span> ctrl.funct3[<span class="hljs-number">2</span>] ? {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">5</span>, rs1_addr} : rs1_data;</span>
wdata   = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b01</span>  : <span class="custom-hl-bold">wsource</span>,
    <span class="hljs-number">2&#39;b10</span>  : rdata | <span class="custom-hl-bold">wsource</span>,
    <span class="hljs-number">2&#39;b11</span>  : rdata &amp; ~<span class="custom-hl-bold">wsource</span>,
    <span class="hljs-keyword">default</span>: &#39;x,
} &amp; wmask | (rdata &amp; ~wmask);
</code></pre></div><p>命令のfunct3とrs1のアドレスを利用して、書き込み先が読み込み専用レジスタかどうかを判定します<sup class="footnote-ref"><a href="#fn6" id="fnref6">[6]</a></sup> (リスト32)。 また、命令のビット列を利用できるようになったので、MRET命令の判定を命令のビット列の比較に書き換えています。</p><p><span class="caption">▼リスト10.32: 読み込み専用CSRへの書き込みが発生するか判定する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSRR(W|S|C)[I]命令かどうか</span>
<span class="hljs-keyword">let</span> is_wsc: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span>;
<span class="hljs-comment">// MRET命令かどうか</span>
<span class="hljs-keyword">let</span> is_mret: <span class="hljs-keyword">logic</span> = inst_bits == <span class="hljs-number">32&#39;h30200073</span>;

<span class="hljs-comment">// Check CSR access</span>
<span class="hljs-keyword">let</span> will_not_write_csr     : <span class="hljs-keyword">logic</span> = (ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">2</span> || ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">3</span>) &amp;&amp; rs1_addr == <span class="hljs-number">0</span>; <span class="hljs-comment">// set/clear with source = 0</span>
<span class="hljs-keyword">let</span> expt_write_readonly_csr: <span class="hljs-keyword">logic</span> = is_wsc &amp;&amp; !will_not_write_csr &amp;&amp; csr_addr[<span class="hljs-number">11</span>:<span class="hljs-number">10</span>] == <span class="hljs-number">2&#39;b11</span>; <span class="hljs-comment">// attempt to write read-only CSR</span>
</code></pre></div><p>例外が発生するとき、causeとtvalを設定します (リスト33)。</p><p><span class="caption">▼リスト10.33: 読み込み専用CSRの書き込みで例外を発生させる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; (expt_info.valid || expt_write_readonly_csr);
<span class="hljs-keyword">let</span> expt_cause: UIntX = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
    <span class="custom-hl-bold">expt_info.valid        :</span> expt_info.cause<span class="custom-hl-bold">,</span>
    <span class="custom-hl-bold">expt_write_readonly_csr: CsrCause::ILLEGAL_INSTRUCTION,</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span>                : <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">}</span>;
<span class="hljs-keyword">let</span> expt_value: UIntX = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
    <span class="custom-hl-bold">expt_info.valid                            :</span> expt_info.value<span class="custom-hl-bold">,</span>
    <span class="custom-hl-bold">expt_cause == CsrCause::ILLEGAL_INSTRUCTION: {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(Inst), inst_bits},</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span>                                    : <span class="hljs-number">0</span></span>
<span class="custom-hl-bold">}</span>;
</code></pre></div><p>この変更により、レジスタにライトバックするようにデコードされた命令が csrunitモジュールでトラップを起こすようになりました。 トラップが発生するときにWBステージでライトバックしないように変更します ( リスト34、 リスト35、 リスト36 )。</p><p><span class="caption">▼リスト10.34: トラップが発生したかを示すlogicをwbq_typeに追加する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> wbq_type {
    addr      : Addr    ,
    bits      : Inst    ,
    ctrl      : InstCtrl,
    imm       : UIntX   ,
    alu_result: UIntX   ,
    mem_rdata : UIntX   ,
    csr_rdata : UIntX   ,
    <span class="custom-hl-bold">raise_trap: <span class="hljs-keyword">logic</span>   ,</span>
}
</code></pre></div><p><span class="caption">▼リスト10.35: トラップが発生したかをWBステージに伝える (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>wbq_wdata.raise_trap = csru_raise_trap;
</code></pre></div><p><span class="caption">▼リスト10.36: トラップが発生しているとき、レジスタにデータを書き込まないようにする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/808f5044c7d1dcfac55fa95d5616b8e77dc7f942~1..808f5044c7d1dcfac55fa95d5616b8e77dc7f942#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> wbs_valid &amp;&amp; wbs_ctrl.rwb_en &amp;&amp; !wbq_rdata.raise_trap {
        regfile[wbs_rd_addr] = wbs_wb_data;
    }
}
</code></pre></div><h2 id="命令アドレスのミスアライン例外" tabindex="-1">命令アドレスのミスアライン例外 <a class="header-anchor" href="#命令アドレスのミスアライン例外" aria-label="Permalink to “命令アドレスのミスアライン例外”">​</a></h2><p>RISC-Vでは、命令アドレスがIALIGNビット境界に整列されていない場合に Instruction address misaligned例外が発生します。 causeは<code>0</code>で、tvalは命令のアドレスになります。</p><p>第13章「C拡張の実装」で実装するC拡張が実装されていない場合、 IALIGNは<code>32</code>と定義されています。 C拡張が定義されている場合は<code>16</code>になります。</p><p>IALIGNビット境界に整列されていない命令アドレスになるのはジャンプ命令、分岐命令を実行する場合です<sup class="footnote-ref"><a href="#fn7" id="fnref7">[7]</a></sup>。 PCの遷移先が整列されていない場合に例外が発生します。 分岐命令の場合、分岐が成立する場合にしか例外は発生しません。</p><p><code>CsrCause</code>型にInstruction address misaligned例外のcauseを追加します (リスト37)。</p><p><span class="caption">▼リスト10.37: Instruction address misaligned例外のcauseを定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/a9abf44951d6d0b35b9d8cd26e3b325414f36a24~1..a9abf44951d6d0b35b9d8cd26e3b325414f36a24#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    <span class="custom-hl-bold">INSTRUCTION_ADDRESS_MISALIGNED = <span class="hljs-number">0</span>,</span>
    ILLEGAL_INSTRUCTION = <span class="hljs-number">2</span>,
    BREAKPOINT = <span class="hljs-number">3</span>,
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
}
</code></pre></div><p>EXステージでアドレスを確認して例外を判定します (リスト38)。 tvalは遷移先のアドレスになることに注意してください。</p><p><span class="caption">▼リスト10.38: EXステージでInstruction address misaligned例外の判定を行う (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/a9abf44951d6d0b35b9d8cd26e3b325414f36a24~1..a9abf44951d6d0b35b9d8cd26e3b325414f36a24#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>memq_wdata.jump_addr  = <span class="hljs-keyword">if</span> inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result &amp; ~<span class="hljs-number">1</span>;
<span class="hljs-comment">// exception</span>
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> instruction_address_misaligned: <span class="hljs-keyword">logic</span> = memq_wdata.br_taken &amp;&amp; memq_wdata.jump_addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b00</span>;</span>
memq_wdata.expt                = exq_rdata.expt;
<span class="custom-hl-bold"><span class="hljs-keyword">if</span> !memq_rdata.expt.valid {</span>
<span class="custom-hl-bold">    <span class="hljs-keyword">if</span> instruction_address_misaligned {</span>
<span class="custom-hl-bold">        memq_wdata.expt.valid = <span class="hljs-number">1</span>;</span>
<span class="custom-hl-bold">        memq_wdata.expt.cause = CsrCause::INSTRUCTION_ADDRESS_MISALIGNED;</span>
<span class="custom-hl-bold">        memq_wdata.expt.value = memq_wdata.jump_addr;</span>
<span class="custom-hl-bold">    }</span>
<span class="custom-hl-bold">}</span>
</code></pre></div><h2 id="ロードストア命令のミスアライン例外" tabindex="-1">ロードストア命令のミスアライン例外 <a class="header-anchor" href="#ロードストア命令のミスアライン例外" aria-label="Permalink to “ロードストア命令のミスアライン例外”">​</a></h2><p>RISC-Vでは、ロード、ストア命令でアクセスするメモリのアドレスが、 ロード、ストアするビット幅に整列されていない場合に、 それぞれLoad address misaligned例外、Store/AMO address misaligned例外が発生します<sup class="footnote-ref"><a href="#fn8" id="fnref8">[8]</a></sup>。 例えばLW命令は4バイトに整列されたアドレス、LD命令は8バイトに整列されたアドレスにしかアクセスできません。 causeはそれぞれ<code>4</code>、<code>6</code>で、tvalはアクセスするメモリのアドレスになります。</p><p><code>CsrCause</code>型に例外のcauseを追加します (リスト39)。</p><p><span class="caption">▼リスト10.39: 例外のcauseを定義する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/31f55116625e9bd42738f4703ffa5082c6e3fcef~1..31f55116625e9bd42738f4703ffa5082c6e3fcef#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    INSTRUCTION_ADDRESS_MISALIGNED = <span class="hljs-number">0</span>,
    ILLEGAL_INSTRUCTION = <span class="hljs-number">2</span>,
    BREAKPOINT = <span class="hljs-number">3</span>,
    <span class="custom-hl-bold">LOAD_ADDRESS_MISALIGNED = <span class="hljs-number">4</span>,</span>
    <span class="custom-hl-bold">STORE_AMO_ADDRESS_MISALIGNED = <span class="hljs-number">6</span>,</span>
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
}
</code></pre></div><p>EXステージでアドレスを確認して例外を判定します (リスト40)。</p><p><span class="caption">▼リスト10.40: EXステージで例外の判定を行う (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/31f55116625e9bd42738f4703ffa5082c6e3fcef~1..31f55116625e9bd42738f4703ffa5082c6e3fcef#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> instruction_address_misaligned: <span class="hljs-keyword">logic</span> = memq_wdata.br_taken &amp;&amp; memq_wdata.jump_addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b00</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> loadstore_address_misaligned  : <span class="hljs-keyword">logic</span> = inst_is_memop(exs_ctrl) &amp;&amp; <span class="hljs-keyword">case</span> exs_ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {</span>
<span class="custom-hl-bold">    <span class="hljs-number">2&#39;b00</span>  : <span class="hljs-number">0</span>, <span class="hljs-comment">// B</span></span>
<span class="custom-hl-bold">    <span class="hljs-number">2&#39;b01</span>  : exs_alu_result[<span class="hljs-number">0</span>] != <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// H</span></span>
<span class="custom-hl-bold">    <span class="hljs-number">2&#39;b10</span>  : exs_alu_result[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b0</span>, <span class="hljs-comment">// W</span></span>
<span class="custom-hl-bold">    <span class="hljs-number">2&#39;b11</span>  : exs_alu_result[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">3&#39;b0</span>, <span class="hljs-comment">// D</span></span>
<span class="custom-hl-bold">    <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,</span>
<span class="custom-hl-bold">};</span>
memq_wdata.expt = exq_rdata.expt;
<span class="hljs-keyword">if</span> !memq_rdata.expt.valid {
    <span class="hljs-keyword">if</span> instruction_address_misaligned {
        memq_wdata.expt.valid = <span class="hljs-number">1</span>;
        memq_wdata.expt.cause = CsrCause::INSTRUCTION_ADDRESS_MISALIGNED;
        memq_wdata.expt.value = memq_wdata.jump_addr;
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> loadstore_address_misaligned {</span>
    <span class="custom-hl-bold">    memq_wdata.expt.valid = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">    memq_wdata.expt.cause = <span class="hljs-keyword">if</span> exs_ctrl.is_load ? CsrCause::LOAD_ADDRESS_MISALIGNED : CsrCause::STORE_AMO_ADDRESS_MISALIGNED;</span>
    <span class="custom-hl-bold">    memq_wdata.expt.value = exs_alu_result;</span>
    }
}
</code></pre></div><p>例外が発生するときにmemunitモジュールが動作しないようにします (リスト41)。</p><p><span class="caption">▼リスト10.41: 例外が発生するとき、memunitのvalidを0にする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/31f55116625e9bd42738f4703ffa5082c6e3fcef~1..31f55116625e9bd42738f4703ffa5082c6e3fcef#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> memu: memunit (
    clk                                   ,
    rst                                   ,
    valid : mems_valid <span class="custom-hl-bold">&amp;&amp; !mems_expt.valid</span>,
    is_new: mems_is_new                   ,
    ctrl  : mems_ctrl                     ,
    addr  : memq_rdata.alu_result         ,
    rs2   : memq_rdata.rs2_data           ,
    rdata : memu_rdata                    ,
    stall : memu_stall                    ,
    membus: d_membus                      ,
);
</code></pre></div><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>異常な状態(unusual condition)。予期しない(unexpected)事象と呼ぶ場合もあります。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>不正と呼ぶこともあります。逆に実行できる命令のことを合法(legal)な命令と呼びます <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>割り込みは第15章「M-modeの実装 (2. 割り込みの実装)」で実装します。 <a href="#fnref3" class="footnote-backref">↩︎</a></p></li><li id="fn4" class="footnote-item"><p>基本編で実装するCPUはロードストア命令を直列に実行するため順序を保証する必要がありません。そのためFENCE命令は何もしない命令として扱います。 <a href="#fnref4" class="footnote-backref">↩︎</a></p></li><li id="fn5" class="footnote-item"><p>基本編 第1部の初版の<code>wdata</code>の生成ロジックに間違いがあったので訂正してあります。 <a href="#fnref5" class="footnote-backref">↩︎</a></p></li><li id="fn6" class="footnote-item"><p>IDステージで判定することもできます。 <a href="#fnref6" class="footnote-backref">↩︎</a></p></li><li id="fn7" class="footnote-item"><p>mepc、mtvecはIALIGNビットに整列されたアドレスしか書き込めないため、遷移先のアドレスは常に整列されています。 <a href="#fnref7" class="footnote-backref">↩︎</a></p></li><li id="fn8" class="footnote-item"><p>例外を発生させず、そのようなメモリアクセスをサポートすることもできます。本書ではCPUを単純に実装するために例外とします。 <a href="#fnref8" class="footnote-backref">↩︎</a></p></li></ol></section>`,120)])])}const _=l(t,[["render",o]]);export{h as __pageData,_ as default};
