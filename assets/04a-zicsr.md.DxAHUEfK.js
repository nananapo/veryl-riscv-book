import{_ as a,c as n,o as e,ah as c,as as p,at as l,au as t}from"./chunks/framework.n0uClWLT.js";const f=JSON.parse('{"title":"Zicsr拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"04a-zicsr.md","filePath":"04a-zicsr.md"}'),d={name:"04a-zicsr.md"};function r(o,s,b,i,h,m){return e(),n("div",null,[...s[0]||(s[0]=[c(`<h1 id="zicsr拡張の実装" tabindex="-1">Zicsr拡張の実装 <a class="header-anchor" href="#zicsr拡張の実装" aria-label="Permalink to “Zicsr拡張の実装”">​</a></h1><h2 id="csrとは何か" tabindex="-1">CSRとは何か? <a class="header-anchor" href="#csrとは何か" aria-label="Permalink to “CSRとは何か?”">​</a></h2><p>前の章では、RISC-Vの基本整数命令セットであるRV32Iを実装しました。 既に簡単なプログラムを動かせますが、 例外や割り込み、ページングなどの機能がありません<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。 このような機能はCSRを介して提供されます。</p><p>RISC-Vには、CSR(Control and Status Register)というレジスタが4096個存在しています。 例えば<code>mtvec</code>というレジスタは、例外や割り込みが発生したときのジャンプ先のアドレスを格納しています。 RISC-VのCPUは、CSRの読み書きによって制御(Control)や状態(Status)の読み取りを行います。</p><p>CSRの読み書きを行う命令は、Zicsr拡張によって定義されています(表1)。 本章では、Zicsrに定義されている命令、 RV32Iに定義されているECALL命令、 MRET命令、 mtvecレジスタ、 mepcレジスタ、 mcauseレジスタを実装します。</p><div id="zicsr.insts" class="table"><p class="caption">表4.1: Zicsr拡張に定義されている命令</p><table><tr class="hline"><th>命令</th><th>作用</th></tr><tr class="hline"><td>CSRRW</td><td>CSRにrs1を書き込み、元のCSRの値をrdに書き込む</td></tr><tr class="hline"><td>CSRRWI</td><td>CSRRWのrs1を、即値をゼロ拡張した値に置き換えた動作</td></tr><tr class="hline"><td>CSRRS</td><td>CSRとrs1をビットORした値をCSRに書き込み、元のCSRの値をrdに書き込む</td></tr><tr class="hline"><td>CSRRSI</td><td>CSRRSのrs1を、即値をゼロ拡張した値に置き換えた動作</td></tr><tr class="hline"><td>CSRRC</td><td>CSRと~rs1(rs1のビットNOT)をビットANDした値をCSRに書き込み、<br>元のCSRの値をrdに書き込む</td></tr><tr class="hline"><td>CSRRCI</td><td>CSRRCのrs1を、即値をゼロ拡張した値に置き換えた動作</td></tr></table></div><h2 id="csr命令のデコード" tabindex="-1">CSR命令のデコード <a class="header-anchor" href="#csr命令のデコード" aria-label="Permalink to “CSR命令のデコード”">​</a></h2><p>まず、Zicsrに定義されている命令(表1)をデコードします。</p><p>これらの命令のopcodeは<code>SYSTEM</code>(<code>7&#39;b1110011</code>)です。 この値をeeiパッケージに定義します(リスト1)。</p><p><span class="caption">▼リスト4.1: opcode用の定数の定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> OP_SYSTEM: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = <span class="hljs-number">7&#39;b1110011</span>;
</code></pre></div><p>次に、<code>InstCtrl</code>構造体に、 CSRを制御する命令であることを示す<code>is_csr</code>フラグを追加します(リスト2)。</p><p><span class="caption">▼リスト4.2: is_csrを追加する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// 制御に使うフラグ用の構造体</span>
<span class="hljs-keyword">struct</span> InstCtrl {
    itype   : InstType   , <span class="hljs-comment">// 命令の形式</span>
    rwb_en  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// レジスタに書き込むかどうか</span>
    is_lui  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// LUI命令である</span>
    is_aluop: <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ALUを利用する命令である</span>
    is_jump : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ジャンプ命令である</span>
    is_load : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ロード命令である</span>
    <span class="custom-hl-bold">is_csr  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// CSR命令である</span></span>
    funct3  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
    funct7  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">7</span>&gt;, <span class="hljs-comment">// 命令のfunct7フィールド</span>
}
</code></pre></div><p>これでデコード処理を書く準備が整いました。 inst_decoderモジュールの<code>InstCtrl</code>を生成している部分を変更します(リスト3)。</p><p><span class="caption">▼リスト4.3: OP_SYSTEMとis_csrを追加する (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>ctrl = {
    <span class="hljs-keyword">case</span> op {
        OP_LUI: {
            InstType::U, T, T, F, F, F<span class="custom-hl-bold">, F</span>
        },
        OP_AUIPC: {
            InstType::U, T, F, F, F, F<span class="custom-hl-bold">, F</span>
        },
        OP_JAL: {
            InstType::J, T, F, F, T, F<span class="custom-hl-bold">, F</span>
        },
        OP_JALR: {
            InstType::I, T, F, F, T, F<span class="custom-hl-bold">, F</span>
        },
        OP_BRANCH: {
            InstType::B, F, F, F, F, F<span class="custom-hl-bold">, F</span>
        },
        OP_LOAD: {
            InstType::I, T, F, F, F, T<span class="custom-hl-bold">, F</span>
        },
        OP_STORE: {
            InstType::S, F, F, F, F, F<span class="custom-hl-bold">, F</span>
        },
        OP_OP: {
            InstType::R, T, F, T, F, F<span class="custom-hl-bold">, F</span>
        },
        OP_OP_IMM: {
            InstType::I, T, F, T, F, F<span class="custom-hl-bold">, F</span>
        },
        <span class="custom-hl-bold">OP_SYSTEM: {</span>
        <span class="custom-hl-bold">    InstType::I, T, F, F, F, F, T</span>
        <span class="custom-hl-bold">},</span>
        <span class="hljs-keyword">default</span>: {
            InstType::X, F, F, F, F, F<span class="custom-hl-bold">, F</span>
        },
    }, f3, f7
};
</code></pre></div><p>リスト3では、 opcodeが<code>OP_SYSTEM</code>な命令を、 I形式、レジスタに結果を書き込む、CSRを操作する命令であるということにしています。 他のopcodeの命令はCSRを操作しない命令であるということにしています。</p><p>CSRRW、CSRRS、CSRRC命令は、 rs1レジスタの値を利用します。 CSRRWI、CSRRSI、CSRRCI命令は、 命令のビット列中のrs1にあたるビット列(5ビット)を<code>0</code>で拡張した値を利用します。 それぞれの命令はfunct3で区別できます(表2)。</p><div id="zicsr.f3" class="table"><p class="caption">表4.2: Zicsrに定義されている命令(funct3による区別)</p><table><tr class="hline"><th>funct3</th><th>命令</th></tr><tr class="hline"><td>3&#39;b001</td><td>CSRRW</td></tr><tr class="hline"><td>3&#39;b101</td><td>CSRRWI</td></tr><tr class="hline"><td>3&#39;b010</td><td>CSRRS</td></tr><tr class="hline"><td>3&#39;b110</td><td>CSRRSI</td></tr><tr class="hline"><td>3&#39;b011</td><td>CSRRC</td></tr><tr class="hline"><td>3&#39;b111</td><td>CSRRCI</td></tr></table></div> 操作対象のCSRのアドレス(12ビット)は、 命令のビットの上位12ビット(I形式の即値)をそのまま利用します。 <h2 id="csrunitモジュールの実装" tabindex="-1">csrunitモジュールの実装 <a class="header-anchor" href="#csrunitモジュールの実装" aria-label="Permalink to “csrunitモジュールの実装”">​</a></h2><p>CSRを操作する命令のデコードができたので、 CSR関連の処理を行うモジュールを作成します。</p><h3 id="csrunitモジュールを作成する" tabindex="-1">csrunitモジュールを作成する <a class="header-anchor" href="#csrunitモジュールを作成する" aria-label="Permalink to “csrunitモジュールを作成する”">​</a></h3><p><code>src/csrunit.veryl</code>を作成し、 次のように記述します(リスト4)。</p><p><span class="caption">▼リスト4.4: csrunit.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> corectrl::*;

<span class="hljs-keyword">module</span> csrunit (
    clk     : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>       ,
    rst     : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>       ,
    valid   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>       ,
    ctrl    : <span class="hljs-keyword">input</span>  InstCtrl    ,
    csr_addr: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">12</span>&gt;,
    rs1     : <span class="hljs-keyword">input</span>  UIntX       ,
    rdata   : <span class="hljs-keyword">output</span> UIntX       ,
) {
    <span class="hljs-comment">// CSRR(W|S|C)[I]命令かどうか</span>
    <span class="hljs-keyword">let</span> is_wsc: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span>;
}
</code></pre></div><p>csrunitモジュールの主要なポートの定義は表3のとおりです。 まだcsrunitモジュールにはCSRが一つもないため、中身が空になっています。</p><div id="csrunit.port" class="table"><p class="caption">表4.3: csrunitモジュールのポート定義</p><table><tr class="hline"><th>ポート名</th><th>型</th><th>向き</th><th>意味</th></tr><tr class="hline"><td>valid</td><td>logic</td><td>input</td><td>命令が供給されているかどうか</td></tr><tr class="hline"><td>ctrl</td><td>InstCtrl</td><td>input</td><td>命令のInstCtrl</td></tr><tr class="hline"><td>csr_addr</td><td>logic&lt;12&gt;</td><td>input</td><td>命令が指定するCSRのアドレス (命令の上位12ビット)</td></tr><tr class="hline"><td>rs1</td><td>UIntX</td><td>input</td><td>CSRR(W|S|C)のときrs1の値、<br>CSRR(W|S|C)Iのとき即値(5ビット)をゼロで拡張した値</td></tr><tr class="hline"><td>rdata</td><td>UIntX</td><td>output</td><td>CSR命令よるCSR読み込みの結果</td></tr></table></div> csrunitモジュールを、coreモジュールの中でインスタンス化します (リスト5)。 <p><span class="caption">▼リスト4.5: csrunitモジュールのインスタンス化 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> csru_rdata: UIntX;

<span class="hljs-keyword">inst</span> csru: csrunit (
    clk                       ,
    rst                       ,
    valid   : inst_valid      ,
    ctrl    : inst_ctrl       ,
    csr_addr: inst_bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>],
    rs1     : <span class="hljs-keyword">if</span> inst_ctrl.funct3[<span class="hljs-number">2</span>] == <span class="hljs-number">1</span> &amp;&amp; inst_ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span> ? {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(rs1_addr), rs1_addr} <span class="hljs-comment">// rs1を0で拡張する</span>
     : rs1_data,
    rdata: csru_rdata                                                                                                           ,
);
</code></pre></div><p>CSR命令の結果の受け取りのために変数<code>csru_rdata</code>を作成し、 csrunitモジュールをインスタンス化しています。</p><p><code>csr_addr</code>ポートには命令の上位12ビットを設定しています。 <code>rs1</code>ポートには、 即値を利用する命令(CSRR(W|S|C)I)の場合はrs1_addrを<code>0</code>で拡張した値を、 それ以外の命令の場合はrs1のデータを設定しています。</p><p>次に、CSRを読み込んだデータをレジスタにライトバックします。 具体的には、 <code>InstCtrl.is_csr</code>が<code>1</code>のとき、 <code>wb_data</code>が<code>csru_rdata</code>になるようにします (リスト6)。</p><p><span class="caption">▼リスト4.6: CSR命令の結果がライトバックされるようにする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> rd_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
<span class="hljs-keyword">let</span> wb_data: UIntX    = <span class="hljs-keyword">switch</span> {
    inst_ctrl.is_lui : inst_imm,
    inst_ctrl.is_jump: inst_pc + <span class="hljs-number">4</span>,
    inst_ctrl.is_load: memu_rdata,
    <span class="custom-hl-bold">inst_ctrl.is_csr : csru_rdata,</span>
    <span class="hljs-keyword">default</span>          : alu_result
};
</code></pre></div><p>最後に、デバッグ用の表示を追加します。 デバッグ表示用のalways_ffブロックに、 次のコードを追加してください(リスト7)。</p><p><span class="caption">▼リスト4.7: rdataをデバッグ表示する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/43b3759d4d079b54a79d1e4b078974ec7bd58587~1..43b3759d4d079b54a79d1e4b078974ec7bd58587#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> inst_ctrl.is_csr {
    $display(<span class="hljs-string">&quot;  csr rdata : %h&quot;</span>, csru_rdata);
}
</code></pre></div><p>これらのテストは、 csrunitモジュールにCSRを追加してから行います。</p><h3 id="mtvecレジスタを実装する" tabindex="-1">mtvecレジスタを実装する <a class="header-anchor" href="#mtvecレジスタを実装する" aria-label="Permalink to “mtvecレジスタを実装する”">​</a></h3><p>csrunitモジュールには、まだCSRが定義されていません。 1つ目のCSRとして、mtvecレジスタを実装します。</p><h4 id="mtvecレジスタ、トラップ" tabindex="-1">mtvecレジスタ、トラップ <a class="header-anchor" href="#mtvecレジスタ、トラップ" aria-label="Permalink to “mtvecレジスタ、トラップ”">​</a></h4><p><img src="`+p+`" alt="mtvecのエンコーディング"></p><p class="caption">▲図1: mtvecのエンコーディング</p> mtvecは、MXLENビットのWARLなレジスタです。 mtvecのアドレスは\`12&#39;h305\`です。 <p>MXLENはmisaレジスタに定義されていますが、 今のところはXLENと等しいという認識で問題ありません。 WARLはWrite Any Values, Reads Legal Valuesの略です。 その名の通り、好きな値を書き込めますが 読み出すときには合法な値<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>になっているという認識で問題ありません。</p><p>mtvecは、トラップ(Trap)が発生したときのジャンプ先(Trap-Vector)の基準となるアドレスを格納するレジスタです。 <strong>トラップ</strong>とは、例外(Exception)、または割り込み(Interrupt)により、 CPUの制御を変更することです<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>。 トラップが発生するとき、CPUはCSRを変更した後、 mtvecに格納されたアドレスにジャンプします。</p><p><strong>例外</strong>とは、命令の実行によって引き起こされる異常な状態(unusual condition)のことです。 例えば、不正な命令を実行しようとしたときにはIllegal Instruction例外が発生します。 CPUは、例外が発生したときのジャンプ先(対処方法)を決めておくことで、 CPUが異常な状態に陥ったままにならないようにしています。</p><p>mtvecはBASEとMODEの2つのフィールドで構成されています。 MODEはジャンプ先の決め方を指定するためのフィールドですが、 簡単のために常に<code>2&#39;b00</code>(Directモード)になるようにします。 Directモードのとき、トラップ時のジャンプ先は<code>BASE &lt;&lt; 2</code>になります。</p><h4 id="mtvecレジスタの実装" tabindex="-1">mtvecレジスタの実装 <a class="header-anchor" href="#mtvecレジスタの実装" aria-label="Permalink to “mtvecレジスタの実装”">​</a></h4><p>それでは、mtvecレジスタを実装します。 まず、CSRのアドレスを表す列挙型を定義します (リスト8)。</p><p><span class="caption">▼リスト4.8: CsrAddr型を定義する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSRのアドレス</span>
<span class="hljs-keyword">enum</span> CsrAddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; {
    MTVEC = <span class="hljs-number">12&#39;h305</span>,
}
</code></pre></div><p>次に、mtvecレジスタを作成します。 MXLEN=XLENとしているので、 型は<code>UIntX</code>にします (リスト9)。</p><p><span class="caption">▼リスト4.9: mtvecレジスタの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSR</span>
<span class="hljs-keyword">var</span> mtvec: UIntX;
</code></pre></div><p>MODEはDirectモード(<code>2&#39;b00</code>)しか対応していません。 mtvecはWARLなレジスタなので、 MODEフィールドには書き込めないようにする必要があります。 これを制御するためにmtvecレジスタの書き込みマスク用の定数を定義します (リスト10)。</p><p><span class="caption">▼リスト4.10: mtvecレジスタの書き込みマスクの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// wmasks</span>
<span class="hljs-keyword">const</span> MTVEC_WMASK: UIntX = <span class="hljs-number">&#39;hffff_fffc</span>;
</code></pre></div><p>次に、書き込むデータ<code>wdata</code>の生成と、 mtvecレジスタの読み込みを実装します(リスト11)。</p><p><span class="caption">▼リスト4.11: レジスタの読み込みと書き込むデータの作成 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> wmask: UIntX; <span class="hljs-comment">// write mask</span>
<span class="hljs-keyword">var</span> wdata: UIntX; <span class="hljs-comment">// write data</span>

<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// read</span>
    rdata = <span class="hljs-keyword">case</span> csr_addr {
        CsrAddr::MTVEC: mtvec,
        <span class="hljs-keyword">default</span>       : &#39;x,
    };
    <span class="hljs-comment">// write</span>
    wmask = <span class="hljs-keyword">case</span> csr_addr {
        CsrAddr::MTVEC: MTVEC_WMASK,
        <span class="hljs-keyword">default</span>       : <span class="hljs-number">0</span>,
    };
    wdata = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b01</span>  : rs1,
        <span class="hljs-number">2&#39;b10</span>  : rdata | rs1,
        <span class="hljs-number">2&#39;b11</span>  : rdata &amp; ~rs1,
        <span class="hljs-keyword">default</span>: &#39;x,
    } &amp; wmask | (rdata &amp; ~wmask);
}
</code></pre></div><p>always_combブロックで、 <code>rdata</code>ポートに<code>csr_addr</code>に応じたCSRの値を割り当てます。 <code>wdata</code>には、CSRに書き込むデータを割り当てます。 CSRに書き込むデータは、 書き込む命令(CSRRW[I]、CSRRS[I]、CSRRC[I])によって異なります。 <code>rs1</code>ポートにはrs1の値か即値が供給されているため、 これと<code>rdata</code>を利用して<code>wdata</code>を生成しています。 funct3と演算の種類の関係は 表2を参照してください。</p><p>最後に、mtvecレジスタへの書き込み処理を実装します。 mtvecへの書き込みは、 命令がCSR命令である場合(<code>is_wsc</code>)にのみ行います (リスト12)。</p><p><span class="caption">▼リスト4.12: CSRへの書き込み処理 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        mtvec = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> valid {
            <span class="hljs-keyword">if</span> is_wsc {
                <span class="hljs-keyword">case</span> csr_addr {
                    CsrAddr::MTVEC: mtvec = wdata;
                    <span class="hljs-keyword">default</span>       : {}
                }
            }
        }
    }
}
</code></pre></div><p>mtvecの初期値は<code>0</code>です。 mtvecに<code>wdata</code>を書き込むとき、 MODEが常に<code>2&#39;b00</code>になります。</p><h3 id="csrunitモジュールをテストする" tabindex="-1">csrunitモジュールをテストする <a class="header-anchor" href="#csrunitモジュールをテストする" aria-label="Permalink to “csrunitモジュールをテストする”">​</a></h3><p>mtvecレジスタの書き込み、 読み込みができることを確認します。</p><p><code>test/sample_csr.hex</code>を作成し、 次のように記述します(リスト13)。</p><p><span class="caption">▼リスト4.13: sample_csr.hex</span> <a href="https://github.com/nananapo/bluecore/compare/2aebac3401cf11fa04fdfaa918401d1bf0a3adc5~1..2aebac3401cf11fa04fdfaa918401d1bf0a3adc5#diff-47d9e90d4876f4a6f796e2e1837db907c2838c0df7f630a81f65fc98cbed5c76">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>305bd0f3 // 0: csrrwi x1, mtvec, 0b10111
30502173 // 4: csrrs  x2, mtvec, x0
</code></pre></div><p>テストでは、 CSRRWI命令でmtvecに<code>32&#39;b10111</code>を書き込んだ後、 CSRRS命令でmtvecの値を読み込みます。 CSRRS命令で読み込むとき、 rs1をx0(ゼロレジスタ)にすることで、 mtvecの値を変更せずに読み込みます。</p><p>シミュレータを実行し、結果を確かめます(リスト14)。</p><p><span class="caption">▼リスト4.14: mtvecの読み込み/書き込みテストの実行</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/sample_csr.hex 5</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 305bd0f3 ← mtvecに32&#39;b10111を書き込む
  itype     : 000010
  rs1[23]   : 00000000 ← CSRRWIなので、mtvecに32&#39;b10111(=23)を書き込む
  csr rdata : 00000000 ← mtvecの初期値(0)が読み込まれている
  reg[ 1] &lt;= 00000000
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   5</span>
00000004 : 30502173 ← mtvecを読み込む
  itype     : 000010
  csr rdata : 00000014 ← mtvecに書き込まれた値を読み込んでいる
  reg[ 2] &lt;= 00000014 ← 32&#39;b10111のMODE部分がマスクされて、32&#39;b10100 = 14になっている
</code></pre></div><p>mtvecのBASEフィールドにのみ書き込みが行われ、 <code>32&#39;h00000014</code>が読み込まれることを確認できます。</p><h2 id="ecall命令の実装" tabindex="-1">ECALL命令の実装 <a class="header-anchor" href="#ecall命令の実装" aria-label="Permalink to “ECALL命令の実装”">​</a></h2><p>せっかくmtvecレジスタを実装したので、これを使う命令を実装します。</p><h3 id="ecall命令とは何か" tabindex="-1">ECALL命令とは何か? <a class="header-anchor" href="#ecall命令とは何か" aria-label="Permalink to “ECALL命令とは何か?”">​</a></h3><p>RV32Iには、意図的に例外を発生させる命令としてECALL命令が定義されています。 ECALL命令を実行すると、 現在の権限レベル(Privilege Level)に応じて表4のような例外が発生します。</p><p><strong>権限レベル</strong>とは、 権限(特権)を持つソフトウェアを実装するための機能です。 例えばOS上で動くソフトウェアは、 セキュリティのために、他のソフトウェアのメモリを侵害できないようにする必要があります。 権限レベル機能があると、このような保護を、 権限のあるOSが権限のないソフトウェアを管理するという風に実現できます。</p><p>権限レベルはいくつか定義されていますが、 本章では最高の権限レベルであるMachineレベル(M-mode)しかないものとします。</p><div id="ecall.expts" class="table"><p class="caption">表4.4: 権限レベルとECALLによる例外</p><table><tr class="hline"><th>権限レベル</th><th>ECALLによって発生する例外</th></tr><tr class="hline"><td>M</td><td>Environment call from M-mode</td></tr><tr class="hline"><td>S</td><td>Environment call from S-mode</td></tr><tr class="hline"><td>U</td><td>Environment call from U-mode</td></tr></table></div><h4 id="mcause、mepcレジスタ" tabindex="-1">mcause、mepcレジスタ <a class="header-anchor" href="#mcause、mepcレジスタ" aria-label="Permalink to “mcause、mepcレジスタ”">​</a></h4><p>ECALL命令を実行すると例外が発生します。 例外が発生するとmtvecにジャンプし、例外が発生した時の処理を行います。 これだけでもいいのですが、例外が発生したときに、 どこで(PC)、どのような例外が発生したのかを知りたいことがあります。 これを知るために、RISC-Vには、 どこで例外が発生したかを格納するmepcレジスタと、 例外の発生原因を格納するmcauseレジスタが存在しています。</p><p>CPUは例外が発生すると、mtvecにジャンプする前に、 mepcに現在のPC、mcauseに発生原因を格納します。 これにより、mtvecにジャンプしてから例外に応じた処理を実行できるようになります。</p><p>例外の発生原因は数値で表現されており、 Environment call from M-mode例外には11が割り当てられています。</p><h3 id="トラップを実装する" tabindex="-1">トラップを実装する <a class="header-anchor" href="#トラップを実装する" aria-label="Permalink to “トラップを実装する”">​</a></h3><p>それでは、ECALL命令とトラップの仕組みを実装します。</p><h4 id="定数の定義" tabindex="-1">定数の定義 <a class="header-anchor" href="#定数の定義" aria-label="Permalink to “定数の定義”">​</a></h4><p>まず、mepcとmcauseのアドレスを<code>CsrAddr</code>型に追加します (リスト15)。</p><p><span class="caption">▼リスト4.15: mepcとmcauseのアドレスを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSRのアドレス</span>
<span class="hljs-keyword">enum</span> CsrAddr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; {
    MTVEC = <span class="hljs-number">12&#39;h305</span>,
    <span class="custom-hl-bold">MEPC = <span class="hljs-number">12&#39;h341</span>,</span>
    <span class="custom-hl-bold">MCAUSE = <span class="hljs-number">12&#39;h342</span>,</span>
}
</code></pre></div><p>次に、トラップの発生原因を表現する型<code>CsrCause</code>を定義します。 今のところ、発生原因はECALL命令によるEnvironment Call From M-mode例外しかありません (リスト16)。</p><p><span class="caption">▼リスト4.16: CsrCause型の定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> CsrCause: UIntX {
    ENVIRONMENT_CALL_FROM_M_MODE = <span class="hljs-number">11</span>,
}
</code></pre></div><p>最後に、mepcとmcauseの書き込みマスクを定義します (リスト17)。 mepcに格納されるのは例外が発生した時の命令のアドレスです。 命令は4バイトに整列して配置されているため、 mepcの下位2ビットは常に<code>2&#39;b00</code>になるようにします。</p><p><span class="caption">▼リスト4.17: mepcとmcauseの書き込みマスクの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MTVEC_WMASK : UIntX = <span class="hljs-number">&#39;hffff_fffc</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">const</span> MEPC_WMASK  : UIntX = <span class="hljs-number">&#39;hffff_fffc</span>;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">const</span> MCAUSE_WMASK: UIntX = <span class="hljs-number">&#39;hffff_ffff</span>;</span>
</code></pre></div><h4 id="mepcとmcauseレジスタの実装" tabindex="-1">mepcとmcauseレジスタの実装 <a class="header-anchor" href="#mepcとmcauseレジスタの実装" aria-label="Permalink to “mepcとmcauseレジスタの実装”">​</a></h4><p>mepcとmcauseレジスタを作成します。 サイズはMXLEN(=XLEN)なため、型は<code>UIntX</code>とします (リスト18)。</p><p><span class="caption">▼リスト4.18: mepcとmcauseレジスタの定義 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// CSR</span>
<span class="hljs-keyword">var</span> mtvec : UIntX;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mepc  : UIntX;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> mcause: UIntX;</span>
</code></pre></div><p>次に、mepcとmcauseの読み込み処理と、書き込みマスクの割り当てを実装します。 どちらもcase文にアドレスと値のペアを追加するだけです ( リスト19、 リスト20 )。</p><p><span class="caption">▼リスト4.19: mepcとmcauseの読み込み (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>rdata = <span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::MTVEC : mtvec,
    <span class="custom-hl-bold">CsrAddr::MEPC  : mepc,</span>
    <span class="custom-hl-bold">CsrAddr::MCAUSE: mcause,</span>
    <span class="hljs-keyword">default</span>        : &#39;x,
};
</code></pre></div><p><span class="caption">▼リスト4.20: mepcとmcauseの書き込みマスクの設定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>wmask = <span class="hljs-keyword">case</span> csr_addr {
    CsrAddr::MTVEC : MTVEC_WMASK,
    <span class="custom-hl-bold">CsrAddr::MEPC  : MEPC_WMASK,</span>
    <span class="custom-hl-bold">CsrAddr::MCAUSE: MCAUSE_WMASK,</span>
    <span class="hljs-keyword">default</span>        : <span class="hljs-number">0</span>,
};
</code></pre></div><p>最後に、mepcとmcauseの書き込みを実装します。 if_resetで値を<code>0</code>に初期化し、case文にmepcとmcauseの場合を実装します (リスト27)。</p><h4 id="例外の実装" tabindex="-1">例外の実装 <a class="header-anchor" href="#例外の実装" aria-label="Permalink to “例外の実装”">​</a></h4><p>ECALL命令と、それによって発生するトラップを実装します。 まず、csrunitモジュールにポートを追加します (リスト21)。</p><p><span class="caption">▼リスト4.21: csrunitモジュールにポートを追加する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> csrunit (
    clk        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>       ,
    rst        : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>       ,
    valid      : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>       ,
    <span class="custom-hl-bold">pc         : <span class="hljs-keyword">input</span>  Addr        ,</span>
    ctrl       : <span class="hljs-keyword">input</span>  InstCtrl    ,
    <span class="custom-hl-bold">rd_addr    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">5</span>&gt; ,</span>
    csr_addr   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">12</span>&gt;,
    rs1        : <span class="hljs-keyword">input</span>  UIntX       ,
    rdata      : <span class="hljs-keyword">output</span> UIntX       ,
    <span class="custom-hl-bold">raise_trap : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>       ,</span>
    <span class="custom-hl-bold">trap_vector: <span class="hljs-keyword">output</span> Addr        ,</span>
) {
</code></pre></div><p>それぞれの用途は次の通りです。</p><dl><dt>pc</dt><dd> 現在処理している命令のアドレスを受け取ります。<br> 例外が発生するとき、mepcにPCを格納するために使います。 </dd><dt>rd_addr</dt><dd> 現在処理している命令のrdの番号を受け取ります。<br> 命令がECALL命令かどうかを判定するために使います。 </dd><dt>raise_trap</dt><dd> 例外が発生するとき、値を\`1\`にします。 </dd><dt>trap_vector</dt><dd> 例外が発生するとき、ジャンプ先のアドレスを出力します。 </dd></dl><p>csrunitモジュールの中身を実装する前に、 coreモジュールに例外発生時の動作を実装します。</p><p>csrunitモジュールと接続するための変数を定義してcsrunitモジュールと接続します ( リスト22、 リスト23 )。</p><p><span class="caption">▼リスト4.22: csrunitモジュールのポートの定義を変更する ① (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> csru_rdata      : UIntX;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> csru_raise_trap : <span class="hljs-keyword">logic</span>;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> csru_trap_vector: Addr ;</span>
</code></pre></div><p><span class="caption">▼リスト4.23: csrunitモジュールのポートの定義を変更する ② (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> csru: csrunit (
    clk                       ,
    rst                       ,
    valid   : inst_valid      ,
    <span class="custom-hl-bold">pc      : inst_pc         ,</span>
    ctrl    : inst_ctrl       ,
    <span class="custom-hl-bold">rd_addr                   ,</span>
    csr_addr: inst_bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>],
    rs1     : <span class="hljs-keyword">if</span> inst_ctrl.funct3[<span class="hljs-number">2</span>] == <span class="hljs-number">1</span> &amp;&amp; inst_ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span> ? {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(rs1_addr), rs1_addr} <span class="hljs-comment">// rs1を0で拡張する</span>
     : rs1_data,
    rdata      : csru_rdata                                                                                                           ,
    <span class="custom-hl-bold">raise_trap : csru_raise_trap ,</span>
    <span class="custom-hl-bold">trap_vector: csru_trap_vector,</span>
);
</code></pre></div><p>次に、トラップするときにトラップ先にジャンプさせます。</p><p>例外が発生するとき、 <code>csru_raise_trap</code>が<code>1</code>になり、 <code>csru_trap_vector</code>がトラップ先になります。 トラップするときの動作には、 ジャンプと分岐命令の仕組みを利用します。 <code>control_hazard</code>の条件に<code>csru_raise_trap</code>を追加して、 トラップするときに<code>control_hazard_pc_next</code>を<code>csru_trap_vector</code>に設定します (リスト24)。</p><p><span class="caption">▼リスト4.24: 例外の発生時にジャンプさせる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> control_hazard         = inst_valid &amp;&amp; (<span class="custom-hl-bold">csru_raise_trap</span> || inst_ctrl.is_jump || inst_is_br(inst_ctrl) &amp;&amp; brunit_take);
<span class="hljs-keyword">assign</span> control_hazard_pc_next = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
    <span class="custom-hl-bold">csru_raise_trap      : csru_trap_vector,</span>← トラップするとき、trap_vectorに飛ぶ
    inst_is_br(inst_ctrl): inst_pc + inst_imm,
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span></span>              : alu_result &amp; ~<span class="hljs-number">1</span>
};
</code></pre></div><p><img src="`+l+`" alt="ECALL命令のエンコーディング"></p><p class="caption">▲図2: ECALL命令のエンコーディング</p> それでは、csrunitモジュールにトラップの処理を実装します。 <p>ECALL命令は、 I形式、 即値は<code>0</code>、 rs1とrdは<code>0</code>、 funct3は<code>0</code>、 opcodeは<code>SYSTEM</code>な命令です(図2)。 これを判定するための変数を作成します(リスト25)。</p><p><span class="caption">▼リスト4.25: ECALL命令かどうかの判定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// ECALL命令かどうか</span>
<span class="hljs-keyword">let</span> is_ecall: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; csr_addr == <span class="hljs-number">0</span> &amp;&amp; rs1[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; ctrl.funct3 == <span class="hljs-number">0</span> &amp;&amp; rd_addr == <span class="hljs-number">0</span>;
</code></pre></div><p>次に、例外が発生するかどうかを示す<code>raise_expt</code>と、 例外の発生の原因を示す<code>expt_cause</code>を作成します。 今のところ、例外はECALL命令によってのみ発生するため、 <code>expt_cause</code>は実質的に定数になっています (リスト26)。</p><p><span class="caption">▼リスト4.26: 例外とトラップの判定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Exception</span>
<span class="hljs-keyword">let</span> raise_expt: <span class="hljs-keyword">logic</span> = valid &amp;&amp; is_ecall;
<span class="hljs-keyword">let</span> expt_cause: UIntX = CsrCause::ENVIRONMENT_CALL_FROM_M_MODE;

<span class="hljs-comment">// Trap</span>
<span class="hljs-keyword">assign</span> raise_trap  = raise_expt;
<span class="hljs-keyword">let</span> trap_cause : UIntX = expt_cause;
<span class="hljs-keyword">assign</span> trap_vector = mtvec;
</code></pre></div><p>トラップが発生するかどうかを示す<code>raise_trap</code>には、 例外が発生するかどうかを割り当てます。 トラップの原因を示す<code>trap_cause</code>には、 例外の発生原因を割り当てます。 また、トラップ先には<code>mtvec</code>を割り当てます。</p><p>最後に、トラップに伴うCSRの変更を実装します。 トラップが発生するとき、 mepcレジスタにPC、 mcauseレジスタにトラップの発生原因を格納します (リスト27)。</p><p><span class="caption">▼リスト4.27: CSR、トラップ発生時の処理を実装する (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        mtvec  = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">mepc   = <span class="hljs-number">0</span>;</span> ← CSRの初期化
        <span class="custom-hl-bold">mcause = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> valid {
            <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_trap {</span> ← トラップが発生したときの処理
                <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_expt {</span>
                    <span class="custom-hl-bold">mepc   = pc;</span>
                    <span class="custom-hl-bold">mcause = trap_cause;</span>
                <span class="custom-hl-bold">}</span>
            <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
                <span class="hljs-keyword">if</span> is_wsc {
                    <span class="hljs-keyword">case</span> csr_addr {
                        CsrAddr::MTVEC : mtvec  = wdata;
                        <span class="custom-hl-bold">CsrAddr::MEPC  : mepc   = wdata;</span> ← CSRの書き込み
                        <span class="custom-hl-bold">CsrAddr::MCAUSE: mcause = wdata;</span>
                        <span class="hljs-keyword">default</span>        : {}
                    }
                }
            }
        }
    }
}
</code></pre></div><h3 id="ecall命令をテストする" tabindex="-1">ECALL命令をテストする <a class="header-anchor" href="#ecall命令をテストする" aria-label="Permalink to “ECALL命令をテストする”">​</a></h3><p>ECALL命令をテストする前に、 デバッグのために<code>$display</code>システムタスクで、 例外が発生したかどうかと、 トラップ先を表示します (リスト28)。</p><p><span class="caption">▼リスト4.28: トラップの情報をデバッグ表示する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> inst_ctrl.is_csr {
    $display(<span class="hljs-string">&quot;  csr rdata : %h&quot;</span>, csru_rdata);
    <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  csr trap  : %b&quot;</span>, csru_raise_trap);</span>
    <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  csr vec   : %h&quot;</span>, csru_trap_vector);</span>
}
</code></pre></div><p><code>test/sample_ecall.hex</code>を作成し、 次のように記述します (リスト29)。</p><p><span class="caption">▼リスト4.29: sample_ecall.hex</span> <a href="https://github.com/nananapo/bluecore/compare/b0afb267a5d118fb0e3441a912405648720ea47b~1..b0afb267a5d118fb0e3441a912405648720ea47b#diff-818919fa8011230661860f6c1f57b536be1be4559c0ce404f6fd655e4616735b">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>30585073 //  0: csrrwi x0, mtvec, 0x10
00000073 //  4: ecall
00000000 //  8:
00000000 //  c:
342020f3 // 10: csrrs x1, mcause, x0
34102173 // 14: csrrs x2, mepc, x0
</code></pre></div><p>CSRRWI命令でmtvecレジスタに値を書き込み、 ECALL命令で例外を発生させてジャンプします。 ジャンプ先では、 mcauseレジスタとmepcレジスタの値を読み取ります。</p><p>シミュレータを実行し、結果を確かめます(リスト30)。</p><p><span class="caption">▼リスト4.30: ECALL命令のテストの実行</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/sample_ecall.hex 10</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 30585073 ← CSRRWIでmtvecに書き込み
  rs1[16]   : 00000000 ← 10(=16)をmtvecに書き込む
  csr trap  : 0
  csr vec   : 00000000
  reg[ 0] &lt;= 00000000
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   5</span>
00000004 : 00000073
  csr trap  : 1 ← ECALL命令により、例外が発生する
  csr vec   : 00000010 ← ジャンプ先は0x10
  reg[ 0] &lt;= 00000000
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   9</span>
00000010 : 342020f3
  csr rdata : 0000000b ← CSRRSでmcauseを読み込む
  reg[ 1] &lt;= 0000000b ← Environment call from M-modeなのでb(=11)
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  10</span>
00000014 : 34102173
  csr rdata : 00000004 ← CSRRSでmepcを読み込む
  reg[ 2] &lt;= 00000004 ← 例外はアドレス4で発生したので4
</code></pre></div><p>ECALL命令によって例外が発生し、 mcauseとmepcに書き込みが行われてからmtvecにジャンプしていることを確認できます。</p><p>ECALL命令の実行時にレジスタに値がライトバックされてしまっていますが、 ECALL命令のrdは常に0番目のレジスタであり、 0番目のレジスタは常に値が<code>0</code>になるため問題ありません。</p><h2 id="mret命令の実装" tabindex="-1">MRET命令の実装 <a class="header-anchor" href="#mret命令の実装" aria-label="Permalink to “MRET命令の実装”">​</a></h2><p>MRET命令<sup class="footnote-ref"><a href="#fn4" id="fnref4">[4]</a></sup>は、 トラップ先からトラップ元に戻るための命令です。 MRET命令を実行すると、 mepcレジスタに格納されたアドレスにジャンプします<sup class="footnote-ref"><a href="#fn5" id="fnref5">[5]</a></sup>。 例えば、権限のあるOSから権限のないユーザー空間に戻るために利用します。</p><h3 id="mret命令を実装する" tabindex="-1">MRET命令を実装する <a class="header-anchor" href="#mret命令を実装する" aria-label="Permalink to “MRET命令を実装する”">​</a></h3><p><img src="`+t+`" alt="MRET命令のエンコーディング"></p><p class="caption">▲図3: MRET命令のエンコーディング</p> まず、 csrunitモジュールに供給されている命令がMRET命令かどうかを判定する変数\`is_mret\`を作成します (リスト31)。 MRET命令は、上位12ビットは\`12&#39;b001100000010\`、 rs1は\`0\`、funct3は\`0\`、rdは\`0\`です(図3)。 <p><span class="caption">▼リスト4.31: MRET命令の判定 (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/21d10d776be22240e23ee51cd77916fc4044263d~1..21d10d776be22240e23ee51cd77916fc4044263d#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// MRET命令かどうか</span>
<span class="hljs-keyword">let</span> is_mret: <span class="hljs-keyword">logic</span> = ctrl.is_csr &amp;&amp; csr_addr == <span class="hljs-number">12&#39;b0011000_00010</span> &amp;&amp; rs1[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; ctrl.funct3 == <span class="hljs-number">0</span> &amp;&amp; rd_addr == <span class="hljs-number">0</span>;
</code></pre></div><p>次に、 csrunitモジュールにMRET命令が供給されているときにmepcにジャンプする仕組みを実装します。 ジャンプするための仕組みには、トラップによってジャンプする仕組みを利用します (リスト32)。 <code>raise_trap</code>に<code>is_mret</code>を追加し、トラップ先も変更します。</p><p><span class="caption">▼リスト4.32: MRET命令によってジャンプさせる (csrunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/21d10d776be22240e23ee51cd77916fc4044263d~1..21d10d776be22240e23ee51cd77916fc4044263d#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// Trap</span>
<span class="hljs-keyword">assign</span> raise_trap  = raise_expt <span class="custom-hl-bold">|| (valid &amp;&amp; is_mret)</span>;
<span class="hljs-keyword">let</span> trap_cause : UIntX = expt_cause;
<span class="hljs-keyword">assign</span> trap_vector = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> raise_expt ?</span> mtvec <span class="custom-hl-bold">: mepc</span>;
</code></pre></div><div class="info custom-block"><p class="custom-block-title"><b>例外が優先</b></p><p>trap_vectorには、 <code>is_mret</code>のときに<code>mepc</code>を割り当てるのではなく、 <code>raise_expt</code>のときに<code>mtvec</code>を割り当てています。 これは、MRET命令によって発生する例外があるからです。 MRET命令の判定を優先すると、例外が発生するのにmepcにジャンプしてしまいます。</p></div><h3 id="mret命令をテストする" tabindex="-1">MRET命令をテストする <a class="header-anchor" href="#mret命令をテストする" aria-label="Permalink to “MRET命令をテストする”">​</a></h3><p>mepcに値を設定してからMRET命令を実行することで mepcにジャンプするようなテストを作成します (リスト33)。</p><p><span class="caption">▼リスト4.33: sample_mret.hex</span> <a href="https://github.com/nananapo/bluecore/compare/21d10d776be22240e23ee51cd77916fc4044263d~1..21d10d776be22240e23ee51cd77916fc4044263d#diff-32b144559a214c9ebf3ea88eeeb575aa9aaec2d41f76a6e875c34e8726a6be17">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>34185073 //  0: csrrwi x0, mepc, 0x10
30200073 //  4: mret
00000000 //  8:
00000000 //  c:
00000013 // 10: addi x0, x0, 0
</code></pre></div><p>シミュレータを実行し、結果を確かめます(リスト34)。</p><p><span class="caption">▼リスト4.34: MRET命令のテストの実行</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/sample_mret.hex 9</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 34185073 ← CSRRWIでmepcに書き込み
  rs1[16]   : 00000000 ← 0x10(=16)をmepcに書き込む
  csr trap  : 0
  csr vec   : 00000000
  reg[ 0] &lt;= 00000000
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   5</span>
00000004 : 30200073
  csr trap  : 1 ← MRET命令によってmepcにジャンプする
  csr vec   : 00000010 ← 10にジャンプする
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   9</span>
00000010 : 00000013 ← 10にジャンプしている
</code></pre></div><p>MRET命令によってmepcにジャンプすることを確認できます。</p><p>MRET命令はレジスタに値をライトバックしていますが、 ECALL命令と同じく0番目のレジスタが指定されるため問題ありません。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>それぞれの機能は実装するときに解説します <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>合法な値とは実装がサポートしている有効な値のことです <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>トラップや例外、割り込みはVolume Iの1.6Exceptions, Traps, and Interruptsに定義されています <a href="#fnref3" class="footnote-backref">↩︎</a></p></li><li id="fn4" class="footnote-item"><p>MRET命令はVolume IIの3.3.2. Trap-Return Instructionsに定義されています <a href="#fnref4" class="footnote-backref">↩︎</a></p></li><li id="fn5" class="footnote-item"><p>他のCSRや権限レベルが実装されている場合は、他にも行うことがあります <a href="#fnref5" class="footnote-backref">↩︎</a></p></li></ol></section>`,177)])])}const y=a(d,[["render",r]]);export{f as __pageData,y as default};
