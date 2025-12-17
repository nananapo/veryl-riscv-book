import{_ as e,c as p,o as c,ah as l,j as s,a,bz as d}from"./chunks/framework.HhScKIQu.js";const f=JSON.parse('{"title":"M拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"10-impl-m.md","filePath":"10-impl-m.md"}'),o={name:"10-impl-m.md"};function t(r,n,i,u,h,b){return c(),p("div",null,[...n[0]||(n[0]=[l(`<h1 id="m拡張の実装" tabindex="-1">M拡張の実装 <a class="header-anchor" href="#m拡張の実装" aria-label="Permalink to “M拡張の実装”">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to “概要”">​</a></h2><p>「第I部 RV32I / RV64Iの実装」ではRV64IのCPUを実装しました。 「第II部 RV64IMACの実装」では、次のような機能を実装します。</p><ul><li>乗算、除算、剰余演算命令 (M拡張)</li><li>不可分操作命令 (A拡張)</li><li>圧縮命令 (C拡張)</li><li>例外</li><li>Memory-mapped I/O</li></ul><p>本章では積、商、剰余を求める命令を実装します。 RISC-Vの乗算、除算、剰余演算を行う命令はM拡張に定義されており、 M拡張を実装したRV64IのISAのことを<code>RV64IM</code>と表記します。</p><p>M拡張には、XLENが<code>32</code>のときは表1の命令が定義されています。 XLENが<code>64</code>のときは表2の命令が定義されています。</p><div id="m.instructions.32" class="table"><p class="caption">表9.1: M拡張の命令 (XLEN=32)</p><table><tr class="hline"><th>命令</th><th>動作</th></tr><tr class="hline"><td>MUL</td><td>rs1(符号付き) × rs2(符号付き)の結果(64ビット)の下位32ビットを求める</td></tr><tr class="hline"><td>MULH</td><td>rs1(符号付き) × rs2(符号付き)の結果(64ビット)の上位32ビットを求める</td></tr><tr class="hline"><td>MULHU</td><td>rs1(符号無し) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める</td></tr><tr class="hline"><td>MULHSU</td><td>rs1(符号付き) × rs2(符号無し)の結果(64ビット)の上位32ビットを求める</td></tr><tr class="hline"><td>DIV</td><td>rs1(符号付き) / rs2(符号付き)を求める</td></tr><tr class="hline"><td>DIVU</td><td>rs1(符号無し) / rs2(符号無し)を求める</td></tr><tr class="hline"><td>REM</td><td>rs1(符号付き) % rs2(符号付き)を求める</td></tr><tr class="hline"><td>REMU</td><td>rs1(符号無し) % rs2(符号無し)を求める</td></tr></table></div><div id="m.instructions.64" class="table"><p class="caption">表9.2: M拡張の命令 (XLEN=64)</p><table><tr class="hline"><th>命令</th><th>動作</th></tr><tr class="hline"><td>MUL</td><td>rs1(符号付き) × rs2(符号付き)の結果(128ビット)の下位64ビットを求める</td></tr><tr class="hline"><td>MULW</td><td>rs1[31:0](符号付き) × rs2[31:0](符号付き)の結果(64ビット)の下位32ビットを求める<br>結果は符号拡張する</td></tr><tr class="hline"><td>MULH</td><td>rs1(符号付き) × rs2(符号付き)の結果(128ビット)の上位64ビットを求める</td></tr><tr class="hline"><td>MULHU</td><td>rs1(符号無し) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める</td></tr><tr class="hline"><td>MULHSU</td><td>rs1(符号付き) × rs2(符号無し)の結果(128ビット)の上位64ビットを求める</td></tr><tr class="hline"><td>DIV</td><td>rs1(符号付き) / rs2(符号付き)を求める</td></tr><tr class="hline"><td>DIVW</td><td>rs1[31:0](符号付き) / rs2[31:0](符号付き)を求める<br>結果は符号拡張する</td></tr><tr class="hline"><td>DIVU</td><td>rs1(符号無し) / rs2(符号無し)を求める</td></tr><tr class="hline"><td>DIVWU</td><td>rs1[31:0](符号無し) / rs2[31:0](符号無し)を求める<br>結果は符号拡張する</td></tr><tr class="hline"><td>REM</td><td>rs1(符号付き) % rs2(符号付き)を求める</td></tr><tr class="hline"><td>REMW</td><td>rs1[31:0](符号付き) % rs2[31:0](符号付き)を求める<br>結果は符号拡張する</td></tr><tr class="hline"><td>REMU</td><td>rs1(符号無し) % rs2(符号無し)を求める</td></tr><tr class="hline"><td>REMUW</td><td>rs1[31:0](符号無し) % rs2[31:0](符号無し)を求める<br>結果は符号拡張する</td></tr></table></div> Verylには積、商、剰余を求める演算子\`*\`、\`/\`、\`%\`が定義されており、 これを利用することで簡単に計算を実装できます(リスト1)。 <p><span class="caption">▼リスト9.1: 演算子による実装例</span></p><div class="language-by"><button title="Copy Code" class="copy"></button><span class="lang">by</span><pre class="hljs"><code>assign mul = op1 * op2;
assign div = op1 / op2;
assign rem = op1 % op2;
</code></pre></div><p>例えば乗算回路をFPGA上に実装する場合、通常は合成系によってFPGAに搭載されている乗算器が自動的に利用されます<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。 これにより、低遅延、低リソースコストで効率的な乗算回路を自動的に実現できます。 しかし、32ビットや64ビットの乗算を実装する際、 FPGA上の乗算器の数が不足すると、LUTを用いた大規模な乗算回路が構築されることがあります。 このような大規模な回路はFPGAのリソースの使用量や遅延に大きな影響を与えるため好ましくありません。 除算や剰余演算でも同じ問題<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>が生じることがあります。</p><p><code>*</code>、<code>/</code>、<code>%</code>演算子がどのような回路に合成されるかは、 合成系が全体の実装を考慮して自動的に決定するため、 その挙動をコントロールするのは難しいです。 そこで本章では、<code>*</code>、<code>/</code>、<code>%</code>演算子を使用せず、 足し算やシフト演算などの基本的な論理だけを用いて同等の演算を実装します。</p><p>基本編では積、商、剰余を効率よく<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>求める実装は検討せず、できるだけ単純な方法で実装します。</p><h2 id="命令のデコード" tabindex="-1">命令のデコード <a class="header-anchor" href="#命令のデコード" aria-label="Permalink to “命令のデコード”">​</a></h2><p>まず、M拡張の命令をデコードします。 M拡張の命令はすべてR形式であり、レジスタの値同士の演算を行います。 funct7は<code>7&#39;b0000001</code>です。 MUL、MULH、MULHSU、MULHU、DIV、DIVU、REM、REMU命令のopcodeは<code>7&#39;b0110011</code>(OP)で、 MULW、DIVW、DIVUW、REMW、REMUW命令のopcodeは<code>7&#39;b0111011</code>(OP-32)です。</p><p>それぞれの命令はfunct3で区別します(表3)。 乗算命令のfunct3はMSBが<code>0</code>、除算と剰余演算命令は<code>1</code>になっています。</p><div id="m.funct3.64" class="table"><p class="caption">表9.3: M拡張の命令の区別</p><table><tr class="hline"><th>命令</th><th>funct3</th></tr><tr class="hline"><td>MUL、MULW</td><td>000</td></tr><tr class="hline"><td>MULH</td><td>001</td></tr><tr class="hline"><td>MULHU</td><td>010</td></tr><tr class="hline"><td>MULHSU</td><td>011</td></tr><tr class="hline"><td>DIV、DIVW</td><td>100</td></tr><tr class="hline"><td>DIVU、DIVWU</td><td>101</td></tr><tr class="hline"><td>REM、REMW</td><td>110</td></tr><tr class="hline"><td>REMU、REMUW</td><td>111</td></tr></table></div> \`InstCtrl\`構造体に、 M拡張の命令であることを示す\`is_muldiv\`フラグを追加します (リスト2)。 <p><span class="caption">▼リスト9.2: is_muldivフラグを追加する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// 制御に使うフラグ用の構造体</span>
<span class="hljs-keyword">struct</span> InstCtrl {
    itype    : InstType   , <span class="hljs-comment">// 命令の形式</span>
    rwb_en   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// レジスタに書き込むかどうか</span>
    is_lui   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// LUI命令である</span>
    is_aluop : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ALUを利用する命令である</span>
    <span class="custom-hl-bold">is_muldiv: <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// M拡張の命令である</span></span>
    is_op32  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// OP-32またはOP-IMM-32である</span>
    is_jump  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ジャンプ命令である</span>
    is_load  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ロード命令である</span>
    is_csr   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// CSR命令である</span>
    funct3   : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
    funct7   : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">7</span>&gt;, <span class="hljs-comment">// 命令のfunct7フィールド</span>
}
</code></pre></div><p>inst_decoderモジュールの<code>InstCtrl</code>を生成している部分を変更します。 opcodeが<code>OP</code>か<code>OP-32</code>の場合はfunct7の値によって<code>is_muldiv</code>を設定します(リスト3)。 その他のopcodeの<code>is_muldiv</code>は<code>F</code>に設定してください。</p><p><span class="caption">▼リスト9.3: is_muldivを設定する (inst_decoder.veryl) (一部)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_OP: {
    InstType::R, T, F, T, <span class="custom-hl-bold">f7 == <span class="hljs-number">7&#39;b0000001</span>,</span> F, F, F, F
},
OP_OP_IMM: {
    InstType::I, T, F, T, <span class="custom-hl-bold">F,</span> F, F, F, F
},
OP_OP_32: {
    InstType::R, T, F, T, <span class="custom-hl-bold">f7 == <span class="hljs-number">7&#39;b0000001</span>,</span> T, F, F, F
},
</code></pre></div><h2 id="muldivunitモジュールの実装" tabindex="-1">muldivunitモジュールの実装 <a class="header-anchor" href="#muldivunitモジュールの実装" aria-label="Permalink to “muldivunitモジュールの実装”">​</a></h2><h3 id="muldivunitモジュールを作成する" tabindex="-1">muldivunitモジュールを作成する <a class="header-anchor" href="#muldivunitモジュールを作成する" aria-label="Permalink to “muldivunitモジュールを作成する”">​</a></h3><p>M拡張の計算を処理するモジュールを作成し、 M拡張の命令がALUの結果ではなくモジュールの結果を利用するように変更します。</p><p><code>src/muldivunit.veryl</code>を作成し、次のように記述します(リスト4)。</p><p><span class="caption">▼リスト9.4: muldivunit.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> muldivunit (
    clk   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>   ,
    rst   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>   ,
    ready : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,
    valid : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   ,
    funct3: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;,
    op1   : <span class="hljs-keyword">input</span>  UIntX   ,
    op2   : <span class="hljs-keyword">input</span>  UIntX   ,
    rvalid: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,
    result: <span class="hljs-keyword">output</span> UIntX   ,
) {

    <span class="hljs-keyword">enum</span> State {
        Idle,
        WaitValid,
        Finish,
    }

    <span class="hljs-keyword">var</span> state: State;

    <span class="hljs-comment">// saved_data</span>
    <span class="hljs-keyword">var</span> funct3_saved: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;;

    <span class="hljs-keyword">always_comb</span> {
        ready  = state == State::Idle;
        rvalid = state == State::Finish;
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            state        = State::Idle;
            result       = <span class="hljs-number">0</span>;
            funct3_saved = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">case</span> state {
                State::Idle: <span class="hljs-keyword">if</span> ready &amp;&amp; valid {
                    state        = State::WaitValid;
                    funct3_saved = funct3;
                }
                State::WaitValid: state = State::Finish;
                State::Finish   : state = State::Idle;
                <span class="hljs-keyword">default</span>         : {}
            }
        }
    }
}
</code></pre></div><p>muldivunitモジュールは<code>ready</code>が<code>1</code>のときに計算のリクエストを受け付けます。 <code>valid</code>が<code>1</code>なら計算を開始し、 計算が終了したら<code>rvalid</code>を<code>1</code>、計算結果を<code>result</code>に設定します。</p><p>まだ計算処理を実装しておらず、<code>result</code>は常に<code>0</code>を返します。 次の計算を開始するまで<code>result</code>の値を維持します。</p><h3 id="exステージを変更する" tabindex="-1">EXステージを変更する <a class="header-anchor" href="#exステージを変更する" aria-label="Permalink to “EXステージを変更する”">​</a></h3><p>M拡張の命令がEXステージにあるとき、ALUの結果の代わりにmuldivunitモジュールの結果を利用するように変更します。</p><p>まず、muldivunitモジュールをインスタンス化します(リスト5)。</p><p><span class="caption">▼リスト9.5: muldivunitモジュールをインスタンス化する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> exs_muldiv_valid : <span class="hljs-keyword">logic</span> = exs_valid &amp;&amp; exs_ctrl.is_muldiv &amp;&amp; !exs_data_hazard &amp;&amp; !exs_muldiv_is_requested;
<span class="hljs-keyword">var</span> exs_muldiv_ready : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> exs_muldiv_rvalid: <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> exs_muldiv_result: UIntX;

<span class="hljs-keyword">inst</span> mdu: muldivunit (
    clk                      ,
    rst                      ,
    valid : exs_muldiv_valid ,
    ready : exs_muldiv_ready ,
    funct3: exs_ctrl.funct3  ,
    op1   : exs_op1          ,
    op2   : exs_op2          ,
    rvalid: exs_muldiv_rvalid,
    result: exs_muldiv_result,
);
</code></pre></div><p>muldivunitモジュールで計算を開始するのは、 EXステージに命令が存在し(<code>exs_valid</code>)、 命令がM拡張の命令であり(<code>exs_ctrl.is_muldiv</code>)、 データハザードが発生しておらず(<code>!exs_data_hazard</code>)、 既に計算を要求していない(<code>!exs_muldiv_is_requested</code>) 場合です。</p><p><code>exs_muldiv_is_requested</code>変数を定義し、 ステージの遷移条件とmuldivunitに計算を要求したかの状態によって値を更新します(リスト6)。</p><p><span class="caption">▼リスト9.6: exs_muldiv_is_requested変数 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> exs_muldiv_is_requested: <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        exs_muldiv_is_requested = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-comment">// 次のステージに遷移</span>
        <span class="hljs-keyword">if</span> exq_rvalid &amp;&amp; exq_rready {
            exs_muldiv_is_requested = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-comment">// muldivunitにリクエストしたか判定する</span>
            <span class="hljs-keyword">if</span> exs_muldiv_valid &amp;&amp; exs_muldiv_ready {
                exs_muldiv_is_requested = <span class="hljs-number">1</span>;
            }
        }
    }
}
</code></pre></div><p>muldivunitモジュールはALUのように1クロックの間に入力から出力を生成しないため、 計算中はEXステージをストールさせる必要があります。 そのために<code>exs_muldiv_stall</code>変数を定義して、ストールの条件に追加します(リスト7、リスト8)。 また、M拡張の命令の場合はMEMステージに渡す<code>alu_result</code>の値をmuldivunitモジュールの結果に設定します(リスト8)。</p><p><span class="caption">▼リスト9.7: EXステージのストール条件の変更 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> exs_muldiv_rvalided: <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">let</span> exs_muldiv_stall   : <span class="hljs-keyword">logic</span> = exs_ctrl.is_muldiv &amp;&amp; !exs_muldiv_rvalid &amp;&amp; !exs_muldiv_rvalided;

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        exs_muldiv_rvalided = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-comment">// 次のステージに遷移</span>
        <span class="hljs-keyword">if</span> exq_rvalid &amp;&amp; exq_rready {
            exs_muldiv_rvalided = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-comment">// muldivunitの処理が完了していたら1にする</span>
            exs_muldiv_rvalided |= exs_muldiv_rvalid;
        }
    }
}
</code></pre></div><p><span class="caption">▼リスト9.8: EXステージのストール条件の変更とM拡張の命令の結果の設定 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e663d5db396edec939daf72d6c85a300b8de5492~1..e663d5db396edec939daf72d6c85a300b8de5492#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> exs_stall: <span class="hljs-keyword">logic</span> = exs_data_hazard || exs_muldiv_stall;</span>

<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// EX -&gt; MEM</span>
    exq_rready            = memq_wready &amp;&amp; <span class="custom-hl-bold">!exs_stall</span>;
    memq_wvalid           = exq_rvalid &amp;&amp; <span class="custom-hl-bold">!exs_stall</span>;
    memq_wdata.addr       = exq_rdata.addr;
    memq_wdata.bits       = exq_rdata.bits;
    memq_wdata.ctrl       = exq_rdata.ctrl;
    memq_wdata.imm        = exq_rdata.imm;
    memq_wdata.rs1_addr   = exs_rs1_addr;
    memq_wdata.rs1_data   = exs_rs1_data;
    memq_wdata.rs2_data   = exs_rs2_data;
    memq_wdata.alu_result = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> exs_ctrl.is_muldiv ? exs_muldiv_result : exs_alu_result</span>;
    memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) &amp;&amp; exs_brunit_take;
    memq_wdata.jump_addr  = <span class="hljs-keyword">if</span> inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result &amp; ~<span class="hljs-number">1</span>;
}
</code></pre></div><p>muldivunitモジュールは計算が完了したクロックでしか<code>rvalid</code>を<code>1</code>にしないため、 既に計算が完了したことを示す<code>exs_muldiv_rvalided</code>変数で完了状態を管理します。 これにより、M拡張の命令によってストールする条件は、 命令がM拡張の命令であり(<code>exs_ctrl.is_muldiv</code>)、 現在のクロックで計算が完了しておらず(<code>!exs_muldiv_rvalid</code>)、 以前のクロックでも計算が完了していない(<code>!exs_muldiv_rvalided</code>) 場合になります。</p><h2 id="符号無しの乗算器の実装" tabindex="-1">符号無しの乗算器の実装 <a class="header-anchor" href="#符号無しの乗算器の実装" aria-label="Permalink to “符号無しの乗算器の実装”">​</a></h2><h3 id="mulunitモジュールを実装する" tabindex="-1">mulunitモジュールを実装する <a class="header-anchor" href="#mulunitモジュールを実装する" aria-label="Permalink to “mulunitモジュールを実装する”">​</a></h3><p><code>WIDTH</code>ビットの符号無しの値同士の積を計算する乗算器を実装します。</p><p><code>src/muldivunit.veryl</code>の中にmulunitモジュールを作成します(リスト9)。</p><p><span class="caption">▼リスト9.9: muldivunit.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/da3c8e0bdddfbf5b13c75fba753c29ca1162c1b2~1..da3c8e0bdddfbf5b13c75fba753c29ca1162c1b2#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> mulunit #(
    <span class="hljs-keyword">param</span> WIDTH: <span class="hljs-keyword">u32</span> = <span class="hljs-number">0</span>,
) (
    clk   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>           ,
    rst   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>           ,
    valid : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>           ,
    op1   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;    ,
    op2   : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;    ,
    rvalid: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>           ,
    result: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>&lt;WIDTH * <span class="hljs-number">2</span>&gt;,
) {
    <span class="hljs-keyword">enum</span> State {
        Idle,
        AddLoop,
        Finish,
    }

    <span class="hljs-keyword">var</span> state: State;

    <span class="hljs-keyword">var</span> op1zext: <span class="hljs-keyword">logic</span>&lt;WIDTH * <span class="hljs-number">2</span>&gt;;
    <span class="hljs-keyword">var</span> op2zext: <span class="hljs-keyword">logic</span>&lt;WIDTH * <span class="hljs-number">2</span>&gt;;

    <span class="hljs-keyword">always_comb</span> {
        rvalid = state == State::Finish;
    }

    <span class="hljs-keyword">var</span> add_count: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">32</span>&gt;;

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            state     = State::Idle;
            result    = <span class="hljs-number">0</span>;
            add_count = <span class="hljs-number">0</span>;
            op1zext   = <span class="hljs-number">0</span>;
            op2zext   = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">case</span> state {
                State::Idle: <span class="hljs-keyword">if</span> valid {
                    state     = State::AddLoop;
                    result    = <span class="hljs-number">0</span>;
                    add_count = <span class="hljs-number">0</span>;
                    op1zext   = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> WIDTH, op1};
                    op2zext   = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> WIDTH, op2};
                }
                State::AddLoop: <span class="hljs-keyword">if</span> add_count == WIDTH {
                    state = State::Finish;
                } <span class="hljs-keyword">else</span> {
                    <span class="hljs-keyword">if</span> op2zext[add_count] {
                        result += op1zext;
                    }
                    op1zext   &lt;&lt;= <span class="hljs-number">1</span>;
                    add_count +=  <span class="hljs-number">1</span>;
                }
                State::Finish: state = State::Idle;
                <span class="hljs-keyword">default</span>      : {}
            }
        }
    }
}
</code></pre></div><p>mulunitモジュールは<code>op1 * op2</code>を計算するモジュールです。 <code>valid</code>が<code>1</code>になったら計算を開始し、 計算が完了したら<code>rvalid</code>を<code>1</code>、<code>result</code>を<code>WIDTH * 2</code>ビットの計算結果に設定します。</p><p>積は<code>WIDTH</code>回の足し算を<code>WIDTH</code>クロックかけて行って求めています(図1)。 計算を開始すると入力をゼロで<code>WIDTH * 2</code>ビットに拡張し、 <code>result</code>を<code>0</code>でリセットします。</p><p><code>State::AddLoop</code>では、次の操作を<code>WIDTH</code>回行います。 <code>i</code>回目では次の操作を行います。</p><ol><li><code>op2[i-1]</code>が<code>1</code>なら<code>result</code>に<code>op1</code>を足す</li><li><code>op1</code>を1ビット左シフトする</li><li>カウンタをインクリメントする</li></ol><p><img src="`+d+`" alt="符号無し4ビットの乗算"></p><p class="caption" style="text-align:center;font-weight:bold;">▲図1: 符号無し4ビットの乗算</p><h3 id="mulunitモジュールをインスタンス化する" tabindex="-1">mulunitモジュールをインスタンス化する <a class="header-anchor" href="#mulunitモジュールをインスタンス化する" aria-label="Permalink to “mulunitモジュールをインスタンス化する”">​</a></h3><p>mulunitモジュールをmuldivunitモジュールでインスタンス化します (リスト10)。 まだ結果は利用しません。</p><p><span class="caption">▼リスト9.10: mulunitモジュールをインスタンス化する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/da3c8e0bdddfbf5b13c75fba753c29ca1162c1b2~1..da3c8e0bdddfbf5b13c75fba753c29ca1162c1b2#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// multiply unit</span>
<span class="hljs-keyword">const</span> MUL_OP_WIDTH : <span class="hljs-keyword">u32</span> = XLEN;
<span class="hljs-keyword">const</span> MUL_RES_WIDTH: <span class="hljs-keyword">u32</span> = MUL_OP_WIDTH * <span class="hljs-number">2</span>;

<span class="hljs-keyword">let</span> is_mul   : <span class="hljs-keyword">logic</span>                = <span class="hljs-keyword">if</span> state == State::Idle ? !funct3[<span class="hljs-number">2</span>] : !funct3_saved[<span class="hljs-number">2</span>];
<span class="hljs-keyword">var</span> mu_rvalid: <span class="hljs-keyword">logic</span>               ;
<span class="hljs-keyword">var</span> mu_result: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt;;

<span class="hljs-keyword">inst</span> mu: mulunit #(
    WIDTH: MUL_OP_WIDTH,
) (
    clk                             ,
    rst                             ,
    valid : ready &amp;&amp; valid &amp;&amp; is_mul,
    op1   : op1                     ,
    op2   : op2                     ,
    rvalid: mu_rvalid               ,
    result: mu_result               ,
);
</code></pre></div><h2 id="mulhu命令の実装" tabindex="-1">MULHU命令の実装 <a class="header-anchor" href="#mulhu命令の実装" aria-label="Permalink to “MULHU命令の実装”">​</a></h2><p>MULHU命令は、2つの符号無しのXLENビットの値の乗算を実行し、 デスティネーションレジスタに結果(XLEN * 2ビット)の上位XLENビットを書き込む命令です。 funct3の下位2ビットによってmulunitモジュールの結果を選択するようにします (リスト11)。</p><p><span class="caption">▼リスト9.11: MULHUモジュールの結果を取得する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8136d939f386c95070ca2a72a9aacf4d90359fcf~1..8136d939f386c95070ca2a72a9aacf4d90359fcf#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::WaitValid: <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_mul &amp;&amp; mu_rvalid {</span>
    state  = State::Finish;
    <span class="custom-hl-bold">result = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {</span>
    <span class="custom-hl-bold">    <span class="hljs-number">2&#39;b11</span>  : mu_result[XLEN+:XLEN], <span class="hljs-comment">// MULHU</span></span>
    <span class="custom-hl-bold">    <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,</span>
    <span class="custom-hl-bold">};</span>
<span class="custom-hl-bold">}</span>
</code></pre></div><p>riscv-testsの<code>rv64um-p-mulhu</code>を実行し、成功することを確認してください。</p><h2 id="mul、mulh命令の実装" tabindex="-1">MUL、MULH命令の実装 <a class="header-anchor" href="#mul、mulh命令の実装" aria-label="Permalink to “MUL、MULH命令の実装”">​</a></h2><h3 id="符号付き乗算を符号無し乗算器で実現する" tabindex="-1">符号付き乗算を符号無し乗算器で実現する <a class="header-anchor" href="#符号付き乗算を符号無し乗算器で実現する" aria-label="Permalink to “符号付き乗算を符号無し乗算器で実現する”">​</a></h3><p>MUL、MULH命令は、2つの符号付きのXLENビットの値の乗算を実行し、 デスティネーションレジスタにそれぞれ結果の下位XLENビット、上位XLENビットを書き込む命令です。</p><p>本章ではmulunitモジュールを使って、次のように符号付き乗算を実現します。</p><ol><li>符号付きのXLENビットの値を符号無しの値(絶対値)に変換する</li><li>符号無しで積を計算する</li><li>計算結果の符号を修正する</li></ol><p>絶対値で計算することで符号ビットを考慮する必要がなくなり、 既に実装してある符号無しの乗算器を変更せずに符号付きの乗算を実現できます。</p><h3 id="符号付き乗算を実装する" tabindex="-1">符号付き乗算を実装する <a class="header-anchor" href="#符号付き乗算を実装する" aria-label="Permalink to “符号付き乗算を実装する”">​</a></h3><p><code>WIDTH</code>ビットの符号付きの値を<code>WIDTH</code>ビットの符号無しの絶対値に変換するabs関数を作成します (リスト12)。 abs関数は、値のMSBが<code>1</code>ならビットを反転して<code>1</code>を足すことで符号を反転しています。 最小値<code>-2 ** (WIDTH - 1)</code>の絶対値も求められることを確認してください。</p><p><span class="caption">▼リスト9.12: abs関数を実装する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> abs::&lt;WIDTH: <span class="hljs-keyword">u32</span>&gt; (
    value: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;WIDTH&gt; {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">if</span> value[<span class="hljs-keyword">msb</span>] ? ~value + <span class="hljs-number">1</span> : value;
}
</code></pre></div><p>abs関数を利用して、MUL、MULH命令のときにmulunitに渡す値を絶対値に設定します (リスト13、リスト14)。</p><p><span class="caption">▼リスト9.13: op1とop2を生成する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mu_op1: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span>: abs::&lt;XLEN&gt;(op1), <span class="hljs-comment">// MUL, MULH</span>
    <span class="hljs-number">2&#39;b11</span>       : op1, <span class="hljs-comment">// MULHU</span>
    <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
};
<span class="hljs-keyword">let</span> mu_op2: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span>: abs::&lt;XLEN&gt;(op2), <span class="hljs-comment">// MUL, MULH</span>
    <span class="hljs-number">2&#39;b11</span>       : op2, <span class="hljs-comment">// MULHU</span>
    <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
};
</code></pre></div><p><span class="caption">▼リスト9.14: mulunitに渡す値を変更する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> mu: mulunit #(
    WIDTH: MUL_OP_WIDTH,
) (
    clk                             ,
    rst                             ,
    valid : ready &amp;&amp; valid &amp;&amp; is_mul,
    op1   : <span class="custom-hl-bold">mu_op1</span>                  ,
    op2   : <span class="custom-hl-bold">mu_op2</span>                  ,
    rvalid: mu_rvalid               ,
    result: mu_result               ,
);
</code></pre></div><p>計算結果の符号は<code>op1</code>と<code>op2</code>の符号が異なる場合に負になります。 後で符号の情報を利用するために、muldivunitモジュールが要求を受け入れる時に符号を保存します ( リスト15、 リスト16、 リスト17 )。</p><p><span class="caption">▼リスト9.15: 符号を保存する変数を作成する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// saved_data</span>
<span class="hljs-keyword">var</span> funct3_saved : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> op1sign_saved: <span class="hljs-keyword">logic</span>   ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> op2sign_saved: <span class="hljs-keyword">logic</span>   ;</span>
</code></pre></div><p><span class="caption">▼リスト9.16: 変数のリセット (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        state         = State::Idle;
        result        = <span class="hljs-number">0</span>;
        funct3_saved  = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">op1sign_saved = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">op2sign_saved = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
</code></pre></div><p><span class="caption">▼リスト9.17: 符号を変数に保存する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> state {
    State::Idle: <span class="hljs-keyword">if</span> ready &amp;&amp; valid {
        state         = State::WaitValid;
        funct3_saved  = funct3;
        <span class="custom-hl-bold">op1sign_saved = op1[<span class="hljs-keyword">msb</span>];</span>
        <span class="custom-hl-bold">op2sign_saved = op2[<span class="hljs-keyword">msb</span>];</span>
    }
</code></pre></div><p>保存した符号を利用して計算結果の符号を復元します (リスト18)。</p><p><span class="caption">▼リスト9.18: 計算結果の符号を復元する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b~1..0cd4d0ee38e51c08b40c529f61e615f4f0de3f3b#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::WaitValid: <span class="hljs-keyword">if</span> is_mul &amp;&amp; mu_rvalid {
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> res_signed: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved != op2sign_saved ? ~mu_result + <span class="hljs-number">1</span> : mu_result;</span>
    state      = State::Finish;
    result     = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="custom-hl-bold"><span class="hljs-number">2&#39;b00</span>  : res_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// MUL</span></span>
        <span class="custom-hl-bold"><span class="hljs-number">2&#39;b01</span>  : res_signed[XLEN+:XLEN], <span class="hljs-comment">// MULH</span></span>
        <span class="hljs-number">2&#39;b11</span>  : mu_result[XLEN+:XLEN], <span class="hljs-comment">// MULHU</span>
        <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
    };
}
</code></pre></div><p>riscv-testsの<code>rv64um-p-mul</code>と<code>rv64um-p-mulh</code>を実行し、成功することを確認してください。</p><h3 id="mulhsu命令の実装" tabindex="-1">MULHSU命令の実装 <a class="header-anchor" href="#mulhsu命令の実装" aria-label="Permalink to “MULHSU命令の実装”">​</a></h3><p>MULHSU命令は、符号付きのXLENビットのrs1と符号無しのXLENビットのrs2の乗算を実行し、 デスティネーションレジスタに結果の上位XLENビットを書き込む命令です。 計算結果は符号付きの値になります。</p><p>MULHSU命令も、MUL、MULH命令と同様に符号無しの乗算器で実現します。</p><p><code>op1</code>を絶対値に変換し、<code>op2</code>はそのままに設定します (リスト19)。</p><p><span class="caption">▼リスト9.19: MULHSU命令用にop1、op2を設定する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e183034366293bc6ce37924efb9ddbf26a3d6984~1..e183034366293bc6ce37924efb9ddbf26a3d6984#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mu_op1: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span><span class="custom-hl-bold">, <span class="hljs-number">2&#39;b10</span></span>: abs::&lt;XLEN&gt;(op1), <span class="hljs-comment">// MUL, MULH<span class="custom-hl-bold">, MULHSU</span></span>
    <span class="hljs-number">2&#39;b11</span>              : op1, <span class="hljs-comment">// MULHU</span>
    <span class="hljs-keyword">default</span>            : <span class="hljs-number">0</span>,
};
<span class="hljs-keyword">let</span> mu_op2: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span>: abs::&lt;XLEN&gt;(op2), <span class="hljs-comment">// MUL, MULH</span>
    <span class="hljs-number">2&#39;b11</span><span class="custom-hl-bold">, <span class="hljs-number">2&#39;b10</span></span>: op2, <span class="hljs-comment">// MULHU<span class="custom-hl-bold">, MULHSU</span></span>
    <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
};
</code></pre></div><p>計算結果は<code>op1</code>の符号にします (リスト20)。</p><p><span class="caption">▼リスト9.20: 計算結果の符号を復元する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/e183034366293bc6ce37924efb9ddbf26a3d6984~1..e183034366293bc6ce37924efb9ddbf26a3d6984#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::WaitValid: <span class="hljs-keyword">if</span> is_mul &amp;&amp; mu_rvalid {
    <span class="hljs-keyword">let</span> res_signed: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved != op2sign_saved ? ~mu_result + <span class="hljs-number">1</span> : mu_result;
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> res_mulhsu: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved == <span class="hljs-number">1</span> ? ~mu_result + <span class="hljs-number">1</span> : mu_result;</span>
    state      = State::Finish;
    result     = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b00</span>  : res_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// MUL</span>
        <span class="hljs-number">2&#39;b01</span>  : res_signed[XLEN+:XLEN], <span class="hljs-comment">// MULH</span>
        <span class="custom-hl-bold"><span class="hljs-number">2&#39;b10</span>  : res_mulhsu[XLEN+:XLEN], <span class="hljs-comment">// MULHSU</span></span>
        <span class="hljs-number">2&#39;b11</span>  : mu_result[XLEN+:XLEN], <span class="hljs-comment">// MULHU</span>
        <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
    };
}
</code></pre></div><p>riscv-testsの<code>rv64um-p-mulhsu</code>を実行し、成功することを確認してください。</p><h3 id="mulw命令の実装" tabindex="-1">MULW命令の実装 <a class="header-anchor" href="#mulw命令の実装" aria-label="Permalink to “MULW命令の実装”">​</a></h3><p>MULW命令は、2つの符号付きの32ビットの値の乗算を実行し、 デスティネーションレジスタに結果の下位32ビットを符号拡張した値を書き込む命令です。</p><p>32ビット演算の命令であることを判定するために、 muldivunitモジュールに<code>is_op32</code>ポートを作成します ( リスト21、 リスト22 )。</p><p><span class="caption">▼リスト9.21: is_op32ポートを追加する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> muldivunit (
    clk    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>   ,
    rst    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>   ,
    ready  : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,
    valid  : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   ,
    funct3 : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;,
    <span class="custom-hl-bold">is_op32: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   ,</span>
    op1    : <span class="hljs-keyword">input</span>  UIntX   ,
    op2    : <span class="hljs-keyword">input</span>  UIntX   ,
    rvalid : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,
    result : <span class="hljs-keyword">output</span> UIntX   ,
) {
</code></pre></div><p><span class="caption">▼リスト9.22: is_op32ポートに値を割り当てる (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> mdu: muldivunit (
    clk                       ,
    rst                       ,
    valid  : exs_muldiv_valid ,
    ready  : exs_muldiv_ready ,
    funct3 : exs_ctrl.funct3  ,
    <span class="custom-hl-bold">is_op32: exs_ctrl.is_op32 ,</span>
    op1    : exs_op1          ,
    op2    : exs_op2          ,
    rvalid : exs_muldiv_rvalid,
    result : exs_muldiv_result,
);
</code></pre></div><p>muldivunitモジュールが要求を受け入れる時に<code>is_op32</code>を保存します ( リスト23、 リスト24、 リスト25 )。</p><p><span class="caption">▼リスト9.23: is_op32を保存する変数を作成する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// saved_data</span>
<span class="hljs-keyword">var</span> funct3_saved : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> is_op32_saved: <span class="hljs-keyword">logic</span>   ;</span>
<span class="hljs-keyword">var</span> op1sign_saved: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> op2sign_saved: <span class="hljs-keyword">logic</span>   ;
</code></pre></div><p><span class="caption">▼リスト9.24: 変数のリセット (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        state         = State::Idle;
        result        = <span class="hljs-number">0</span>;
        funct3_saved  = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">is_op32_saved = <span class="hljs-number">0</span>;</span>
        op1sign_saved = <span class="hljs-number">0</span>;
        op2sign_saved = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
</code></pre></div><p><span class="caption">▼リスト9.25: is_op32を変数に保存する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::Idle: <span class="hljs-keyword">if</span> ready &amp;&amp; valid {
    state         = State::WaitValid;
    funct3_saved  = funct3;
    <span class="custom-hl-bold">is_op32_saved = is_op32;</span>
    op1sign_saved = op1[<span class="hljs-keyword">msb</span>];
    op2sign_saved = op2[<span class="hljs-keyword">msb</span>];
}
</code></pre></div><p>mulunitモジュールの<code>op1</code>と<code>op2</code>に、64ビットの値の下位32ビットを符号拡張した値を割り当てます。 符号拡張を行うsext関数を作成し、<code>mu_op1</code>、<code>mu_op2</code>の割り当てに利用します ( リスト26、 リスト27 )。</p><p><span class="caption">▼リスト9.26: 符号拡張する関数を作成する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> sext::&lt;WIDTH_IN: <span class="hljs-keyword">u32</span>, WIDTH_OUT: <span class="hljs-keyword">u32</span>&gt; (
    value: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;WIDTH_IN&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;WIDTH_OUT&gt; {
    <span class="hljs-keyword">return</span> {value[<span class="hljs-keyword">msb</span>] <span class="hljs-keyword">repeat</span> WIDTH_OUT - WIDTH_IN, value};
}
</code></pre></div><p><span class="caption">▼リスト9.27: MULW命令用にop1、op2を設定する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> mu_op1: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span>, <span class="hljs-number">2&#39;b10</span>: abs::&lt;XLEN&gt;(<span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32 ? sext::&lt;<span class="hljs-number">32</span>, XLEN&gt;(op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) : </span>op1), <span class="hljs-comment">// MUL, MULH, MULHSU<span class="custom-hl-bold">, MULW</span></span>
    <span class="hljs-number">2&#39;b11</span>              : op1, <span class="hljs-comment">// MULHU</span>
    <span class="hljs-keyword">default</span>            : <span class="hljs-number">0</span>,
};
<span class="hljs-keyword">let</span> mu_op2: <span class="hljs-keyword">logic</span>&lt;MUL_OP_WIDTH&gt; = <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b01</span>: abs::&lt;XLEN&gt;(<span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32 ? sext::&lt;<span class="hljs-number">32</span>, XLEN&gt;(op2[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) : </span>op2), <span class="hljs-comment">// MUL, MULH<span class="custom-hl-bold">, MULW</span></span>
    <span class="hljs-number">2&#39;b11</span>, <span class="hljs-number">2&#39;b10</span>: op2, <span class="hljs-comment">// MULHU, MULHSU</span>
    <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
};
</code></pre></div><p>最後に、計算結果を符号拡張した値に設定します (リスト28)。</p><p><span class="caption">▼リスト9.28: 計算結果を符号拡張する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/018a2c2f755e28b3f4e340a9afeaa1560c4b387d~1..018a2c2f755e28b3f4e340a9afeaa1560c4b387d#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::WaitValid: <span class="hljs-keyword">if</span> is_mul &amp;&amp; mu_rvalid {
    <span class="hljs-keyword">let</span> res_signed: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved != op2sign_saved ? ~mu_result + <span class="hljs-number">1</span> : mu_result;
    <span class="hljs-keyword">let</span> res_mulhsu: <span class="hljs-keyword">logic</span>&lt;MUL_RES_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved == <span class="hljs-number">1</span> ? ~mu_result + <span class="hljs-number">1</span> : mu_result;
    state      = State::Finish;
    result     = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b00</span>  : <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32_saved ? sext::&lt;<span class="hljs-number">32</span>, <span class="hljs-number">64</span>&gt;(res_signed[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) :</span> res_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// MUL<span class="custom-hl-bold">, MULW</span></span>
        <span class="hljs-number">2&#39;b01</span>  : res_signed[XLEN+:XLEN], <span class="hljs-comment">// MULH</span>
</code></pre></div><p>riscv-testsの<code>rv64um-p-mulw</code>を実行し、成功することを確認してください。</p><h2 id="符号無し除算の実装" tabindex="-1">符号無し除算の実装 <a class="header-anchor" href="#符号無し除算の実装" aria-label="Permalink to “符号無し除算の実装”">​</a></h2><h3 id="divunitモジュールを実装する" tabindex="-1">divunitモジュールを実装する <a class="header-anchor" href="#divunitモジュールを実装する" aria-label="Permalink to “divunitモジュールを実装する”">​</a></h3><p><code>WIDTH</code>ビットの除算を計算する除算器を実装します。</p><p><code>src/muldivunit.veryl</code>の中にdivunitモジュールを作成します (リスト29)。</p><p><span class="caption">▼リスト9.29: muldivunit.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6~1..ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> divunit #(
    <span class="hljs-keyword">param</span> WIDTH: <span class="hljs-keyword">u32</span> = <span class="hljs-number">0</span>,
) (
    clk      : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>       ,
    rst      : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>       ,
    valid    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>       ,
    dividend : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;,
    divisor  : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;,
    rvalid   : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>       ,
    quotient : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;,
    remainder: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;,
) {
    <span class="hljs-keyword">enum</span> State {
        Idle,
        ZeroCheck,
        SubLoop,
        Finish,
    }

    <span class="hljs-keyword">var</span> state: State;

    <span class="hljs-keyword">var</span> dividend_saved: <span class="hljs-keyword">logic</span>&lt;WIDTH * <span class="hljs-number">2</span>&gt;;
    <span class="hljs-keyword">var</span> divisor_saved : <span class="hljs-keyword">logic</span>&lt;WIDTH * <span class="hljs-number">2</span>&gt;;

    <span class="hljs-keyword">always_comb</span> {
        rvalid    = state == State::Finish;
        remainder = dividend_saved[WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>];
    }

    <span class="hljs-keyword">var</span> sub_count: <span class="hljs-keyword">u32</span>;

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            state          = State::Idle;
            quotient       = <span class="hljs-number">0</span>;
            sub_count      = <span class="hljs-number">0</span>;
            dividend_saved = <span class="hljs-number">0</span>;
            divisor_saved  = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">case</span> state {
                State::Idle: <span class="hljs-keyword">if</span> valid {
                    state          = State::ZeroCheck;
                    dividend_saved = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> WIDTH, dividend};
                    divisor_saved  = {<span class="hljs-number">1&#39;b0</span>, divisor, <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> WIDTH - <span class="hljs-number">1</span>};
                    quotient       = <span class="hljs-number">0</span>;
                    sub_count      = <span class="hljs-number">0</span>;
                }
                State::ZeroCheck: <span class="hljs-keyword">if</span> divisor_saved == <span class="hljs-number">0</span> {
                    state    = State::Finish;
                    quotient = &#39;<span class="hljs-number">1</span>;
                } <span class="hljs-keyword">else</span> {
                    state = State::SubLoop;
                }
                State::SubLoop: <span class="hljs-keyword">if</span> sub_count == WIDTH {
                    state = State::Finish;
                } <span class="hljs-keyword">else</span> {
                    <span class="hljs-keyword">if</span> dividend_saved &gt;= divisor_saved {
                        dividend_saved -= divisor_saved;
                        quotient       =  (quotient &lt;&lt; <span class="hljs-number">1</span>) + <span class="hljs-number">1</span>;
                    } <span class="hljs-keyword">else</span> {
                        quotient &lt;&lt;= <span class="hljs-number">1</span>;
                    }
                    divisor_saved &gt;&gt;= <span class="hljs-number">1</span>;
                    sub_count     +=  <span class="hljs-number">1</span>;
                }
                State::Finish: state = State::Idle;
                <span class="hljs-keyword">default</span>      : {}
            }
        }
    }
}
</code></pre></div><p>divunitモジュールは被除数(<code>dividend</code>)と除数(<code>divisor</code>)の 商(<code>quotient</code>)と剰余(<code>remainder</code>)を計算するモジュールです。 <code>valid</code>が<code>1</code>になったら計算を開始し、 計算が完了したら<code>rvalid</code>を<code>1</code>に設定します。</p><p>商と剰余は<code>WIDTH</code>回の引き算を<code>WIDTH</code>クロックかけて行って求めています。 計算を開始すると被除数を<code>0</code>で<code>WIDTH * 2</code>ビットに拡張し、 除数を<code>WIDTH-1</code>ビット左シフトします。 また、商を<code>0</code>でリセットします。</p><p><code>State::SubLoop</code>では、次の操作を<code>WIDTH</code>回行います。</p><ol><li>被除数が除数よりも大きいなら、被除数から除数を引き、商のLSBを1にする</li><li>商を1ビット左シフトする</li><li>除数を1ビット右シフトする</li><li>カウンタをインクリメントする</li></ol><p>RISC-Vでは、除数が<code>0</code>だったり結果がオーバーフローするようなLビットの除算の結果は表4のようになると定められています。 このうちdivunitモジュールは符号無しの除算(DIVU、REMU命令)のゼロ除算だけを対処しています。</p><div id="riscv.div.expt" class="table"><p class="caption">表9.4: 除算の例外的な動作と結果</p><table><tr class="hline"><th>操作</th><th>ゼロ除算</th><th>オーバーフロー</th></tr><tr class="hline"><td>符号付き除算</td><td>-1</td><td>-2**(L-1)</td></tr><tr class="hline"><td>符号付き剰余</td><td>被除数</td><td>0</td></tr><tr class="hline"><td>符号無し除算</td><td>2**L-1</td><td>発生しない</td></tr><tr class="hline"><td>符号無し剰余</td><td>被除数</td><td>発生しない</td></tr></table></div><h3 id="divunitモジュールをインスタンス化する" tabindex="-1">divunitモジュールをインスタンス化する <a class="header-anchor" href="#divunitモジュールをインスタンス化する" aria-label="Permalink to “divunitモジュールをインスタンス化する”">​</a></h3><p>divunitモジュールをmuldivunitモジュールでインスタンス化します (リスト30)。 まだ結果は利用しません。</p><p><span class="caption">▼リスト9.30: divunitモジュールをインスタンス化する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6~1..ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// divider unit</span>
<span class="hljs-keyword">const</span> DIV_WIDTH: <span class="hljs-keyword">u32</span> = XLEN;

<span class="hljs-keyword">var</span> du_rvalid   : <span class="hljs-keyword">logic</span>           ;
<span class="hljs-keyword">var</span> du_quotient : <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt;;
<span class="hljs-keyword">var</span> du_remainder: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt;;

<span class="hljs-keyword">inst</span> du: divunit #(
    WIDTH: DIV_WIDTH,
) (
    clk                                 ,
    rst                                 ,
    valid    : ready &amp;&amp; valid &amp;&amp; !is_mul,
    dividend : op1                      ,
    divisor  : op2                      ,
    rvalid   : du_rvalid                ,
    quotient : du_quotient              ,
    remainder: du_remainder             ,
);
</code></pre></div><h2 id="divu、remu命令の実装" tabindex="-1">DIVU、REMU命令の実装 <a class="header-anchor" href="#divu、remu命令の実装" aria-label="Permalink to “DIVU、REMU命令の実装”">​</a></h2><p>DIVU、REMU命令は、符号無しのXLENビットのrs1(被除数)と符号無しのXLENビットのrs2(除数)の商、剰余を計算し、 デスティネーションレジスタにそれぞれ結果を書き込む命令です。</p><p>muldivunitモジュールで、divunitモジュールの処理が終わったら結果を<code>result</code>レジスタに割り当てるようにします (リスト31)。</p><p><span class="caption">▼リスト9.31: divunitモジュールの結果をresultに割り当てる (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6~1..ba05b3a058e8f5f801bb22af6f6e5be4f22aa8b6#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p>`,147),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[a("State::WaitValid: "),s("span",{class:"hljs-keyword"},"if"),a(` is_mul && mu_rvalid {
    `),s("span",{class:"hljs-keyword"},"let"),a(" res_signed: "),s("span",{class:"hljs-keyword"},"logic"),a("<MUL_RES_WIDTH> = "),s("span",{class:"hljs-keyword"},"if"),a(" op1sign_saved != op2sign_saved ? ~mu_result + "),s("span",{class:"hljs-number"},"1"),a(` : mu_result;
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("    "),s("span",{class:"hljs-keyword"},"let"),a(" res_mulhsu: "),s("span",{class:"hljs-keyword"},"logic"),a("<MUL_RES_WIDTH> = "),s("span",{class:"hljs-keyword"},"if"),a(" op1sign_saved == "),s("span",{class:"hljs-number"},"1"),a(" ? ~mu_result + "),s("span",{class:"hljs-number"},"1"),a(` : mu_result;
    state      = State::Finish;
    result     = `),s("span",{class:"hljs-keyword"},"case"),a(" funct3_saved["),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a(`] {
        `),s("span",{class:"hljs-number"},"2'b00"),a("  : "),s("span",{class:"hljs-keyword"},"if"),a(" is_op32_saved ? sext::<"),s("span",{class:"hljs-number"},"32"),a(", "),s("span",{class:"hljs-number"},"64"),a(">(res_signed["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"0"),a("]) : res_signed[XLEN - "),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a("], "),s("span",{class:"hljs-comment"},"// MUL, MULW"),a(`
        `),s("span",{class:"hljs-number"},"2'b01"),a("  : res_signed[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULH"),a(`
`)])]),a("        "),s("span",{class:"hljs-number"},"2'b10"),a("  : res_mulhsu[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULHSU"),a(`
        `),s("span",{class:"hljs-number"},"2'b11"),a("  : mu_result[XLEN+:XLEN], "),s("span",{class:"hljs-comment"},"// MULHU"),a(`
        `),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(`,
    };
`),s("span",{class:"custom-hl-bold"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(),s("span",{class:"hljs-keyword"},"if"),a(" !is_mul && du_rvalid {")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("result = "),s("span",{class:"hljs-keyword"},"case"),a(" funct3_saved["),s("span",{class:"hljs-number"},"1"),a(":"),s("span",{class:"hljs-number"},"0"),a("] {")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-number"},"2'b01"),a("  : du_quotient, "),s("span",{class:"hljs-comment"},"// DIVU")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-number"},"2'b11"),a("  : du_remainder, "),s("span",{class:"hljs-comment"},"// REMU")]),a(`
    `),s("span",{class:"custom-hl-bold"},[a("    "),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(",")]),a(`
    `),s("span",{class:"custom-hl-bold"},"};"),a(`
    `),s("span",{class:"custom-hl-bold"},"state = State::Finish;"),a(`
}
`)])])],-1),l(`<p>riscv-testsの<code>rv64um-p-divu</code>、<code>rv64um-p-remu</code>を実行し、成功することを確認してください。</p><h2 id="div、rem命令の実装" tabindex="-1">DIV、REM命令の実装 <a class="header-anchor" href="#div、rem命令の実装" aria-label="Permalink to “DIV、REM命令の実装”">​</a></h2><h3 id="符号付き除算を符号無し除算器で実現する" tabindex="-1">符号付き除算を符号無し除算器で実現する <a class="header-anchor" href="#符号付き除算を符号無し除算器で実現する" aria-label="Permalink to “符号付き除算を符号無し除算器で実現する”">​</a></h3><p>DIV、REM命令は、それぞれDIVU、REMU命令の動作を符号付きに変えた命令です。 本章では、符号付き乗算と同じように値を絶対値に変換して計算することで符号付き除算を実現します。</p><p>RISC-Vの符号付き除算の結果は0の方向に丸められた整数になり、剰余演算の結果は被除数と同じ符号になります。 符号付き剰余の絶対値は符号無し剰余の結果と一致するため、 絶対値で計算してから符号を戻すことで、符号無し除算器だけで符号付きの剰余演算を実現できます。</p><h3 id="符号付き除算を実装する" tabindex="-1">符号付き除算を実装する <a class="header-anchor" href="#符号付き除算を実装する" aria-label="Permalink to “符号付き除算を実装する”">​</a></h3><p>abs関数を利用して、DIV、REM命令のときにdivunitモジュールに渡す値を絶対値に設定します ( リスト32 リスト33 )。</p><p><span class="caption">▼リスト9.32: 除数と被除数を生成する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/49f71b9c971de4470f3710991c9d4bce10e840cd~1..49f71b9c971de4470f3710991c9d4bce10e840cd#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> generate_div_op (
    funct3: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;   ,
    value : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;XLEN&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b10</span>: abs::&lt;DIV_WIDTH&gt;(value), <span class="hljs-comment">// DIV, REM</span>
        <span class="hljs-number">2&#39;b01</span>, <span class="hljs-number">2&#39;b11</span>: value, <span class="hljs-comment">// DIVU, REMU</span>
        <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
    };
}

<span class="hljs-keyword">let</span> du_dividend: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = generate_div_op(funct3, op1);
<span class="hljs-keyword">let</span> du_divisor : <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = generate_div_op(funct3, op2);
</code></pre></div><p><span class="caption">▼リスト9.33: divunitに渡す値を変更する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/49f71b9c971de4470f3710991c9d4bce10e840cd~1..49f71b9c971de4470f3710991c9d4bce10e840cd#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> du: divunit #(
    WIDTH: DIV_WIDTH,
) (
    clk                                                     ,
    rst                                                     ,
    valid    : ready &amp;&amp; valid &amp;&amp; !is_mul <span class="custom-hl-bold">&amp;&amp; !du_signed_error</span>,
    dividend : <span class="custom-hl-bold">du_dividend</span>                                  ,
    divisor  : <span class="custom-hl-bold">du_divisor</span>                                   ,
    rvalid   : du_rvalid                                    ,
    quotient : du_quotient                                  ,
    remainder: du_remainder                                 ,
);
</code></pre></div><p>表4にあるように、符号付き演算は結果がオーバーフローする場合とゼロで割る場合の結果が定められています。 その場合には、divunitモジュールで除算を実行せず、muldivunitで計算結果を直接生成するようにします ( リスト34 リスト35 )。 符号付き演算かどうかを<code>funct3</code>のLSBで確認し、例外的な処理ではない場合にのみdivunitモジュールで計算を開始するようにします。</p><p><span class="caption">▼リスト9.34: 符号付き除算がオーバーフローするか、ゼロ除算かどうかを判定する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/49f71b9c971de4470f3710991c9d4bce10e840cd~1..49f71b9c971de4470f3710991c9d4bce10e840cd#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> du_signed_overflow: <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> du_signed_divzero : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> du_signed_error   : <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">always_comb</span> {
    du_signed_overflow = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op1[<span class="hljs-keyword">msb</span>] == <span class="hljs-number">1</span> &amp;&amp; op1[<span class="hljs-keyword">msb</span> - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; &amp;op2;
    du_signed_divzero  = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op2 == <span class="hljs-number">0</span>;
    du_signed_error    = du_signed_overflow || du_signed_divzero;
}
</code></pre></div><p><span class="caption">▼リスト9.35: 符号付き除算の例外的な結果を処理する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/49f71b9c971de4470f3710991c9d4bce10e840cd~1..49f71b9c971de4470f3710991c9d4bce10e840cd#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::Idle: <span class="hljs-keyword">if</span> ready &amp;&amp; valid {
    funct3_saved  = funct3;
    is_op32_saved = is_op32;
    op1sign_saved = op1[<span class="hljs-keyword">msb</span>];
    op2sign_saved = op2[<span class="hljs-keyword">msb</span>];
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_mul {</span>
        state = State::WaitValid;
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
    <span class="custom-hl-bold">    <span class="hljs-keyword">if</span> du_signed_overflow {</span>
    <span class="custom-hl-bold">        state  = State::Finish;</span>
    <span class="custom-hl-bold">        result = <span class="hljs-keyword">if</span> funct3[<span class="hljs-number">1</span>] ? <span class="hljs-number">0</span> : {<span class="hljs-number">1&#39;b1</span>, <span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">1</span>}; <span class="hljs-comment">// REM : DIV</span></span>
    <span class="custom-hl-bold">    } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> du_signed_divzero {</span>
    <span class="custom-hl-bold">        state  = State::Finish;</span>
    <span class="custom-hl-bold">        result = <span class="hljs-keyword">if</span> funct3[<span class="hljs-number">1</span>] ? op1 : &#39;<span class="hljs-number">1</span>; <span class="hljs-comment">// REM : DIV</span></span>
    <span class="custom-hl-bold">    } <span class="hljs-keyword">else</span> {</span>
    <span class="custom-hl-bold">        state = State::WaitValid;</span>
    <span class="custom-hl-bold">    }</span>
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><p>計算が終了したら、商と剰余の符号を復元します。 商の符号は除数と被除数の符号が異なる場合に負になります。 剰余の符号は被除数の符号にします (リスト36)。</p><p><span class="caption">▼リスト9.36: 計算結果の符号を復元する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/49f71b9c971de4470f3710991c9d4bce10e840cd~1..49f71b9c971de4470f3710991c9d4bce10e840cd#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> !is_mul &amp;&amp; du_rvalid {
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> quo_signed: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved != op2sign_saved ? ~du_quotient + <span class="hljs-number">1</span> : du_quotient;</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> rem_signed: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved == <span class="hljs-number">1</span> ? ~du_remainder + <span class="hljs-number">1</span> : du_remainder;</span>
    result     = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="custom-hl-bold"><span class="hljs-number">2&#39;b00</span>  : quo_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// DIV</span></span>
        <span class="hljs-number">2&#39;b01</span>  : du_quotient[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// DIVU</span>
        <span class="custom-hl-bold"><span class="hljs-number">2&#39;b10</span>  : rem_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// REM</span></span>
        <span class="hljs-number">2&#39;b11</span>  : du_remainder[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// REMU</span>
        <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
    };
    state = State::Finish;
}
</code></pre></div><p>riscv-testsの<code>rv64um-p-div</code>、<code>rv64um-p-rem</code>を実行し、成功することを確認してください。</p><h2 id="divw、divuw、remw、remuw命令の実装" tabindex="-1">DIVW、DIVUW、REMW、REMUW命令の実装 <a class="header-anchor" href="#divw、divuw、remw、remuw命令の実装" aria-label="Permalink to “DIVW、DIVUW、REMW、REMUW命令の実装”">​</a></h2><p>DIVW、DIVUW、REMW、REMUW命令は、それぞれDIV、DIVU、REM、REMU命令の動作を32ビット同士の演算に変えた命令です。 32ビットの結果をXLENビットに符号拡張した値をデスティネーションレジスタに書き込みます。</p><p>generate_div_op関数に<code>is_op32</code>フラグを追加して、 <code>is_op32</code>が<code>1</code>なら値を<code>DIV_WIDTH</code>ビットに拡張したものに変更します (リスト37)。</p><p><span class="caption">▼リスト9.37: 除数、被除数を32ビットの値にする (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/6092d89c04d70f5fb1628205db26d0de3140adb3~1..6092d89c04d70f5fb1628205db26d0de3140adb3#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> generate_div_op (
    <span class="custom-hl-bold">is_op32: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>      ,</span>
    funct3 : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;   ,
    value  : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;XLEN&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; {
    <span class="hljs-keyword">return</span> <span class="hljs-keyword">case</span> funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b00</span>, <span class="hljs-number">2&#39;b10</span>: abs::&lt;DIV_WIDTH&gt;(<span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32 ? sext::&lt;<span class="hljs-number">32</span>, DIV_WIDTH&gt;(value[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) :</span> value), <span class="hljs-comment">// DIV, REM</span>
        <span class="hljs-number">2&#39;b01</span>, <span class="hljs-number">2&#39;b11</span>: <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32 ? {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> DIV_WIDTH - <span class="hljs-number">32</span>, value[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]} :</span> value, <span class="hljs-comment">// DIVU, REMU</span>
        <span class="hljs-keyword">default</span>     : <span class="hljs-number">0</span>,
    };
}

<span class="hljs-keyword">let</span> du_dividend: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = generate_div_op(<span class="custom-hl-bold">is_op32,</span> funct3, op1);
<span class="hljs-keyword">let</span> du_divisor : <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = generate_div_op(<span class="custom-hl-bold">is_op32,</span> funct3, op2);
</code></pre></div><p>符号付き除算のオーバーフローとゼロ除算の判定を<code>is_op32</code>で変更します (リスト38)。</p><p><span class="caption">▼リスト9.38: 32ビット演算のときの例外的な処理に対応する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/6092d89c04d70f5fb1628205db26d0de3140adb3~1..6092d89c04d70f5fb1628205db26d0de3140adb3#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> is_op32 {</span>
    <span class="custom-hl-bold">    du_signed_overflow = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op1[<span class="hljs-number">31</span>] == <span class="hljs-number">1</span> &amp;&amp; op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; &amp;op2[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>];</span>
    <span class="custom-hl-bold">    du_signed_divzero  = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op2[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
        du_signed_overflow = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op1[<span class="hljs-keyword">msb</span>] == <span class="hljs-number">1</span> &amp;&amp; op1[<span class="hljs-keyword">msb</span> - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>] == <span class="hljs-number">0</span> &amp;&amp; &amp;op2;
        du_signed_divzero  = !funct3[<span class="hljs-number">0</span>] &amp;&amp; op2 == <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">}</span>
    du_signed_error = du_signed_overflow || du_signed_divzero;
}
</code></pre></div><p>最後に、32ビットの結果をXLENビットに符号拡張します (リスト39)。 符号付き、符号無し演算のどちらも32ビットの結果を符号拡張したものが結果になります。</p><p><span class="caption">▼リスト9.39: 32ビット演算のとき、結果を符号拡張する (muldivunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/6092d89c04d70f5fb1628205db26d0de3140adb3~1..6092d89c04d70f5fb1628205db26d0de3140adb3#diff-a0b1c500872f0d9547a64ef2feee3ca7e167d9aa98f02cb06578c0f51eea47b0">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>} <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> !is_mul &amp;&amp; du_rvalid {
    <span class="hljs-keyword">let</span> quo_signed: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved != op2sign_saved ? ~du_quotient + <span class="hljs-number">1</span> : du_quotient;
    <span class="hljs-keyword">let</span> rem_signed: <span class="hljs-keyword">logic</span>&lt;DIV_WIDTH&gt; = <span class="hljs-keyword">if</span> op1sign_saved == <span class="hljs-number">1</span> ? ~du_remainder + <span class="hljs-number">1</span> : du_remainder;
    <span class="custom-hl-bold"><span class="hljs-keyword">let</span> resultX   : UIntX</span>            = <span class="hljs-keyword">case</span> funct3_saved[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">2&#39;b00</span>  : quo_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// DIV</span>
        <span class="hljs-number">2&#39;b01</span>  : du_quotient[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// DIVU</span>
        <span class="hljs-number">2&#39;b10</span>  : rem_signed[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// REM</span>
        <span class="hljs-number">2&#39;b11</span>  : du_remainder[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-comment">// REMU</span>
        <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
    };
    state  = State::Finish;
    <span class="custom-hl-bold">result = <span class="hljs-keyword">if</span> is_op32_saved ? sext::&lt;<span class="hljs-number">32</span>, <span class="hljs-number">64</span>&gt;(resultX[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) : resultX;</span>
}
</code></pre></div><p>riscv-testsの<code>rv64um-p-</code>から始まるテストを実行し、成功することを確認してください。</p><p>これでM拡張を実装できました。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>手動で何をどのように利用するかを選択することもできます。既に用意された回路(IP)を使うこともできますが、本書は自作することを主軸としているため利用しません。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>そもそも除算器が搭載されていない場合があります。 <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>「効率」は、計算に要する時間やスループット、回路面積のことです。効率的に計算する方法については応用編で検討します。 <a href="#fnref3" class="footnote-backref">↩︎</a></p></li></ol></section>`,35)])])}const j=e(o,[["render",t]]);export{f as __pageData,j as default};
