import{_ as s,c as n,o as e,ah as l,bD as c,bE as p,bF as d}from"./chunks/framework.BNheOMQd.js";const u=JSON.parse('{"title":"A拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"13-impl-a.md","filePath":"13-impl-a.md"}'),t={name:"13-impl-a.md"};function o(r,a,b,f,m,i){return e(),n("div",null,[...a[0]||(a[0]=[l('<h1 id="a拡張の実装" tabindex="-1">A拡張の実装 <a class="header-anchor" href="#a拡張の実装" aria-label="Permalink to “A拡張の実装”">​</a></h1><p>本章では、メモリの不可分操作を実現するA拡張を実装します。 A拡張にはLoad-Reserved、Store-Conditionalを実現するZalrsc拡張(表2)、 ロードした値を加工し、その結果をメモリにストアする操作を単一の命令で実装するZaamo拡張(表1)が含まれています。 A拡張の命令を利用すると、同じメモリ空間で複数のソフトウェアを並列、並行して実行するとき、 ソフトウェア間で同期をとりながら実行できます。</p><h2 id="アトミック操作" tabindex="-1">アトミック操作 <a class="header-anchor" href="#アトミック操作" aria-label="Permalink to “アトミック操作”">​</a></h2><h3 id="アトミック操作とは何か" tabindex="-1">アトミック操作とは何か？ <a class="header-anchor" href="#アトミック操作とは何か" aria-label="Permalink to “アトミック操作とは何か？”">​</a></h3><p>アトミック操作(Atomic operation、不可分操作)とは、他のシステムからその操作を観測するとき、1つの操作として観測される操作のことです。 つまり、他のシステムは、アトミック操作を行う前、アトミック操作を行った後の状態しか観測できません。</p><p><img src="'+c+'" alt="図2のプログラムを2つに分割して2つのCPUで実行する (Xは11になる)"><img src="'+p+`" alt="1つのCPUでメモリ上の値を2回インクリメントする (Xは12になる)"> アトミック操作は実行、観測される順序が重要なアプリケーションで利用します。 例えば、アドレスXの値をロードして1を足した値を書き戻すプログラムを、 2つのコアで同時に実行するとします(図1)。 このとき命令の実行順序によっては、最終的な値が1つのコアで2回プログラムを実行した場合と異なってしまいます(図2)。 この状態を避けるためにはロード、加算、ストアをアトミックに行う必要があります。 このアトミック操作の実現方法として、A拡張はAMOADD命令、LR命令とSC命令を提供します。</p><h3 id="zaamo拡張" tabindex="-1">Zaamo拡張 <a class="header-anchor" href="#zaamo拡張" aria-label="Permalink to “Zaamo拡張”">​</a></h3><p>Zaamo拡張は、値をロードして、演算した値をストアする操作を1つの命令で行う命令を定義しています。 AMOADD命令はロード、加算、ストアを行う単一の命令です。 Zaamo拡張は他にも簡単な操作を行う命令も提供しています。</p><div id="a.instructions.zaamo" class="table"><p class="caption">表12.1: Zaamo拡張の命令</p><table><tr class="hline"><th>命令</th><th>動作 (読み込んだ値をレジスタにライトバックする)</th></tr><tr class="hline"><td>AMOSWAP.W/D</td><td>メモリから32/64ビット読み込み、<br>rs2の値を書き込む</td></tr><tr class="hline"><td>AMOADD.W/D</td><td>メモリから32/64ビット(符号付き)読み込み<br>rs2(符号付き)の値を足して書き込む</td></tr><tr class="hline"><td>AMOAND.W/D</td><td>メモリから32/64ビット読み込み<br>rs2の値をAND演算して書き込む</td></tr><tr class="hline"><td>AMOOR.W/D</td><td>メモリから32/64ビット読み込み<br>rs2の値をOR演算して書き込む</td></tr><tr class="hline"><td>AMOXOR.W/D</td><td>メモリから32/64ビット読み込み<br>rs2の値をXOR演算して書き込む</td></tr><tr class="hline"><td>AMOMIN.W/D</td><td>メモリから32/64ビット(符号付き)読み込み<br>rs2(符号付き)の値と比べて小さい値を書き込む</td></tr><tr class="hline"><td>AMOMAX.W/D</td><td>メモリから32/64ビット(符号付き)読み込み<br>rs2(符号付き)の値と比べて大きい値をを書き込む</td></tr><tr class="hline"><td>AMOMINU.W/D</td><td>メモリから32/64ビット(符号無し)読み込み<br>rs2(符号無し)の値と比べて小さい値を書き込む</td></tr><tr class="hline"><td>AMOMAXU.W/D</td><td>メモリから32/64ビット(符号無し)読み込み<br>rs2(符号無し)の値と比べて大きい値を書き込む</td></tr></table></div><h3 id="zalrsc拡張" tabindex="-1">Zalrsc拡張 <a class="header-anchor" href="#zalrsc拡張" aria-label="Permalink to “Zalrsc拡張”">​</a></h3><p>Zalrsc拡張は、LR命令とSC命令を定義しています。 LR、SC命令は、それぞれLoad-Reserved、Store-Conditional操作を実現する命令です。 それぞれ次のように動作します。</p><dl><dt>LR命令</dt><dd> 指定されたアドレスのデータを読み込み、指定されたアドレスを予約セット(Reservation set)に登録します。 ロードしたデータをレジスタにライトバックします。 </dd><dt>SC命令</dt><dd> 指定されたアドレスが予約セットに存在する場合、指定されたアドレスにデータを書き込みます(ストア成功)。 予約セットにアドレスが存在しない場合は書き込みません(ストア失敗)。 ストアに成功したら\`0\`、失敗したら\`0\`以外の値をレジスタにライトバックします。 命令の実行後に必ず予約セットを空にします。 </dd></dl><p>LR、SC命令を使うことで、アトミックなロード、加算、ストアを次のように記述できます (リスト1)。</p><p><span class="caption">▼リスト12.1: LR、SC命令によるアトミックな加算</span></p><div class="language-asm"><button title="Copy Code" class="copy"></button><span class="lang">asm</span><pre class="hljs"><code>atomic_add:
    LR.W x2, (x3) ← アドレスx3の値をx2にロード
    ADDI x2, x2, 1 ← x2に1を足す
    SC.W x4, x2, (x3) ← ストアを試行し、結果をx4に格納
    BNEZ x4, atomic_add ← SC命令が失敗していたらやり直す
</code></pre></div><p>例えば同時に2つのコアがリスト1を実行するとき、同期をとれていない書き込みはSC命令で失敗します。 失敗したらLR命令からやり直すことで、1つのコアで2回実行した場合と同一の結果(<code>1</code>を2回加算)になります。</p><p>予約セットのサイズは実装によって異なります。</p><div id="a.instructions.zalrsc" class="table"><p class="caption">表12.2: Zalrsc拡張の命令</p><table><tr class="hline"><th>命令</th><th>動作</th></tr><tr class="hline"><td>LR.W/D</td><td>メモリから32/64ビット読み込み、予約セットにアドレスを登録する<br>読み込んだ値をレジスタにライトバックする</td></tr><tr class="hline"><td>SC.W/D</td><td>予約セットにrs1の値が登録されている場合、メモリにrs2の値を書き込み<br>0をレジスタにライトバックする。予約セットにアドレスが登録されていない場合<br>メモリに書き込まず、0以外の値をレジスタにライトバックする。<br>命令の実行後に予約セットを空にする</td></tr></table></div><h3 id="命令の順序" tabindex="-1">命令の順序 <a class="header-anchor" href="#命令の順序" aria-label="Permalink to “命令の順序”">​</a></h3><p>A拡張の命令のビット列は、それぞれ1ビットのaq、rlビットを含んでいます。 このビットは、他のコアやハードウェアスレッドからメモリ操作を観測したときにメモリ操作がどのような順序で観測されるかを制御するものです。</p><p>A拡張の命令をAとするとき、それぞれのビットの状態に応じて、Aによるメモリ操作は次のように観測されます。</p><dl><dt>aq=0、rl=0</dt><dd> Aの前後でメモリ操作の順序は保証されません。 </dd><dt>aq=1、rl=0</dt><dd> Aの後ろにあるメモリを操作する命令は、Aのメモリ操作の後に観測されることが保証されます。 </dd><dt>aq=0、rl=1</dt><dd> Aのメモリ操作は、Aの前にあるメモリを操作する命令が観測できるようになった後に観測されることが保証されます。 </dd><dt>aq=1、rl=1</dt><dd> Aのメモリ操作は、Aの前にあるメモリを操作する命令よりも後、Aの後ろにあるメモリを操作する命令よりも前に観測されることが保証されます。 </dd></dl><p>今のところ、CPUはメモリ操作を１命令ずつ直列に実行するため、常にaqが<code>1</code>、rlが<code>1</code>であるように動作します。 そのため、本章ではaq、rlビットを考慮しないで実装を行います<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><h2 id="命令のデコード" tabindex="-1">命令のデコード <a class="header-anchor" href="#命令のデコード" aria-label="Permalink to “命令のデコード”">​</a></h2><p>A拡張の命令はすべてR形式で、opcodeはOP-AMO(<code>7&#39;b0101111</code>)です。 それぞれの命令はfunct5(リスト3)とfunct3(Wは<code>2</code>、Dは<code>3</code>)で区別できます。</p><p>eeiパッケージにOP-AMOの定数を定義します (リスト2)。</p><p><span class="caption">▼リスト12.2: OP-AMOの定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> OP_AMO      : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = <span class="hljs-number">7&#39;b0101111</span>;
</code></pre></div><p>A拡張の命令を区別するための列挙型<code>AMOOp</code>を定義します (リスト3)。 それぞれ命令のfunct5と対応しています。</p><p><span class="caption">▼リスト12.3: AMOOp型の定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> AMOOp: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; {
    LR = <span class="hljs-number">5&#39;b00010</span>,
    SC = <span class="hljs-number">5&#39;b00011</span>,
    SWAP = <span class="hljs-number">5&#39;b00001</span>,
    ADD = <span class="hljs-number">5&#39;b00000</span>,
    XOR = <span class="hljs-number">5&#39;b00100</span>,
    AND = <span class="hljs-number">5&#39;b01100</span>,
    OR = <span class="hljs-number">5&#39;b01000</span>,
    MIN = <span class="hljs-number">5&#39;b10000</span>,
    MAX = <span class="hljs-number">5&#39;b10100</span>,
    MINU = <span class="hljs-number">5&#39;b11000</span>,
    MAXU = <span class="hljs-number">5&#39;b11100</span>,
}
</code></pre></div><h3 id="is-amoフラグを実装する" tabindex="-1">is_amoフラグを実装する <a class="header-anchor" href="#is-amoフラグを実装する" aria-label="Permalink to “is_amoフラグを実装する”">​</a></h3><p><code>InstCtrl</code>構造体に、 A拡張の命令であることを示す<code>is_amo</code>フラグを追加します (リスト4)。</p><p><span class="caption">▼リスト12.4: InstCtrlにis_amoを定義する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> InstCtrl {
    itype    : InstType   , <span class="hljs-comment">// 命令の形式</span>
    rwb_en   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// レジスタに書き込むかどうか</span>
    is_lui   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// LUI命令である</span>
    is_aluop : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ALUを利用する命令である</span>
    is_muldiv: <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// M拡張の命令である</span>
    is_op32  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// OP-32またはOP-IMM-32である</span>
    is_jump  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ジャンプ命令である</span>
    is_load  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ロード命令である</span>
    is_csr   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// CSR命令である</span>
    <span class="custom-hl-bold">is_amo   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// AMO instruction</span></span>
    funct3   : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
    funct7   : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">7</span>&gt;, <span class="hljs-comment">// 命令のfunct7フィールド</span>
}
</code></pre></div><p>命令がメモリにアクセスするかを判定するinst_is_memop関数を、<code>is_amo</code>フラグを利用するように変更します (リスト5)。</p><p><span class="caption">▼リスト12.5: A拡張の命令がメモリにアクセスする命令と判定する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> inst_is_memop (
    ctrl: <span class="hljs-keyword">input</span> InstCtrl,
) -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">return</span> ctrl.itype == InstType::S || ctrl.is_load <span class="custom-hl-bold">|| ctrl.is_amo</span>;
}
</code></pre></div><p>inst_decoderモジュールの<code>InstCtrl</code>を生成している部分を変更します。 opcodeが<code>OP-AMO</code>のとき、<code>is_amo</code>を<code>T</code>に設定します (リスト6)。 その他のopcodeの<code>is_amo</code>は<code>F</code>に設定してください。</p><p><span class="caption">▼リスト12.6: is_amoフラグを追加する (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_SYSTEM: {
    InstType::I, T, F, F, F, F, F, F, T<span class="custom-hl-bold">, F</span>
},
OP_AMO: {
    InstType::R, T, F, F, F, F, F, F, F<span class="custom-hl-bold">, T</span>
},
<span class="hljs-keyword">default</span>: {
    InstType::X, F, F, F, F, F, F, F, F<span class="custom-hl-bold">, F</span>
},
</code></pre></div><p>また、A拡張の命令が有効な命令として判断されるようにします (リスト7)。</p><p><span class="caption">▼リスト12.7: A拡張の命令のとき、validフラグを立てる (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_MISC_MEM: T, <span class="hljs-comment">// FENCE</span>
<span class="custom-hl-bold">OP_AMO     : f3 == <span class="hljs-number">3&#39;b010</span> || f3 == <span class="hljs-number">3&#39;b011</span>, <span class="hljs-comment">// AMO</span></span>
<span class="hljs-keyword">default</span>    : F,
</code></pre></div><h3 id="アドレスを変更する" tabindex="-1">アドレスを変更する <a class="header-anchor" href="#アドレスを変更する" aria-label="Permalink to “アドレスを変更する”">​</a></h3><p>A拡張でアクセスするメモリのアドレスはrs1で指定されたレジスタの値です。 これは基本整数命令セットのロードストア命令のアドレス指定方法(rs1と即値を足し合わせる)とは異なるため、 memunitモジュールの<code>addr</code>ポートに割り当てる値を<code>is_amo</code>フラグによって切り替えます (リスト8)。</p><p><span class="caption">▼リスト12.8: メモリアドレスをrs1レジスタの値にする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> memu_rdata: UIntX;
<span class="hljs-keyword">var</span> memu_stall: <span class="hljs-keyword">logic</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> memu_addr : Addr  = <span class="hljs-keyword">if</span> mems_ctrl.is_amo ? memq_rdata.rs1_data : memq_rdata.alu_result;</span>

<span class="hljs-keyword">inst</span> memu: memunit (
    clk                                   ,
    rst                                   ,
    valid : mems_valid &amp;&amp; !mems_expt.valid,
    is_new: mems_is_new                   ,
    ctrl  : mems_ctrl                     ,
    <span class="custom-hl-bold">addr  : memu_addr                     ,</span>
    rs2   : memq_rdata.rs2_data           ,
    rdata : memu_rdata                    ,
    stall : memu_stall                    ,
    membus: d_membus                      ,
);
</code></pre></div><p>A拡張の命令のメモリアドレスが、 操作するデータの幅に整列されていないとき、 Store/AMO address misaligned例外が発生します。 この例外はストア命令の場合の例外と同じです。</p><p>EXステージの例外判定でアドレスを使っている部分を変更します (リスト9)。 causeとtvalの割り当てがストア命令の場合と同じになっていることを確認してください。</p><p><span class="caption">▼リスト12.9: 例外を判定するアドレスを変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> memaddr                       : Addr  = <span class="hljs-keyword">if</span> exs_ctrl.is_amo ? exs_rs1_data : exs_alu_result;</span>
<span class="hljs-keyword">let</span> loadstore_address_misaligned  : <span class="hljs-keyword">logic</span> = inst_is_memop(exs_ctrl) &amp;&amp; <span class="hljs-keyword">case</span> exs_ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>  : <span class="hljs-number">0</span>, <span class="hljs-comment">// B</span>
    <span class="hljs-number">2&#39;b01</span>  : <span class="custom-hl-bold">memaddr</span>[<span class="hljs-number">0</span>] != <span class="hljs-number">1&#39;b0</span>, <span class="hljs-comment">// H</span>
    <span class="hljs-number">2&#39;b10</span>  : <span class="custom-hl-bold">memaddr</span>[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b0</span>, <span class="hljs-comment">// W</span>
    <span class="hljs-number">2&#39;b11</span>  : <span class="custom-hl-bold">memaddr</span>[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">3&#39;b0</span>, <span class="hljs-comment">// D</span>
    <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
};
</code></pre></div><h3 id="ライトバックする条件を変更する" tabindex="-1">ライトバックする条件を変更する <a class="header-anchor" href="#ライトバックする条件を変更する" aria-label="Permalink to “ライトバックする条件を変更する”">​</a></h3><p>A拡張の命令を実行するとき、 ロードした値をレジスタにライトバックするように変更します (リスト10)。</p><p><span class="caption">▼リスト12.10: メモリからロードした値をライトバックする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/9fbda5ac128d11f020794302ceed1d9bea972b6b~1..9fbda5ac128d11f020794302ceed1d9bea972b6b#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> wbs_wb_data: UIntX    = <span class="hljs-keyword">switch</span> {
    wbs_ctrl.is_lui                    : wbs_imm,
    wbs_ctrl.is_jump                   : wbs_pc + <span class="hljs-number">4</span>,
    wbs_ctrl.is_load <span class="custom-hl-bold">|| wbs_ctrl.is_amo</span>: wbq_rdata.mem_rdata,
    wbs_ctrl.is_csr                    : wbq_rdata.csr_rdata,
    <span class="hljs-keyword">default</span>                            : wbq_rdata.alu_result
};
</code></pre></div><h2 id="amounitモジュールの作成" tabindex="-1">amounitモジュールの作成 <a class="header-anchor" href="#amounitモジュールの作成" aria-label="Permalink to “amounitモジュールの作成”">​</a></h2><p>A拡張は他のコア、ハードウェアスレッドと同期してメモリ操作を行うためのものであるため、 A拡張の操作はcoreモジュールの外、メモリよりも前で行います。 本書では、coreモジュールとmmio_controllerモジュールの間に、 A拡張の命令を処理するamounitモジュールを実装します(図3)。</p><p><img src="`+d+`" alt="amounitモジュールと他のモジュールの接続"></p><h3 id="インターフェースを作成する" tabindex="-1">インターフェースを作成する <a class="header-anchor" href="#インターフェースを作成する" aria-label="Permalink to “インターフェースを作成する”">​</a></h3><p>amounitモジュールにA拡張の操作を指示するために、 <code>is_amo</code>フラグ、<code>aq</code>ビット、<code>rl</code>ビット、<code>AMOOp</code>型をmembus_ifインターフェースに追加で定義したインターフェースを作成します。</p><p><code>src/core_data_if.veryl</code>を作成し、次のように記述します (リスト11)。</p><p><span class="caption">▼リスト12.11: core_data_if.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-758b6cef60d94fd7ce6613325ed390f46f67a9270f329aae32db73abcbb60b1d">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">interface</span> core_data_if {
    <span class="hljs-keyword">var</span> valid : <span class="hljs-keyword">logic</span>                       ;
    <span class="hljs-keyword">var</span> ready : <span class="hljs-keyword">logic</span>                       ;
    <span class="hljs-keyword">var</span> addr  : <span class="hljs-keyword">logic</span>&lt;XLEN&gt;                 ;
    <span class="hljs-keyword">var</span> wen   : <span class="hljs-keyword">logic</span>                       ;
    <span class="hljs-keyword">var</span> wdata : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt;    ;
    <span class="hljs-keyword">var</span> wmask : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH / <span class="hljs-number">8</span>&gt;;
    <span class="hljs-keyword">var</span> rvalid: <span class="hljs-keyword">logic</span>                       ;
    <span class="hljs-keyword">var</span> rdata : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt;    ;

    <span class="hljs-keyword">var</span> is_amo: <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> aq    : <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> rl    : <span class="hljs-keyword">logic</span>   ;
    <span class="hljs-keyword">var</span> amoop : AMOOp   ;
    <span class="hljs-keyword">var</span> funct3: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;;

    <span class="hljs-keyword">modport</span> master {
        valid : <span class="hljs-keyword">output</span>,
        ready : <span class="hljs-keyword">input</span> ,
        addr  : <span class="hljs-keyword">output</span>,
        wen   : <span class="hljs-keyword">output</span>,
        wdata : <span class="hljs-keyword">output</span>,
        wmask : <span class="hljs-keyword">output</span>,
        rvalid: <span class="hljs-keyword">input</span> ,
        rdata : <span class="hljs-keyword">input</span> ,
        is_amo: <span class="hljs-keyword">output</span>,
        aq    : <span class="hljs-keyword">output</span>,
        rl    : <span class="hljs-keyword">output</span>,
        amoop : <span class="hljs-keyword">output</span>,
        funct3: <span class="hljs-keyword">output</span>,
    }

    <span class="hljs-keyword">modport</span> slave {
        ..<span class="hljs-keyword">converse</span>(master)
    }

    <span class="hljs-keyword">modport</span> all_input {
        ..<span class="hljs-keyword">input</span>
    }
}
</code></pre></div><h3 id="amounitモジュールの作成-1" tabindex="-1">amounitモジュールの作成 <a class="header-anchor" href="#amounitモジュールの作成-1" aria-label="Permalink to “amounitモジュールの作成”">​</a></h3><p>メモリ操作をcoreモジュールからそのままmmio_controllerモジュールに受け渡しするだけのモジュールを作成します。 <code>src/amounit.veryl</code>を作成し、次のように記述します (リスト12)。</p><p><span class="caption">▼リスト12.12: amounit.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> amounit (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>              ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>              ,
    slave : <span class="hljs-keyword">modport</span> core_data_if::slave,
    master: <span class="hljs-keyword">modport</span> Membus::master     ,
) {

    <span class="hljs-keyword">enum</span> State {
        Init,
        WaitReady,
        WaitValid,
    }

    <span class="hljs-keyword">var</span> state      : State;
    <span class="hljs-keyword">inst</span> slave_saved: core_data_if;

    <span class="hljs-comment">// masterをリセットする</span>
    <span class="hljs-keyword">function</span> reset_master () {
        master.valid = <span class="hljs-number">0</span>;
        master.addr  = <span class="hljs-number">0</span>;
        master.wen   = <span class="hljs-number">0</span>;
        master.wdata = <span class="hljs-number">0</span>;
        master.wmask = <span class="hljs-number">0</span>;
    }

    <span class="hljs-comment">// masterに要求を割り当てる</span>
    <span class="hljs-keyword">function</span> assign_master (
        addr : <span class="hljs-keyword">input</span> Addr                   ,
        wen  : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>                  ,
        wdata: <span class="hljs-keyword">input</span> UIntX                  ,
        wmask: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;$size(UIntX) / <span class="hljs-number">8</span>&gt;,
    ) {
        master.valid = <span class="hljs-number">1</span>;
        master.addr  = addr;
        master.wen   = wen;
        master.wdata = wdata;
        master.wmask = wmask;
    }

    <span class="hljs-comment">// 新しく要求を受け入れる</span>
    <span class="hljs-keyword">function</span> accept_request_comb () {
        <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid {
            assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
        }
    }

    <span class="hljs-comment">// slaveに結果を割り当てる</span>
    <span class="hljs-keyword">always_comb</span> {
        slave.ready  = <span class="hljs-number">0</span>;
        slave.rvalid = <span class="hljs-number">0</span>;
        slave.rdata  = <span class="hljs-number">0</span>;

        <span class="hljs-keyword">case</span> state {
            State::Init: {
                slave.ready = <span class="hljs-number">1</span>;
            }
            State::WaitValid: {
                slave.ready  = master.rvalid;
                slave.rvalid = master.rvalid;
                slave.rdata  = master.rdata;
            }
            <span class="hljs-keyword">default</span>: {}
        }
    }

    <span class="hljs-comment">// masterに要求を割り当てる</span>
    <span class="hljs-keyword">always_comb</span> {
        reset_master();
        <span class="hljs-keyword">case</span> state {
            State::Init     : accept_request_comb();
            State::WaitReady: {
                assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
            }
            State::WaitValid: accept_request_comb();
            <span class="hljs-keyword">default</span>         : {}
        }
    }

    <span class="hljs-comment">// 新しく要求を受け入れる</span>
    <span class="hljs-keyword">function</span> accept_request_ff () {
        slave_saved.valid = slave.ready &amp;&amp; slave.valid;
        <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid {
            slave_saved.addr   = slave.addr;
            slave_saved.wen    = slave.wen;
            slave_saved.wdata  = slave.wdata;
            slave_saved.wmask  = slave.wmask;
            slave_saved.is_amo = slave.is_amo;
            slave_saved.amoop  = slave.amoop;
            slave_saved.aq     = slave.aq;
            slave_saved.rl     = slave.rl;
            slave_saved.funct3 = slave.funct3;
            state              = <span class="hljs-keyword">if</span> master.ready ? State::WaitValid : State::WaitReady;
        } <span class="hljs-keyword">else</span> {
            state = State::Init;
        }
    }

    <span class="hljs-keyword">function</span> on_clock () {
        <span class="hljs-keyword">case</span> state {
            State::Init     : accept_request_ff();
            State::WaitReady: <span class="hljs-keyword">if</span> master.ready {
                state = State::WaitValid;
            }
            State::WaitValid: <span class="hljs-keyword">if</span> master.rvalid {
                accept_request_ff();
            }
            <span class="hljs-keyword">default</span>: {}
        }
    }

    <span class="hljs-keyword">function</span> on_reset () {
        state              = State::Init;
        slave_saved.addr   = <span class="hljs-number">0</span>;
        slave_saved.wen    = <span class="hljs-number">0</span>;
        slave_saved.wdata  = <span class="hljs-number">0</span>;
        slave_saved.wmask  = <span class="hljs-number">0</span>;
        slave_saved.is_amo = <span class="hljs-number">0</span>;
        slave_saved.amoop  = <span class="hljs-number">0</span> <span class="hljs-keyword">as</span> AMOOp;
        slave_saved.aq     = <span class="hljs-number">0</span>;
        slave_saved.rl     = <span class="hljs-number">0</span>;
        slave_saved.funct3 = <span class="hljs-number">0</span>;
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            on_reset();
        } <span class="hljs-keyword">else</span> {
            on_clock();
        }
    }
}
</code></pre></div><p>amounitモジュールは <code>State::Init</code>、 (<code>State::WaitReady</code>、) <code>State::WaitValid</code>の順に状態を移動し、 通常のロードストア命令を処理します。</p><p>coreモジュールのロードストア用のインターフェースをmembus_ifからcore_data_ifに変更します (リスト13、 リスト14、 リスト15)。</p><p><span class="caption">▼リスト12.13: d_membusの型を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>i_membus: <span class="hljs-keyword">modport</span> membus_if::&lt;ILEN, XLEN&gt;::master,
d_membus: <span class="hljs-keyword">modport</span> <span class="custom-hl-bold">core_data_if</span>::master           ,
led     : <span class="hljs-keyword">output</span>  UIntX                          ,
</code></pre></div><p><span class="caption">▼リスト12.14: core_data_ifインターフェースのインスタンス化 (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> d_membus_core: core_data_if;
</code></pre></div><p><span class="caption">▼リスト12.15: ポートに割り当てるインターフェースを変更する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk                    ,
    rst                    ,
    i_membus               ,
    <span class="custom-hl-bold">d_membus: d_membus_core,</span>
    led                    ,
);
</code></pre></div><p>memunitモジュールのインターフェースも変更し、 <code>is_amo</code>、<code>aq</code>、<code>rl</code>、<code>amoop</code>に値を割り当てます (リスト16、 リスト17、 リスト19、 リスト18、 リスト20)。</p><p><span class="caption">▼リスト12.16: membusの型を変更する (memunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-d3618e86de098826661fabd111bec51452d943d3e486d18f9c3aa96b2dd9a89e">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    stall : <span class="hljs-keyword">output</span>  <span class="hljs-keyword">logic</span>               , <span class="hljs-comment">// メモリアクセス命令が完了していない</span>
    membus: <span class="hljs-keyword">modport</span> <span class="custom-hl-bold">core_data_if</span>::master, <span class="hljs-comment">// メモリとのinterface</span>
) {
</code></pre></div><p><span class="caption">▼リスト12.17: 一時保存するレジスタの定義 (memunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-d3618e86de098826661fabd111bec51452d943d3e486d18f9c3aa96b2dd9a89e">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> req_wen   : <span class="hljs-keyword">logic</span>                       ;
<span class="hljs-keyword">var</span> req_addr  : Addr                        ;
<span class="hljs-keyword">var</span> req_wdata : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt;    ;
<span class="hljs-keyword">var</span> req_wmask : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH / <span class="hljs-number">8</span>&gt;;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> req_is_amo: <span class="hljs-keyword">logic</span>                       ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> req_amoop : AMOOp                       ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> req_aq    : <span class="hljs-keyword">logic</span>                       ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> req_rl    : <span class="hljs-keyword">logic</span>                       ;</span>
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> req_funct3: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;                    ;</span>
</code></pre></div><p><span class="caption">▼リスト12.18: レジスタをリセットする (memunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-d3618e86de098826661fabd111bec51452d943d3e486d18f9c3aa96b2dd9a89e">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        state      = State::Init;
        req_wen    = <span class="hljs-number">0</span>;
        req_addr   = <span class="hljs-number">0</span>;
        req_wdata  = <span class="hljs-number">0</span>;
        req_wmask  = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">req_is_amo = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">req_amoop  = <span class="hljs-number">0</span> <span class="hljs-keyword">as</span> AMOOp;</span>
        <span class="custom-hl-bold">req_aq     = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">req_rl     = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">req_funct3 = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
</code></pre></div><p><span class="caption">▼リスト12.19: membusにレジスタの値を割り当てる (memunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-d3618e86de098826661fabd111bec51452d943d3e486d18f9c3aa96b2dd9a89e">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// メモリアクセス</span>
    membus.valid  = state == State::WaitReady;
    membus.addr   = req_addr;
    membus.wen    = req_wen;
    membus.wdata  = req_wdata;
    membus.wmask  = req_wmask;
    <span class="custom-hl-bold">membus.is_amo = req_is_amo;</span>
    <span class="custom-hl-bold">membus.amoop  = req_amoop;</span>
    <span class="custom-hl-bold">membus.aq     = req_aq;</span>
    <span class="custom-hl-bold">membus.rl     = req_rl;</span>
    <span class="custom-hl-bold">membus.funct3 = req_funct3;</span>
</code></pre></div><p><span class="caption">▼リスト12.20: メモリにアクセスする命令のとき、レジスタに情報を設定する (memunit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-d3618e86de098826661fabd111bec51452d943d3e486d18f9c3aa96b2dd9a89e">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> state {
    State::Init: <span class="hljs-keyword">if</span> is_new &amp; inst_is_memop(ctrl) {
        ...
        <span class="custom-hl-bold">req_is_amo = ctrl.is_amo;</span>
        <span class="custom-hl-bold">req_amoop  = ctrl.funct7[<span class="hljs-number">6</span>:<span class="hljs-number">2</span>] <span class="hljs-keyword">as</span> AMOOp;</span>
        <span class="custom-hl-bold">req_aq     = ctrl.funct7[<span class="hljs-number">1</span>];</span>
        <span class="custom-hl-bold">req_rl     = ctrl.funct7[<span class="hljs-number">0</span>];</span>
        <span class="custom-hl-bold">req_funct3 = ctrl.funct3;</span>
    }
    State::WaitReady: <span class="hljs-keyword">if</span> membus.ready {
</code></pre></div><p>amounitモジュールをtopモジュールでインスタンス化し、 coreモジュールとmmio_controllerモジュールのインターフェースを接続します (リスト21)。</p><p><span class="caption">▼リスト12.21: amounitモジュールをインスタンス化する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10~1..acdd11aea9f4faefbe0bc29f6172a58a8c8c9a10#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> amou: amounit (
    clk                  ,
    rst                  ,
    slave : d_membus_core,
    master: d_membus     ,
);
</code></pre></div><h2 id="zalrsc拡張の実装" tabindex="-1">Zalrsc拡張の実装 <a class="header-anchor" href="#zalrsc拡張の実装" aria-label="Permalink to “Zalrsc拡張の実装”">​</a></h2><p>Zalrsc拡張の命令を実装します。 予約セットのサイズは実装が自由に決めることができるため、 本書では1つのアドレスのみ保持できるようにします。</p><h3 id="lr-w、lr-d命令を実装する" tabindex="-1">LR.W、LR.D命令を実装する <a class="header-anchor" href="#lr-w、lr-d命令を実装する" aria-label="Permalink to “LR.W、LR.D命令を実装する”">​</a></h3><p>32ビット幅、64ビット幅のLR命令を実装します。 LR.W命令はmemunitモジュールで64ビットに符号拡張されるため、 amounitモジュールでLR.W命令とLR.D命令を区別する必要はありません。</p><p>amounitモジュールに予約セットを作成します (リスト22、 リスト23)。 <code>is_addr_reserved</code>で、予約セットに有効なアドレスが格納されているかを管理します。</p><p><span class="caption">▼リスト12.22: 予約セットの定義 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/135c1f542c570750dfebece7df3786c14cd9eb02~1..135c1f542c570750dfebece7df3786c14cd9eb02#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// lr/sc</span>
<span class="hljs-keyword">var</span> is_addr_reserved: <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> reserved_addr   : Addr ;
</code></pre></div><p><span class="caption">▼リスト12.23: レジスタをリセットする (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/135c1f542c570750dfebece7df3786c14cd9eb02~1..135c1f542c570750dfebece7df3786c14cd9eb02#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>is_addr_reserved   = <span class="hljs-number">0</span>;
reserved_addr      = <span class="hljs-number">0</span>;
</code></pre></div><p>LR命令を実行するとき、予約セットにアドレスを登録してロード結果を返すようにします (リスト24、 リスト25、 リスト26)。 既に予約セットが使われている場合はアドレスを上書きします。</p><p><span class="caption">▼リスト12.24: accept_request_comb関数の実装 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/135c1f542c570750dfebece7df3786c14cd9eb02~1..135c1f542c570750dfebece7df3786c14cd9eb02#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> accept_request_comb () {
    <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid {
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> slave.is_amo {</span>
        <span class="custom-hl-bold">    <span class="hljs-keyword">case</span> slave.amoop {</span>
        <span class="custom-hl-bold">        AMOOp::LR: assign_master(slave.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);</span>
        <span class="custom-hl-bold">        <span class="hljs-keyword">default</span>  : {}</span>
        <span class="custom-hl-bold">    }</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            assign_master(slave.addr, slave.wen, slave.wdata, slave.wmask);
        <span class="custom-hl-bold">}</span>
    }
}
</code></pre></div><p><span class="caption">▼リスト12.25: LR命令のときにmasterにロード要求を割り当てる (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/135c1f542c570750dfebece7df3786c14cd9eb02~1..135c1f542c570750dfebece7df3786c14cd9eb02#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    reset_master();
    <span class="hljs-keyword">case</span> state {
        State::Init     : accept_request_comb();
        <span class="custom-hl-bold">State::WaitReady: <span class="hljs-keyword">if</span> slave_saved.is_amo {</span>
        <span class="custom-hl-bold">    <span class="hljs-keyword">case</span> slave_saved.amoop {</span>
        <span class="custom-hl-bold">        AMOOp::LR: assign_master(slave_saved.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);</span>
        <span class="custom-hl-bold">        <span class="hljs-keyword">default</span>  : {}</span>
        <span class="custom-hl-bold">    }</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
        <span class="custom-hl-bold">}</span>
</code></pre></div><p><span class="caption">▼リスト12.26: LR命令のときに予約セットを設定する (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/135c1f542c570750dfebece7df3786c14cd9eb02~1..135c1f542c570750dfebece7df3786c14cd9eb02#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> accept_request_ff () {
    slave_saved.valid = slave.ready &amp;&amp; slave.valid;
    <span class="hljs-keyword">if</span> slave.ready &amp;&amp; slave.valid {
        slave_saved.addr   = slave.addr;
        ...
        slave_saved.funct3 = slave.funct3;
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> slave.is_amo {</span>
        <span class="custom-hl-bold">    <span class="hljs-keyword">case</span> slave.amoop {</span>
        <span class="custom-hl-bold">        AMOOp::LR: {</span>
        <span class="custom-hl-bold">            <span class="hljs-comment">// reserve address</span></span>
        <span class="custom-hl-bold">            is_addr_reserved = <span class="hljs-number">1</span>;</span>
        <span class="custom-hl-bold">            reserved_addr    = slave.addr;</span>
        <span class="custom-hl-bold">            state            = <span class="hljs-keyword">if</span> master.ready ? State::WaitValid : State::WaitReady;</span>
        <span class="custom-hl-bold">        }</span>
        <span class="custom-hl-bold">        <span class="hljs-keyword">default</span>: {}</span>
        <span class="custom-hl-bold">    }</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            state = <span class="hljs-keyword">if</span> master.ready ? State::WaitValid : State::WaitReady;
        <span class="custom-hl-bold">}</span>
</code></pre></div><h3 id="sc-w、sc-d命令を実装する" tabindex="-1">SC.W、SC.D命令を実装する <a class="header-anchor" href="#sc-w、sc-d命令を実装する" aria-label="Permalink to “SC.W、SC.D命令を実装する”">​</a></h3><p>32ビット幅、64ビット幅のSC命令を実装します。 SC.W命令はmemunitモジュールで書き込みマスクを設定しているため、 amounitモジュールでSC.W命令とSC.D命令を区別する必要はありません。</p><p>SC命令が成功、失敗したときに結果を返すための状態を<code>State</code>型に追加します (リスト27)。</p><p><span class="caption">▼リスト12.27: SC命令用の状態の定義 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> State {
    Init,
    WaitReady,
    WaitValid,
    <span class="custom-hl-bold">SCSuccess,</span>
    <span class="custom-hl-bold">SCFail,</span>
}
</code></pre></div><p>それぞれの状態で結果を返し、新しく要求を受け入れるようにします (リスト28)。 <code>State::SCSuccess</code>はSC命令に成功してストアが終わったときに結果を返します。 成功したら<code>0</code>、失敗したら<code>1</code>を返します。</p><p><span class="caption">▼リスト12.28: slaveにSC命令の結果を割り当てる (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::SCSuccess: {
    slave.ready  = master.rvalid;
    slave.rvalid = master.rvalid;
    slave.rdata  = <span class="hljs-number">0</span>;
}
State::SCFail: {
    slave.ready  = <span class="hljs-number">1</span>;
    slave.rvalid = <span class="hljs-number">1</span>;
    slave.rdata  = <span class="hljs-number">1</span>;
}
</code></pre></div><p>SC命令を受け入れるときに予約セットを確認し、アドレスが予約セットのアドレスと異なる場合は状態を<code>State::SCFail</code>に移動します (リスト29)。 成功、失敗に関係なく、予約セットを空にします。</p><p><span class="caption">▼リスト12.29: accept_request_ff関数で予約セットを確認する (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>AMOOp::SC: {
    <span class="hljs-comment">// reset reserved</span>
    <span class="hljs-keyword">let</span> prev            : <span class="hljs-keyword">logic</span> = is_addr_reserved;
    is_addr_reserved = <span class="hljs-number">0</span>;
    <span class="hljs-comment">// check</span>
    <span class="hljs-keyword">if</span> prev &amp;&amp; slave.addr == reserved_addr {
        state = <span class="hljs-keyword">if</span> master.ready ? State::SCSuccess : State::WaitReady;
    } <span class="hljs-keyword">else</span> {
        state = State::SCFail;
    }
}
</code></pre></div><p>SC命令でメモリの<code>ready</code>が<code>1</code>になるのを待っているとき、 <code>ready</code>が<code>1</code>になったら状態を<code>State::SCSuccess</code>に移動します (リスト30)。 また、命令の実行が終了したときに新しく要求を受け入れるようにします。</p><p><span class="caption">▼リスト12.30: SC命令の状態遷移 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> on_clock () {
    <span class="hljs-keyword">case</span> state {
        State::Init     : accept_request_ff();
        State::WaitReady: <span class="hljs-keyword">if</span> master.ready {
            <span class="custom-hl-bold"><span class="hljs-keyword">if</span> slave_saved.is_amo &amp;&amp; slave_saved.amoop == AMOOp::SC {</span>
            <span class="custom-hl-bold">    state = State::SCSuccess;</span>
            <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
                state = State::WaitValid;
            <span class="custom-hl-bold">}</span>
        }
        State::WaitValid: <span class="hljs-keyword">if</span> master.rvalid {
            accept_request_ff();
        }
        <span class="custom-hl-bold">State::SCSuccess: <span class="hljs-keyword">if</span> master.rvalid {</span>
        <span class="custom-hl-bold">    accept_request_ff();</span>
        <span class="custom-hl-bold">}</span>
        <span class="custom-hl-bold">State::SCFail: accept_request_ff();</span>
        <span class="hljs-keyword">default</span>      : {}
    }
}
</code></pre></div><p>SC命令によるメモリへの書き込みを実装します ( リスト31、 リスト32 )。</p><p><span class="caption">▼リスト12.31: accept_request_comb関数で、予約セットをチェックしてからストアを要求する (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> slave.amoop {
    AMOOp::LR: assign_master(slave.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);
    <span class="custom-hl-bold">AMOOp::SC: <span class="hljs-keyword">if</span> is_addr_reserved &amp;&amp; slave.addr == reserved_addr {</span>
    @&lt;b&gt;     assign_master(slave.addr, <span class="hljs-number">1</span>, slave.wdata, slave.wmask);|
    @&lt;b&gt; }|
    <span class="hljs-keyword">default</span>: {}
}
</code></pre></div><p><span class="caption">▼リスト12.32: masterに値を割り当てる (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/5af8f83bf1f826b4f92daac50bf61fba04620424~1..5af8f83bf1f826b4f92daac50bf61fba04620424#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    reset_master();
    <span class="hljs-keyword">case</span> state {
        State::Init     : accept_request_comb();
        State::WaitReady: <span class="hljs-keyword">if</span> slave_saved.is_amo {
            <span class="hljs-keyword">case</span> slave_saved.amoop {
                AMOOp::LR: assign_master(slave_saved.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);
                <span class="custom-hl-bold">AMOOp::SC: assign_master(slave_saved.addr, <span class="hljs-number">1</span>, slave_saved.wdata, slave_saved.wmask);</span>
                <span class="hljs-keyword">default</span>  : {}
            }
        } <span class="hljs-keyword">else</span> {
            assign_master(slave_saved.addr, slave_saved.wen, slave_saved.wdata, slave_saved.wmask);
        }
        State::WaitValid               : accept_request_comb();
        <span class="custom-hl-bold">State::SCFail, State::SCSuccess: accept_request_comb();</span>
        <span class="hljs-keyword">default</span>                        : {}
    }
}
</code></pre></div><h2 id="zaamo拡張の実装" tabindex="-1">Zaamo拡張の実装 <a class="header-anchor" href="#zaamo拡張の実装" aria-label="Permalink to “Zaamo拡張の実装”">​</a></h2><p>Zaamo拡張の命令はロード、演算、ストアを行います。 本章では、Zaamo拡張の命令を <code>State::Init</code> (、<code>State::AMOLoadReady</code>) 、<code>State::AMOLoadValid</code> (、<code>State::AMOStoreReady</code>) 、<code>State::AMOStoreValid</code> という状態遷移で処理するように実装します。</p><p><code>State</code>型に新しい状態を定義してください (リスト33)。</p><p><span class="caption">▼リスト12.33: Zaamo拡張の命令用の状態の定義 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">enum</span> State {
    Init,
    WaitReady,
    WaitValid,
    SCSuccess,
    SCFail,
    <span class="custom-hl-bold">AMOLoadReady,</span>
    <span class="custom-hl-bold">AMOLoadValid,</span>
    <span class="custom-hl-bold">AMOStoreReady,</span>
    <span class="custom-hl-bold">AMOStoreValid,</span>
}
</code></pre></div><p>簡単にZalrsc拡張と区別するために、 Zaamo拡張による要求かどうかを判定する関数(<code>is_Zaamo</code>)をcore_data_ifインターフェースに作成します ( リスト34、 リスト35 )。 modportにimport宣言を追加してください。</p><p><span class="caption">▼リスト12.34: is_Zaamo関数の定義 (core_data_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-758b6cef60d94fd7ce6613325ed390f46f67a9270f329aae32db73abcbb60b1d">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> is_Zaamo () -&gt; <span class="hljs-keyword">logic</span> {
    <span class="hljs-keyword">return</span> is_amo &amp;&amp; (amoop != AMOOp::LR &amp;&amp; amoop != AMOOp::SC);
}
</code></pre></div><p><span class="caption">▼リスト12.35: masterにis_Zaamo関数をimportする (core_data_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-758b6cef60d94fd7ce6613325ed390f46f67a9270f329aae32db73abcbb60b1d">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    amoop   : <span class="hljs-keyword">output</span>,
    funct3  : <span class="hljs-keyword">output</span>,
    <span class="custom-hl-bold">is_Zaamo: <span class="hljs-keyword">import</span>,</span>
}
</code></pre></div><p>ロードした値と<code>wdata</code>、フラグを利用して、ストアする値を生成する関数を作成します (リスト36)。 32ビット演算のとき、下位32ビットと上位32ビットのどちらを使うかをアドレスによって判別しています。</p><p><span class="caption">▼リスト12.36: Zaamo拡張の命令の計算を行う関数の定義 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// AMO ALU</span>
<span class="hljs-keyword">function</span> calc_amo::&lt;W: <span class="hljs-keyword">u32</span>&gt; (
    amoop: <span class="hljs-keyword">input</span> AMOOp   ,
    wdata: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;W&gt;,
    rdata: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;W&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;W&gt; {
    <span class="hljs-keyword">let</span> lts: <span class="hljs-keyword">logic</span> = $<span class="hljs-keyword">signed</span>(wdata) &lt;: $<span class="hljs-keyword">signed</span>(rdata);
    <span class="hljs-keyword">let</span> ltu: <span class="hljs-keyword">logic</span> = wdata &lt;: rdata;

    <span class="hljs-keyword">return</span> <span class="hljs-keyword">case</span> amoop {
        AMOOp::SWAP: wdata,
        AMOOp::ADD : rdata + wdata,
        AMOOp::XOR : rdata ^ wdata,
        AMOOp::AND : rdata &amp; wdata,
        AMOOp::OR  : rdata | wdata,
        AMOOp::MIN : <span class="hljs-keyword">if</span> lts ? wdata : rdata,
        AMOOp::MAX : <span class="hljs-keyword">if</span> !lts ? wdata : rdata,
        AMOOp::MINU: <span class="hljs-keyword">if</span> ltu ? wdata : rdata,
        AMOOp::MAXU: <span class="hljs-keyword">if</span> !ltu ? wdata : rdata,
        <span class="hljs-keyword">default</span>    : <span class="hljs-number">0</span>,
    };
}

<span class="hljs-comment">// Zaamo拡張の命令のwdataを生成する</span>
<span class="hljs-keyword">function</span> gen_amo_wdata (
    req  : <span class="hljs-keyword">modport</span> core_data_if::all_input,
    rdata: <span class="hljs-keyword">input</span>   UIntX                  ,
) -&gt; UIntX {
    <span class="hljs-keyword">case</span> req.funct3 {
        <span class="hljs-number">3&#39;b010</span>: { <span class="hljs-comment">// word</span>
            <span class="hljs-keyword">let</span> low    : <span class="hljs-keyword">logic</span>  = req.addr[<span class="hljs-number">2</span>] == <span class="hljs-number">0</span>;
            <span class="hljs-keyword">let</span> rdata32: UInt32 = <span class="hljs-keyword">if</span> low ? rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] : rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>];
            <span class="hljs-keyword">let</span> wdata32: UInt32 = <span class="hljs-keyword">if</span> low ? req.wdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] : req.wdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>];
            <span class="hljs-keyword">let</span> result : UInt32 = calc_amo::&lt;<span class="hljs-number">32</span>&gt;(req.amoop, wdata32, rdata32);
            <span class="hljs-keyword">return</span> <span class="hljs-keyword">if</span> low ? {rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>], result} : {result, rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]};
        }
        <span class="hljs-number">3&#39;b011</span> : <span class="hljs-keyword">return</span> calc_amo::&lt;<span class="hljs-number">64</span>&gt;(req.amoop, req.wdata, rdata); <span class="hljs-comment">// double</span>
        <span class="hljs-keyword">default</span>: <span class="hljs-keyword">return</span> <span class="hljs-number">0</span>;
    }
}
</code></pre></div><p>ロードした値が命令の結果になるため、 値を保持するためのレジスタを作成します ( リスト37、 リスト38 )。</p><p><span class="caption">▼リスト12.37: ロードしたデータを格納するレジスタの定義 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// amo</span>
<span class="hljs-keyword">var</span> zaamo_fetched_data: UIntX;
</code></pre></div><p><span class="caption">▼リスト12.38: レジスタのリセット (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    reserved_addr      = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">zaamo_fetched_data = <span class="hljs-number">0</span>;</span>
}
</code></pre></div><p>メモリアクセスが終了したら、ロードした値を返します (リスト39)。</p><p><span class="caption">▼リスト12.39: 命令の結果を返す (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::AMOStoreValid: {
    slave.ready  = master.rvalid;
    slave.rvalid = master.rvalid;
    slave.rdata  = zaamo_fetched_data;
}
</code></pre></div><p>状態に基づいて、メモリへのロード、ストア要求を割り当てます ( リスト40、 リスト41 )。</p><p><span class="caption">▼リスト12.40: accept_request_comb関数で、まずロード要求を行う (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">default</span>: <span class="custom-hl-bold"><span class="hljs-keyword">if</span> slave.is_Zaamo()</span> {
    <span class="custom-hl-bold">assign_master(slave.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);</span>
}
</code></pre></div><p><span class="caption">▼リスト12.41: 状態に基づいてロード、ストア要求を行う (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::AMOLoadReady                      : assign_master      (slave_saved.addr, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>, <span class="hljs-number">0</span>);
State::AMOLoadValid, State::AMOStoreReady: {
    <span class="hljs-keyword">let</span> rdata        : UIntX = <span class="hljs-keyword">if</span> state == State::AMOLoadValid ? master.rdata : zaamo_fetched_data;
    <span class="hljs-keyword">let</span> wdata        : UIntX = gen_amo_wdata(slave_saved, rdata);
    assign_master(slave_saved.addr, <span class="hljs-number">1</span>, wdata, slave_saved.wmask);
}
State::AMOStoreValid: accept_request_comb();
</code></pre></div><p><code>master</code>、<code>slave</code>の状態によって<code>state</code>を遷移します (リスト42)。</p><p><span class="caption">▼リスト12.42: accept_request_ff関数で、masterのreadyによって次のstateを決める (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">default</span>: <span class="custom-hl-bold"><span class="hljs-keyword">if</span> slave.is_Zaamo()</span> {
    <span class="custom-hl-bold">state = <span class="hljs-keyword">if</span> master.ready ? State::AMOLoadValid : State::AMOLoadReady;</span>
}
</code></pre></div><p><span class="caption">▼リスト12.43: Zaamo拡張の命令の状態の遷移 (amounit.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/12389a8f4c184b11cea6937ad1fac9fbef784abc~1..12389a8f4c184b11cea6937ad1fac9fbef784abc#diff-5a1c75bb9b272891ae9766e2adfc01dce8800d1fd4faf16cb3310afc2c1e37f6">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>State::AMOLoadReady: <span class="hljs-keyword">if</span> master.ready {
    state = State::AMOLoadValid;
}
State::AMOLoadValid: <span class="hljs-keyword">if</span> master.rvalid {
    zaamo_fetched_data = master.rdata;
    state              = <span class="hljs-keyword">if</span> slave.ready ? State::AMOStoreValid : State::AMOStoreReady;
}
State::AMOStoreReady: <span class="hljs-keyword">if</span> master.ready {
    state = State::AMOStoreValid;
}
State::AMOStoreValid: <span class="hljs-keyword">if</span> master.rvalid {
    accept_request_ff();
}
</code></pre></div><p>riscv-testsの<code>rv64ua-p-</code>から始まるテストを実行し、成功することを確認してください。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>メモリ操作の並び替えによる高速化は応用編で検討します。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li></ol></section>`,159)])])}const y=s(t,[["render",o]]);export{u as __pageData,y as default};
