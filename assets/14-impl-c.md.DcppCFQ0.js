import{_ as e,c as p,o as c,ah as l,j as s,a,bF as r,bG as d}from"./chunks/framework.HhScKIQu.js";const j=JSON.parse('{"title":"C拡張の実装","description":"","frontmatter":{},"headers":[],"relativePath":"14-impl-c.md","filePath":"14-impl-c.md"}'),t={name:"14-impl-c.md"};function o(i,n,h,f,b,m){return c(),p("div",null,[...n[0]||(n[0]=[l('<h1 id="c拡張の実装" tabindex="-1">C拡張の実装 <a class="header-anchor" href="#c拡張の実装" aria-label="Permalink to “C拡張の実装”">​</a></h1><h2 id="概要" tabindex="-1">概要 <a class="header-anchor" href="#概要" aria-label="Permalink to “概要”">​</a></h2><p>これまでに実装した命令はすべて32ビット幅のものでした。 RISC-Vには32ビット幅以外の命令が定義されており、 命令の下位ビットで何ビット幅の命令か判断できます(表1)。</p><div id="riscv.instruction-length-encoding" class="table"><p class="caption">表13.1: RISC-Vの命令長とエンコーディング</p><table><tr class="hline"><th>命令幅</th><th>命令の下位5ビット</th></tr><tr class="hline"><td>16-bit (aa≠11)</td><td>xxxaa</td></tr><tr class="hline"><td>32-bit (bbb≠111)</td><td>bbb11</td></tr></table></div> C拡張は16ビット幅の命令を定義する拡張です。 よく使われる命令の幅を16ビットに圧縮できるようにすることでコードサイズを削減できます。 これ以降、C拡張によって導入される16ビット幅の命令のことをRVC命令と呼びます。 <p>全てのRVC命令には同じ操作をする32ビット幅の命令が存在します<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><p>RVC命令は図1の9つのフォーマットが定義されています。</p><p><img src="'+r+`" alt="RVC命令のフォーマット"></p><p class="caption" style="text-align:center;font-weight:bold;">▲図1: RVC命令のフォーマット</p><p><code>rs1&#39;</code>、<code>rs2&#39;</code>、<code>rd&#39;</code>は3ビットのフィールドで、 よく使われる8番(x8)から15番(x15)のレジスタを指定します。 即値の並び方やそれぞれの命令の具体的なフォーマットについては、 仕様書か<a href="./14-impl-c.html">「13.6.2 32ビット幅の命令に変換する」</a>のコードを参照してください。</p><p>RV64IのCPUに実装されるC拡張には表2のRVC命令が定義されています。</p><div id="impl-c.instructions" class="table"><p class="caption">表13.2: C拡張の命令</p><table><tr class="hline"><th>命令</th><th>同じ意味の32ビット幅の命令</th><th>形式</th></tr><tr class="hline"><td>C.LWSP</td><td>lw rd, offset(x2)</td><td>CI</td></tr><tr class="hline"><td>C.LDSP</td><td>ld rd, offset(x2)</td><td>CI</td></tr><tr class="hline"><td>C.SWSP</td><td>sw rs2, offset(x2)</td><td>CSS</td></tr><tr class="hline"><td>C.SDSP</td><td>sd rs2, offset(x2)</td><td>CSS</td></tr><tr class="hline"><td>C.LW</td><td>lw rd, offset(rs)</td><td>CL</td></tr><tr class="hline"><td>C.LD</td><td>ld rd, offset(rs)</td><td>CL</td></tr><tr class="hline"><td>C.SW</td><td>sw rs2, offset(rs1)</td><td>CS</td></tr><tr class="hline"><td>C.SD</td><td>sd rs2, offset(rs1)</td><td>CS</td></tr><tr class="hline"><td>C.J</td><td>jal x0, offset</td><td>CJ</td></tr><tr class="hline"><td>C.JR</td><td>jalr x0, 0(rs1)</td><td>CR</td></tr><tr class="hline"><td>C.JALR</td><td>jalr x1, 0(rs1)</td><td>CR</td></tr><tr class="hline"><td>C.BEQZ</td><td>beq rs1, x0, offset</td><td>CB</td></tr><tr class="hline"><td>C.BNEZ</td><td>bne rs1, x0, offset</td><td>CB</td></tr><tr class="hline"><td>C.LI</td><td>addi rd, x0, imm</td><td>CI</td></tr><tr class="hline"><td>C.LUI</td><td>lui rd, imm</td><td>CI</td></tr><tr class="hline"><td>C.ADDI</td><td>addi rd, rd, imm</td><td>CI</td></tr><tr class="hline"><td>C.ADDIW</td><td>addiw rd, rd, imm</td><td>CI</td></tr><tr class="hline"><td>C.ADDI16SP</td><td>addi x2, x2, imm</td><td>CI</td></tr><tr class="hline"><td>C.ADDI4SPN</td><td>addi rd, x2, imm</td><td>CIW</td></tr><tr class="hline"><td>C.SLLI</td><td>slli rd, rd, shamt</td><td>CI</td></tr><tr class="hline"><td>C.SRLI</td><td>srli rd, rd, shamt</td><td>CB</td></tr><tr class="hline"><td>C.SRAI</td><td>srai rd, rd, shamt</td><td>CB</td></tr><tr class="hline"><td>C.ANDI</td><td>andi rd, rd, imm</td><td>CB</td></tr><tr class="hline"><td>C.MV</td><td>add rd, x0, rs2</td><td>CR</td></tr><tr class="hline"><td>C.ADD</td><td>add rd, rd, rs2</td><td>CR</td></tr><tr class="hline"><td>C.AND</td><td>and rd, rd, rs2</td><td>CA</td></tr><tr class="hline"><td>C.OR</td><td>or rd, rd, rs2</td><td>CA</td></tr><tr class="hline"><td>C.XOR</td><td>xor rd, rd, rs2</td><td>CA</td></tr><tr class="hline"><td>C.SUB</td><td>sub rd, rd, rs2</td><td>CA</td></tr><tr class="hline"><td>C.EBREAK</td><td>ebreak</td><td>CR</td></tr></table></div> C.ADDIW命令はRV32IのC拡張に定義されているC.JAL命令とエンコーディングが同じです。 本書で実装するモジュールはRV32IのC拡張にも対応したものになっています。 RV32IのC拡張については、仕様書か[「13.6.2 32ビット幅の命令に変換する」](14-impl-c.md)のコードを参照してください。 <p>C拡張は浮動小数点命令をサポートするF、D拡張が実装されている場合に他の命令を定義しますが、 基本編ではF、D拡張を実装しないため実装、解説しません。</p><h2 id="ialignの変更" tabindex="-1">IALIGNの変更 <a class="header-anchor" href="#ialignの変更" aria-label="Permalink to “IALIGNの変更”">​</a></h2><p><a href="./11-impl-exception.html">「10.5 命令アドレスのミスアライン例外」</a>で解説したように、 命令はIALIGNビットに整列したアドレスに配置されます。 C拡張はIALIGNによる制限を16ビットに緩め、全ての命令が16ビットに整列されたアドレスに配置されるように変更します。 これにより、RVC命令と32ビット幅の命令の組み合わせがあったとしても効果的にコードサイズを削減できます。</p><p>eeiパッケージに定数<code>IALIGN</code>を定義します (リスト1)。</p><p><span class="caption">▼リスト13.1: IALIGNの定義 (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c4832fff15ccec8fbe261ad499f314851bf8002c~1..c4832fff15ccec8fbe261ad499f314851bf8002c#diff-11470b1e7d69c89ea3723d114583fe520f6d8482422a151ad706be8ab57ea6b7">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> IALIGN: <span class="hljs-keyword">u32</span> = <span class="hljs-number">16</span>;
</code></pre></div><p>mepcレジスタの書き込みマスクを変更して、 トラップ時のジャンプ先アドレスに16ビットに整列されたアドレスを指定できるようにします (リスト2)。</p><p><span class="caption">▼リスト13.2: MEPCの書き込みマスクを変更する (eei.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c4832fff15ccec8fbe261ad499f314851bf8002c~1..c4832fff15ccec8fbe261ad499f314851bf8002c#diff-44dd9efb5b2797bbd5248f96206e5f13442629b6dd3cda87990e383f99c2aeec">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MEPC_WMASK  : UIntX = <span class="hljs-number">&#39;hffff_ffff_ffff_fff</span><span class="custom-hl-bold">e</span>;
</code></pre></div><p>命令アドレスのミスアライン例外の判定を変更します。 IALIGNが<code>16</code>の場合は例外が発生しないようにします (リスト3)。 ジャンプ、分岐命令は2バイト単位のアドレスしか指定できないため、 C拡張が実装されている場合には例外が発生しません。</p><p><span class="caption">▼リスト13.3: IALIGNが16のときに例外が発生しないようにする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/c4832fff15ccec8fbe261ad499f314851bf8002c~1..c4832fff15ccec8fbe261ad499f314851bf8002c#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> instruction_address_misaligned: <span class="hljs-keyword">logic</span> = <span class="custom-hl-bold">IALIGN == <span class="hljs-number">32</span> &amp;&amp;</span> memq_wdata.br_taken &amp;&amp; memq_wdata.jump_addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b00</span>;
</code></pre></div><h2 id="実装方針" tabindex="-1">実装方針 <a class="header-anchor" href="#実装方針" aria-label="Permalink to “実装方針”">​</a></h2><p>本章では次の順序でC拡張を実装します。</p><ol><li>命令フェッチ処理(IFステージ)をcoreモジュールから分離する</li><li>16ビットに整列されたアドレスに配置された32ビット幅の命令を処理できるようにする</li><li>RVC命令を32ビット幅の命令に変換するモジュールを作成する</li><li>RVC命令を32ビット幅の命令に変換してcoreモジュールに供給する</li></ol><p>最終的な命令フェッチ処理の構成は図図2のようになります。</p><p><img src="`+d+`" alt="命令フェッチ処理の構成"></p><p class="caption" style="text-align:center;font-weight:bold;">▲図2: 命令フェッチ処理の構成</p><h2 id="命令フェッチモジュールの実装" tabindex="-1">命令フェッチモジュールの実装 <a class="header-anchor" href="#命令フェッチモジュールの実装" aria-label="Permalink to “命令フェッチモジュールの実装”">​</a></h2><h3 id="インターフェースを作成する" tabindex="-1">インターフェースを作成する <a class="header-anchor" href="#インターフェースを作成する" aria-label="Permalink to “インターフェースを作成する”">​</a></h3><p>まず、命令フェッチを行うモジュールとcoreモジュールのインターフェースを定義します。</p><p><code>src/core_inst_if.veryl</code>を作成し、次のように記述します (リスト4)。</p><p><span class="caption">▼リスト13.4: core_inst_if.veryl</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-d3368a9ab0e78f10416dce4a6383545184b617184959e395af353b86314fb149">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">interface</span> core_inst_if {
    <span class="hljs-keyword">var</span> rvalid   : <span class="hljs-keyword">logic</span>;
    <span class="hljs-keyword">var</span> rready   : <span class="hljs-keyword">logic</span>;
    <span class="hljs-keyword">var</span> raddr    : Addr ;
    <span class="hljs-keyword">var</span> rdata    : Inst ;
    <span class="hljs-keyword">var</span> is_hazard: <span class="hljs-keyword">logic</span>;
    <span class="hljs-keyword">var</span> next_pc  : Addr ;

    <span class="hljs-keyword">modport</span> master {
        rvalid   : <span class="hljs-keyword">input</span> ,
        rready   : <span class="hljs-keyword">output</span>,
        raddr    : <span class="hljs-keyword">input</span> ,
        rdata    : <span class="hljs-keyword">input</span> ,
        is_hazard: <span class="hljs-keyword">output</span>, <span class="hljs-comment">// control hazard</span>
        next_pc  : <span class="hljs-keyword">output</span>, <span class="hljs-comment">// actual next pc</span>
    }

    <span class="hljs-keyword">modport</span> slave {
        ..<span class="hljs-keyword">converse</span>(master)
    }
}
</code></pre></div><p><code>rvalid</code>、<code>rready</code>、<code>raddr</code>、<code>rdata</code>は、 coreモジュールのFIFO(<code>if_fifo</code>)の<code>wvalid</code>、<code>wready</code>、<code>wdata.addr</code>、<code>wdata.bits</code>と同じ役割を果たします。 <code>is_hazard</code>、<code>next_pc</code>は制御ハザードの情報を伝えるための変数です。</p><h3 id="coreモジュールのifステージを削除する" tabindex="-1">coreモジュールのIFステージを削除する <a class="header-anchor" href="#coreモジュールのifステージを削除する" aria-label="Permalink to “coreモジュールのIFステージを削除する”">​</a></h3><p>coreモジュールのIFステージを削除し、 core_inst_ifインターフェースで代替します<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>。</p><p>coreモジュールの<code>i_membus</code>の型を<code>core_inst_if</code>に変更します (リスト5)。</p><p><span class="caption">▼リスト13.5: i_membusの型を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>i_membus: <span class="hljs-keyword">modport</span> <span class="custom-hl-bold">core_inst_if</span>::master,
</code></pre></div><p>IFステージ部分のコードを次のように変更します (リスト6)。</p><p><span class="caption">▼リスト13.6: IFステージの変更 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">///////////////////////////////// IF Stage /////////////////////////////////</span>

<span class="hljs-keyword">var</span> control_hazard        : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> control_hazard_pc_next: Addr ;

<span class="hljs-keyword">always_comb</span> {
    i_membus.is_hazard = control_hazard;
    i_membus.next_pc = control_hazard_pc_next;
}
</code></pre></div><p>coreモジュールの新しいIFステージ部分は、制御ハザードの情報をインターフェースに割り当てるだけの簡単なものになっています。 <code>if_fifo_type</code>型、<code>if_fifo_</code>から始まる変数は使わなくなったので削除してください。</p><p>IDステージとcore_inst_ifインターフェースを接続します (リスト7、 リスト8)。 もともと<code>if_fifo</code>の<code>rvalid</code>、<code>rready</code>、<code>rdata</code>だった部分を<code>i_membus</code>に変更しています。</p><p><span class="caption">▼リスト13.7: IDステージとi_membusを接続する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> ids_valid     : <span class="hljs-keyword">logic</span>    = <span class="custom-hl-bold">i_membus.rvalid</span>;
<span class="hljs-keyword">let</span> ids_pc        : Addr     = <span class="custom-hl-bold">i_membus.raddr</span>;
<span class="hljs-keyword">let</span> ids_inst_bits : Inst     = <span class="custom-hl-bold">i_membus.rdata</span>;
</code></pre></div><p><span class="caption">▼リスト13.8: EXステージに進められるときにrreadyを1にする (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// ID -&gt; EX</span>
    <span class="custom-hl-bold">i_membus.</span>rready = exq_wready;
    exq_wvalid      = <span class="custom-hl-bold">i_membus.</span>rvalid;
    exq_wdata.addr  = <span class="custom-hl-bold">i_membus.</span>raddr;
    exq_wdata.bits  = <span class="custom-hl-bold">i_membus.</span>rdata;
    exq_wdata.ctrl  = ids_ctrl;
    exq_wdata.imm   = ids_imm;
</code></pre></div><h3 id="inst-fetcherモジュールを作成する" tabindex="-1">inst_fetcherモジュールを作成する <a class="header-anchor" href="#inst-fetcherモジュールを作成する" aria-label="Permalink to “inst_fetcherモジュールを作成する”">​</a></h3><p>IFステージの代わりに命令フェッチをするinst_fetcherモジュールを作成します。 inst_fetcherモジュールでは命令フェッチ処理をfetch、issueの2段階で行います。</p><dl><dt>fetch</dt><dd> メモリから64ビットの値を読み込み、issueとの間のFIFOに格納する。 アドレスを\`8\`進めて、次の64ビットを読み込む。 </dd><dt>issue</dt><dd> fetchとの間のFIFOから64ビットを読み込み、 32ビットずつcoreモジュールとの間のFIFOに格納する。 </dd></dl><p>fetchとissueは並列に独立して動かします。</p><p>inst_fetcherモジュールのポートを定義します。 <code>src/inst_fetcher.veryl</code>を作成し、次のように記述します (リスト9)。</p><p><span class="caption">▼リスト13.9: ポートの定義 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> inst_fetcher (
    clk    : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>              ,
    rst    : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>              ,
    core_if: <span class="hljs-keyword">modport</span> core_inst_if::slave,
    mem_if : <span class="hljs-keyword">modport</span> Membus::master     ,
) {
</code></pre></div><p><code>core_if</code>はcoreモジュールとのインターフェース、 <code>mem_if</code>はメモリとのインターフェースです。</p><p>fetchとissue、issueとcore_ifの間のFIFOを作成します (リスト10、 リスト11)。</p><p><span class="caption">▼リスト13.10: fetchとissueを繋ぐFIFOの作成 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> fetch_fifo_type {
    addr: Addr                    ,
    bits: <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt;,
}

<span class="hljs-keyword">var</span> fetch_fifo_flush : <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> fetch_fifo_wvalid: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> fetch_fifo_wready: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> fetch_fifo_wdata : fetch_fifo_type;
<span class="hljs-keyword">var</span> fetch_fifo_rdata : fetch_fifo_type;
<span class="hljs-keyword">var</span> fetch_fifo_rready: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> fetch_fifo_rvalid: <span class="hljs-keyword">logic</span>          ;

<span class="hljs-keyword">inst</span> fetch_fifo: fifo #(
    DATA_TYPE: fetch_fifo_type,
    WIDTH    : <span class="hljs-number">3</span>              ,
) (
    clk                          ,
    rst                          ,
    flush     : fetch_fifo_flush ,
    wready    : _                ,
    wready_two: fetch_fifo_wready,
    wvalid    : fetch_fifo_wvalid,
    wdata     : fetch_fifo_wdata ,
    rready    : fetch_fifo_rready,
    rvalid    : fetch_fifo_rvalid,
    rdata     : fetch_fifo_rdata ,
);
</code></pre></div><p><span class="caption">▼リスト13.11: issueとcoreモジュールを繋ぐFIFOの作成 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> issue_fifo_type {
    addr: Addr,
    bits: Inst,
}

<span class="hljs-keyword">var</span> issue_fifo_flush : <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> issue_fifo_wvalid: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> issue_fifo_wready: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> issue_fifo_wdata : issue_fifo_type;
<span class="hljs-keyword">var</span> issue_fifo_rdata : issue_fifo_type;
<span class="hljs-keyword">var</span> issue_fifo_rready: <span class="hljs-keyword">logic</span>          ;
<span class="hljs-keyword">var</span> issue_fifo_rvalid: <span class="hljs-keyword">logic</span>          ;

<span class="hljs-keyword">inst</span> issue_fifo: fifo #(
    DATA_TYPE: issue_fifo_type,
    WIDTH    : <span class="hljs-number">3</span>              ,
) (
    clk                      ,
    rst                      ,
    flush : issue_fifo_flush ,
    wready: issue_fifo_wready,
    wvalid: issue_fifo_wvalid,
    wdata : issue_fifo_wdata ,
    rready: issue_fifo_rready,
    rvalid: issue_fifo_rvalid,
    rdata : issue_fifo_rdata ,
);
</code></pre></div><p>メモリへのアクセス処理(fetch)を実装します。 FIFOに空きがあるとき、64ビットの値を読み込んでPCを<code>8</code>進めます (リスト12、 リスト13、 リスト14)。 この処理はcoreモジュールの元のIFステージとほとんど同じです。</p><p><span class="caption">▼リスト13.12: PCと状態管理用の変数の定義 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> fetch_pc          : Addr ;
<span class="hljs-keyword">var</span> fetch_requested   : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> fetch_pc_requested: Addr ;
</code></pre></div><p><span class="caption">▼リスト13.13: メモリへの要求の割り当て (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    mem_if.valid = <span class="hljs-number">0</span>;
    mem_if.addr  = <span class="hljs-number">0</span>;
    mem_if.wen   = <span class="hljs-number">0</span>;
    mem_if.wdata = <span class="hljs-number">0</span>;
    mem_if.wmask = <span class="hljs-number">0</span>;
    <span class="hljs-keyword">if</span> !core_if.is_hazard {
        mem_if.valid = fetch_fifo_wready;
        <span class="hljs-keyword">if</span> fetch_requested {
            mem_if.valid = mem_if.valid &amp;&amp; mem_if.rvalid;
        }
        mem_if.addr = fetch_pc;
    }
}
</code></pre></div><p><span class="caption">▼リスト13.14: PC、状態の更新 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        fetch_pc           = INITIAL_PC;
        fetch_requested    = <span class="hljs-number">0</span>;
        fetch_pc_requested = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> core_if.is_hazard {
            fetch_pc           = {core_if.next_pc[XLEN - <span class="hljs-number">1</span>:<span class="hljs-number">3</span>], <span class="hljs-number">3&#39;b0</span>};
            fetch_requested    = <span class="hljs-number">0</span>;
            fetch_pc_requested = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">if</span> fetch_requested {
                <span class="hljs-keyword">if</span> mem_if.rvalid {
                    fetch_requested = mem_if.ready &amp;&amp; mem_if.valid;
                    <span class="hljs-keyword">if</span> mem_if.ready &amp;&amp; mem_if.valid {
                        fetch_pc_requested =  fetch_pc;
                        fetch_pc           += <span class="hljs-number">8</span>;
                    }
                }
            } <span class="hljs-keyword">else</span> {
                <span class="hljs-keyword">if</span> mem_if.ready &amp;&amp; mem_if.valid {
                    fetch_requested    =  <span class="hljs-number">1</span>;
                    fetch_pc_requested =  fetch_pc;
                    fetch_pc           += <span class="hljs-number">8</span>;
                }
            }
        }
    }
}
</code></pre></div><p>メモリから読み込んだ値をissueとの間のFIFOに格納します (リスト15)。</p><p><span class="caption">▼リスト13.15: ロードした64ビットの値をFIFOに格納する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// memory -&gt; fetch_fifo</span>
<span class="hljs-keyword">always_comb</span> {
    fetch_fifo_flush      = core_if.is_hazard;
    fetch_fifo_wvalid     = fetch_requested &amp;&amp; mem_if.rvalid;
    fetch_fifo_wdata.addr = fetch_pc_requested;
    fetch_fifo_wdata.bits = mem_if.rdata;
}
</code></pre></div><p>coreモジュールに命令を供給する処理(issue)を実装します。 FIFOにデータが入っているとき、32ビットずつcoreモジュールとの間のFIFOに格納します。 2つの32ビットの命令をFIFOに格納出来たら、fetchとの間のFIFOを読み進めます (リスト16、 リスト17)。</p><p><span class="caption">▼リスト13.16: オフセットの更新 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> issue_pc_offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;;

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        issue_pc_offset = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> core_if.is_hazard {
            issue_pc_offset = core_if.next_pc[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>];
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">if</span> issue_fifo_wready {
                <span class="hljs-keyword">if</span> issue_fifo_wvalid {
                    issue_pc_offset += <span class="hljs-number">4</span>;
                }
            }
        }
    }
}
</code></pre></div><p><span class="caption">▼リスト13.17: issue_fifoに32ビットずつ命令を格納する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// fetch_fifo &lt;-&gt; issue_fifo</span>
<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-keyword">let</span> raddr : Addr                     = fetch_fifo_rdata.addr;
    <span class="hljs-keyword">let</span> rdata : <span class="hljs-keyword">logic</span>&lt;MEMBUS_DATA_WIDTH&gt; = fetch_fifo_rdata.bits;
    <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;                 = issue_pc_offset;

    fetch_fifo_rready = <span class="hljs-number">0</span>;
    issue_fifo_wvalid = <span class="hljs-number">0</span>;
    issue_fifo_wdata  = <span class="hljs-number">0</span>;

    <span class="hljs-keyword">if</span> !core_if.is_hazard &amp;&amp; fetch_fifo_rvalid {
        fetch_fifo_rready     = issue_fifo_wready &amp;&amp; offset == <span class="hljs-number">4</span>;
        issue_fifo_wvalid     = <span class="hljs-number">1</span>;
        issue_fifo_wdata.addr = {raddr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
        issue_fifo_wdata.bits = <span class="hljs-keyword">case</span> offset {
            <span class="hljs-number">0</span>      : rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>],
            <span class="hljs-number">4</span>      : rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>],
            <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
        };
    }
}
</code></pre></div><p><code>core_if</code>とFIFOを接続します (リスト18)。</p><p><span class="caption">▼リスト13.18: issue_fifoとインターフェースを接続する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// issue_fifo &lt;-&gt; core</span>
<span class="hljs-keyword">always_comb</span> {
    issue_fifo_flush  = core_if.is_hazard;
    issue_fifo_rready = core_if.rready;
    core_if.rvalid    = issue_fifo_rvalid;
    core_if.raddr     = issue_fifo_rdata.addr;
    core_if.rdata     = issue_fifo_rdata.bits;
}
</code></pre></div><h3 id="inst-fetcherモジュールとcoreモジュールを接続する" tabindex="-1">inst_fetcherモジュールとcoreモジュールを接続する <a class="header-anchor" href="#inst-fetcherモジュールとcoreモジュールを接続する" aria-label="Permalink to “inst_fetcherモジュールとcoreモジュールを接続する”">​</a></h3><p>topモジュールで、core_inst_ifをインスタンス化します。 (リスト19)。</p><p><span class="caption">▼リスト13.19: インターフェースの定義 (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> i_membus_core: core_inst_if;
</code></pre></div><p>inst_fetcherモジュールをインスタンス化し、coreモジュールと接続します ( リスト20、 リスト21 )。</p><p><span class="caption">▼リスト13.20: inst_fetcherモジュールのインスタンス化 (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> fetcher: inst_fetcher (
    clk                   ,
    rst                   ,
    core_if: i_membus_core,
    mem_if : i_membus     ,
);
</code></pre></div><p><span class="caption">▼リスト13.21: インターフェースを変更する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk                    ,
    rst                    ,
    <span class="custom-hl-bold">i_membus: i_membus_core,</span>
    d_membus: d_membus_core,
    led                    ,
);
</code></pre></div><p>inst_fetcherモジュールが64ビットのデータを32ビットの命令の列に変換してくれるようになったので、 <code>d_membus</code>との調停のところで32ビットずつ選択する必要がなくなりました。 そのため、<code>rdata</code>をそのまま割り当てて、<code>memarb_last_iaddr</code>変数とビットの選択処理を削除します (リスト22、 リスト23、 リスト24)。</p><p><span class="caption">▼リスト13.22: 使用しない変数を削除する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> memarb_last_i: <span class="hljs-keyword">logic</span>;
<span class="custom-hl-del"><span class="hljs-keyword">var</span> memarb_last_iaddr: Addr;</span>
</code></pre></div><p><span class="caption">▼リスト13.23: 使用しない変数を削除する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        memarb_last_i = <span class="hljs-number">0</span>;
        <span class="custom-hl-del">memarb_last_i = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> mmio_membus.ready {
            memarb_last_i = !d_membus.valid;
            <span class="custom-hl-del">memarb_last_iaddr = i_membus.addr;</span>
        }
    }
}
</code></pre></div><p><span class="caption">▼リスト13.24: ビットの選択処理を削除する (top.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/53df80ee13788fec41966dc3487a4bd159dc6c29~1..53df80ee13788fec41966dc3487a4bd159dc6c29#diff-0c548fd82f89bdf97edffcd89dfccd2aab836eccf57f11b8e25c313abd0d0e6f">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    i_membus.ready  = mmio_membus.ready &amp;&amp; !d_membus.valid;
    i_membus.rvalid = mmio_membus.rvalid &amp;&amp; memarb_last_i;
    i_membus.rdata  = <span class="custom-hl-bold">mmio_membus.rdata</span>;
</code></pre></div><h2 id="_16ビット境界に配置された32ビット幅の命令のサポート" tabindex="-1">16ビット境界に配置された32ビット幅の命令のサポート <a class="header-anchor" href="#_16ビット境界に配置された32ビット幅の命令のサポート" aria-label="Permalink to “16ビット境界に配置された32ビット幅の命令のサポート”">​</a></h2><p>inst_fetcherモジュールで、アドレスが2バイトの倍数の32ビット幅の命令をcoreモジュールに供給できるようにします。</p><p>アドレスの下位3ビット(<code>issue_pc_offset</code>)が<code>6</code>の場合、 issueとcoreの間に供給する命令のビット列は<code>fetch_fifo_rdata</code>の上位16ビットと<code>fetch_fifo</code>に格納されている次のデータの下位16ビットを結合したものになります。 このとき、<code>fetch_fifo_rdata</code>のデータの下位16ビットとアドレスを保存して、次のデータを読み出します。 <code>fetch_fifo</code>から次のデータを読み出せたら、保存していたデータと結合し、アドレスとともに<code>issue_fifo</code>に書き込みます。 <code>issue_pc_offset</code>が<code>0</code>、<code>2</code>、<code>4</code>の場合、既存の処理との変更点はありません。</p><p><code>fetch_fifo_rdata</code>のデータの下位16ビットとアドレスを保持する変数を作成します (リスト25)。</p><p><span class="caption">▼リスト13.25: データを一時保存するための変数の定義 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/091bb90a124a71a432e4c2afffc731d1c138b324~1..091bb90a124a71a432e4c2afffc731d1c138b324#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> issue_is_rdata_saved: <span class="hljs-keyword">logic</span>    ;
<span class="hljs-keyword">var</span> issue_saved_addr    : Addr     ;
<span class="hljs-keyword">var</span> issue_saved_bits    : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">16</span>&gt;; <span class="hljs-comment">// rdata[63:48]</span>
</code></pre></div><p><code>issue_pc_offset</code>が<code>6</code>のとき、変数にデータを保存します (リスト26)。</p><p><span class="caption">▼リスト13.26: offsetが6のとき、変数に命令の下位16ビットとアドレスを保存する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/091bb90a124a71a432e4c2afffc731d1c138b324~1..091bb90a124a71a432e4c2afffc731d1c138b324#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        issue_pc_offset      = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">issue_is_rdata_saved = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">issue_saved_addr     = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">issue_saved_bits     = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> core_if.is_hazard {
            issue_pc_offset      = core_if.next_pc[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>];
            <span class="custom-hl-bold">issue_is_rdata_saved = <span class="hljs-number">0</span>;</span>
        } <span class="hljs-keyword">else</span> {
            <span class="custom-hl-bold"><span class="hljs-comment">// offsetが6な32ビット命令の場合、</span></span>
            <span class="custom-hl-bold"><span class="hljs-comment">// アドレスと上位16ビットを保存してFIFOを読み進める</span></span>
            <span class="custom-hl-bold"><span class="hljs-keyword">if</span> issue_pc_offset == <span class="hljs-number">6</span> &amp;&amp; !issue_is_rdata_saved {</span>
            <span class="custom-hl-bold">    <span class="hljs-keyword">if</span> fetch_fifo_rvalid {</span>
            <span class="custom-hl-bold">        issue_is_rdata_saved = <span class="hljs-number">1</span>;</span>
            <span class="custom-hl-bold">        issue_saved_addr     = fetch_fifo_rdata.addr;</span>
            <span class="custom-hl-bold">        issue_saved_bits     = fetch_fifo_rdata.bits[<span class="hljs-number">63</span>:<span class="hljs-number">48</span>];</span>
            <span class="custom-hl-bold">    }</span>
            <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
                <span class="hljs-keyword">if</span> issue_fifo_wready &amp;&amp; issue_fifo_wvalid {
                    issue_pc_offset      += <span class="hljs-number">4</span>;
                    <span class="custom-hl-bold">issue_is_rdata_saved =  <span class="hljs-number">0</span>;</span>
                }
            <span class="custom-hl-bold">}</span>
        }
    }
}
</code></pre></div><p><code>issue_pc_offset</code>が<code>2</code>、<code>6</code>の場合の<code>issue_fifo</code>への書き込みを実装します (リスト27)。 <code>6</code>の場合、保存していた16ビットと新しく読み出した16ビットを結合した値、保存していたアドレスを書き込みます。</p><p><span class="caption">▼リスト13.27: issue_fifoにoffsetが2、6の命令を格納する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/091bb90a124a71a432e4c2afffc731d1c138b324~1..091bb90a124a71a432e4c2afffc731d1c138b324#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> !core_if.is_hazard &amp;&amp; fetch_fifo_rvalid {
    <span class="custom-hl-bold"><span class="hljs-keyword">if</span> offset == <span class="hljs-number">6</span> {</span>
    <span class="custom-hl-bold">    <span class="hljs-comment">// offsetが6な32ビット命令の場合、</span></span>
    <span class="custom-hl-bold">    <span class="hljs-comment">// 命令は{rdata_next[15:0], rdata[63:48}になる</span></span>
    <span class="custom-hl-bold">    <span class="hljs-keyword">if</span> issue_is_rdata_saved {</span>
    <span class="custom-hl-bold">        issue_fifo_wvalid     = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">        issue_fifo_wdata.addr = {issue_saved_addr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};</span>
    <span class="custom-hl-bold">        issue_fifo_wdata.bits = {rdata[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>], issue_saved_bits};</span>
    <span class="custom-hl-bold">    } <span class="hljs-keyword">else</span> {</span>
    <span class="custom-hl-bold">        <span class="hljs-comment">// Read next 8 bytes</span></span>
    <span class="custom-hl-bold">        fetch_fifo_rready = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">    }</span>
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
        fetch_fifo_rready     = issue_fifo_wready &amp;&amp; offset == <span class="hljs-number">4</span>;
        issue_fifo_wvalid     = <span class="hljs-number">1</span>;
        issue_fifo_wdata.addr = {raddr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
        issue_fifo_wdata.bits = <span class="hljs-keyword">case</span> offset {
            <span class="hljs-number">0</span>      : rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>],
            <span class="custom-hl-bold"><span class="hljs-number">2</span>      : rdata[<span class="hljs-number">47</span>:<span class="hljs-number">16</span>],</span>
            <span class="hljs-number">4</span>      : rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>],
            <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
        };
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><p>32ビット幅の命令の下位16ビットが既に保存されている(<code>issue_is_rdata_saved</code>が<code>1</code>)とき、 <code>fetch_fifo</code>から供給されるデータには、 32ビット幅の命令の上位16ビットを除いた残りの48ビットが含まれているので <code>fetch_fifo_rready</code>を<code>1</code>に設定しないことに注意してください。</p><h2 id="rvc命令の変換" tabindex="-1">RVC命令の変換 <a class="header-anchor" href="#rvc命令の変換" aria-label="Permalink to “RVC命令の変換”">​</a></h2><h3 id="rvc命令フラグの実装" tabindex="-1">RVC命令フラグの実装 <a class="header-anchor" href="#rvc命令フラグの実装" aria-label="Permalink to “RVC命令フラグの実装”">​</a></h3><p>RVC命令を32ビット幅の命令に変換するモジュールを作る前に、 RVC命令かどうかを示すフラグを作成します。</p><p>まず、<code>core_inst_if</code>インターフェースと<code>InstCtrl</code>構造体に<code>is_rvc</code>フラグを追加します (リスト28、 リスト29、 リスト30)。</p><p><span class="caption">▼リスト13.28: is_rvcフラグの定義 (core_inst_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-d3368a9ab0e78f10416dce4a6383545184b617184959e395af353b86314fb149">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> rdata    : Inst ;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> is_rvc   : <span class="hljs-keyword">logic</span>;</span>
<span class="hljs-keyword">var</span> is_hazard: <span class="hljs-keyword">logic</span>;
</code></pre></div><p><span class="caption">▼リスト13.29: modportにis_rvcを追加する (core_inst_if.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-d3368a9ab0e78f10416dce4a6383545184b617184959e395af353b86314fb149">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">modport</span> master {
    rvalid   : <span class="hljs-keyword">input</span> ,
    rready   : <span class="hljs-keyword">output</span>,
    raddr    : <span class="hljs-keyword">input</span> ,
    rdata    : <span class="hljs-keyword">input</span> ,
    <span class="custom-hl-bold">is_rvc   : <span class="hljs-keyword">input</span> ,</span>
    is_hazard: <span class="hljs-keyword">output</span>, <span class="hljs-comment">// control hazard</span>
    next_pc  : <span class="hljs-keyword">output</span>, <span class="hljs-comment">// actual next pc</span>
}
</code></pre></div><p><span class="caption">▼リスト13.30: InstCtrl型にis_rvcフラグを追加する (corectrl.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-6e03bfb8e3afdba1e0b88b561d8b8e5e4f2a7ffc6c4efb228c5797053b78742c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>is_amo   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// AMO instruction</span>
<span class="custom-hl-bold">is_rvc   : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// RVC instruction</span></span>
funct3   : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
</code></pre></div><p>inst_fetcherモジュールで、<code>is_rvc</code>を<code>0</code>に設定してcoreモジュールに供給します (リスト31、 リスト32、 リスト33)。</p><p><span class="caption">▼リスト13.31: issue_fifo_type型にis_rvcフラグを追加する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> issue_fifo_type {
    addr  : Addr ,
    bits  : Inst ,
    <span class="custom-hl-bold">is_rvc: <span class="hljs-keyword">logic</span>,</span>
}
</code></pre></div><p><span class="caption">▼リスト13.32: is_rvcフラグを0に設定する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p>`,126),s("div",{class:"language-veryl"},[s("button",{title:"Copy Code",class:"copy"}),s("span",{class:"lang"},"veryl"),s("pre",{class:"hljs"},[s("code",null,[s("span",{class:"hljs-keyword"},"if"),a(" offset == "),s("span",{class:"hljs-number"},"6"),a(` {
    `),s("span",{class:"hljs-comment"},"// offsetが6な32ビット命令の場合、"),a(`
    `),s("span",{class:"hljs-comment"},"// 命令は{rdata_next[15:0], rdata[63:48}になる"),a(`
    `),s("span",{class:"hljs-keyword"},"if"),a(` issue_is_rdata_saved {
        issue_fifo_wvalid       = `),s("span",{class:"hljs-number"},"1"),a(`;
        issue_fifo_wdata.addr   = {issue_saved_addr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
        issue_fifo_wdata.bits   = {rdata[`),s("span",{class:"hljs-number"},"15"),a(":"),s("span",{class:"hljs-number"},"0"),a(`], issue_saved_bits};
        `),s("span",{class:"custom-hl-bold"},[a("issue_fifo_wdata.is_rvc = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
    } `),s("span",{class:"hljs-keyword"},"else"),a(` {
        `),s("span",{class:"hljs-comment"},"// Read next 8 bytes"),a(`
        fetch_fifo_rready = `),s("span",{class:"hljs-number"},"1"),a(`;
    }
`),s("span",{class:"foldable-code"},[s("span",{class:"fold-trigger",onclick:"this.parentElement.classList.add('expanded')"}),s("span",{class:"fold-content"},[a("} "),s("span",{class:"hljs-keyword"},"else"),a(` {
    fetch_fifo_rready     = issue_fifo_wready && offset == `),s("span",{class:"hljs-number"},"4"),a(`;
    issue_fifo_wvalid     = `),s("span",{class:"hljs-number"},"1"),a(`;
    issue_fifo_wdata.addr = {raddr[`),s("span",{class:"hljs-keyword"},"msb"),a(":"),s("span",{class:"hljs-number"},"3"),a(`], offset};
    issue_fifo_wdata.bits = `),s("span",{class:"hljs-keyword"},"case"),a(` offset {
        `),s("span",{class:"hljs-number"},"0"),a("      : rdata["),s("span",{class:"hljs-number"},"31"),a(":"),s("span",{class:"hljs-number"},"0"),a(`],
`)])]),a("        "),s("span",{class:"hljs-number"},"2"),a("      : rdata["),s("span",{class:"hljs-number"},"47"),a(":"),s("span",{class:"hljs-number"},"16"),a(`],
        `),s("span",{class:"hljs-number"},"4"),a("      : rdata["),s("span",{class:"hljs-number"},"63"),a(":"),s("span",{class:"hljs-number"},"32"),a(`],
        `),s("span",{class:"hljs-keyword"},"default"),a(": "),s("span",{class:"hljs-number"},"0"),a(`,
    };
    `),s("span",{class:"custom-hl-bold"},[a("issue_fifo_wdata.is_rvc = "),s("span",{class:"hljs-number"},"0"),a(";")]),a(`
}
`)])])],-1),l(`<p><span class="caption">▼リスト13.33: is_rvcフラグを接続する (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    issue_fifo_flush  = core_if.is_hazard;
    issue_fifo_rready = core_if.rready;
    core_if.rvalid    = issue_fifo_rvalid;
    core_if.raddr     = issue_fifo_rdata.addr;
    core_if.rdata     = issue_fifo_rdata.bits;
    <span class="custom-hl-bold">core_if.is_rvc    = issue_fifo_rdata.is_rvc;</span>
}
</code></pre></div><p>inst_decoderモジュールで、<code>InstCtrl</code>構造体の<code>is_rvc</code>フラグを設定します (リスト34、 リスト35、 リスト36)。 また、C拡張が無効なのにRVC命令が供給されたら<code>valid</code>フラグを<code>0</code>に設定します。</p><p><span class="caption">▼リスト13.34: is_rvcフラグをポートに追加する (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> inst_decoder (
    bits  : <span class="hljs-keyword">input</span>  Inst    ,
    <span class="custom-hl-bold">is_rvc: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>   ,</span>
    valid : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   ,
    ctrl  : <span class="hljs-keyword">output</span> InstCtrl,
    imm   : <span class="hljs-keyword">output</span> UIntX   ,
) {
</code></pre></div><p><span class="caption">▼リスト13.35: InstCtrlにis_rvcフラグを設定する (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>        <span class="hljs-keyword">default</span>: {
            InstType::X, F, F, F, F, F, F, F, F, F
        },
    }, <span class="custom-hl-bold">is_rvc,</span> f3, f7
};
</code></pre></div><p><span class="caption">▼リスト13.36: IALIGNが32ではないとき、不正な命令にする (inst_decoder.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-0520643107a80d7dcd5de7ffc77443b16b7089aa9e14564e8201c524e6d0eec8">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>    OP_AMO     : f3 == <span class="hljs-number">3&#39;b010</span> || f3 == <span class="hljs-number">3&#39;b011</span>, <span class="hljs-comment">// AMO</span>
    <span class="hljs-keyword">default</span>    : F,
} <span class="custom-hl-bold">&amp;&amp; (IALIGN == <span class="hljs-number">16</span> || !is_rvc)</span>; <span class="custom-hl-bold"><span class="hljs-comment">// IALIGN == 32のとき、C拡張は無効</span></span>
</code></pre></div><p>coreモジュールで、inst_decoderモジュールに<code>is_rvc</code>フラグを渡します (リスト37)。</p><p><span class="caption">▼リスト13.37: is_rvcフラグをinst_decoderに渡す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> decoder: inst_decoder (
    bits  : ids_inst_bits  ,
    <span class="custom-hl-bold">is_rvc: i_membus.is_rvc,</span>
    valid : ids_inst_valid ,
    ctrl  : ids_ctrl       ,
    imm   : ids_imm        ,
);
</code></pre></div><p>ジャンプ命令でライトバックする値は次の命令のアドレスであるため、 RVC命令の場合はPCに<code>2</code>を足した値を設定します (リスト38)。</p><p><span class="caption">▼リスト13.38: 次の命令のアドレスを変える (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/77e32fb3492604446df11fbb1c13a49fd661e108~1..77e32fb3492604446df11fbb1c13a49fd661e108#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> wbs_wb_data: UIntX    = <span class="hljs-keyword">switch</span> {
    wbs_ctrl.is_lui                    : wbs_imm,
    wbs_ctrl.is_jump                   : wbs_pc + <span class="custom-hl-bold">(<span class="hljs-keyword">if</span> wbs_ctrl.is_rvc ? <span class="hljs-number">2</span> : </span><span class="hljs-number">4</span><span class="custom-hl-bold">)</span>,
    wbs_ctrl.is_load || wbs_ctrl.is_amo: wbq_rdata.mem_rdata,
    wbs_ctrl.is_csr                    : wbq_rdata.csr_rdata,
    <span class="hljs-keyword">default</span>                            : wbq_rdata.alu_result
};
</code></pre></div><h3 id="_32ビット幅の命令に変換する" tabindex="-1">32ビット幅の命令に変換する <a class="header-anchor" href="#_32ビット幅の命令に変換する" aria-label="Permalink to “32ビット幅の命令に変換する”">​</a></h3><p>RVC命令のopcode、functなどのフィールドを読んで、 32ビット幅の命令を生成するrvc_converterモジュールを実装します。</p><p>その前に、命令のフィールドを引数に32ビット幅の命令を生成する関数を実装します。 <code>src/inst_gen_pkg.veryl</code>を作成し、次のように記述します (リスト39)。 関数の名前は基本的に命令名と同じにしていますが、 Verylのキーワードと被るものは<code>inst_</code>をprefixにしています。</p><p><span class="caption">▼リスト13.39: 命令のビット列を生成する関数を定義する (inst_gen_pkg.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">package</span> inst_gen_pkg {
    <span class="hljs-keyword">function</span> add (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0000000</span>, rs2, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP};
    }

    <span class="hljs-keyword">function</span> addw (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0000000</span>, rs2, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP_32};
    }

    <span class="hljs-keyword">function</span> addi (rd : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; , rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; , imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP_IMM};
    }

    <span class="hljs-keyword">function</span> addiw (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; ,rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP_IMM_32};
    }

    <span class="hljs-keyword">function</span> sub (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;,rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0100000</span>, rs2, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP};
    }

    <span class="hljs-keyword">function</span> subw (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0100000</span>, rs2, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_OP_32};
    }

    <span class="hljs-keyword">function</span> inst_xor (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0000000</span>, rs2, rs1, <span class="hljs-number">3&#39;b100</span>, rd, OP_OP};
    }

    <span class="hljs-keyword">function</span> inst_or (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0000000</span>, rs2, rs1, <span class="hljs-number">3&#39;b110</span>, rd, OP_OP};
    }

    <span class="hljs-keyword">function</span> inst_and (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">7&#39;b0000000</span>, rs2, rs1, <span class="hljs-number">3&#39;b111</span>, rd, OP_OP};
    }

    <span class="hljs-keyword">function</span> andi (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; , rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rs1, <span class="hljs-number">3&#39;b111</span>, rd, OP_OP_IMM};
    }

    <span class="hljs-keyword">function</span> slli (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, shamt: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">6&#39;b000000</span>, shamt, rs1, <span class="hljs-number">3&#39;b001</span>, rd, OP_OP_IMM};
    }

    <span class="hljs-keyword">function</span> srli (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, shamt: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">6&#39;b000000</span>, shamt, rs1, <span class="hljs-number">3&#39;b101</span>, rd, OP_OP_IMM};
    }

    <span class="hljs-keyword">function</span> srai (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, shamt: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {<span class="hljs-number">6&#39;b010000</span>, shamt, rs1, <span class="hljs-number">3&#39;b101</span>, rd, OP_OP_IMM};
    }

    <span class="hljs-keyword">function</span> lui (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">20</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rd, OP_LUI};
    }

    <span class="hljs-keyword">function</span> load (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; ,rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;, funct3: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rs1, funct3, rd, OP_LOAD};
    }

    <span class="hljs-keyword">function</span> store (rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;, funct3: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm[<span class="hljs-number">11</span>:<span class="hljs-number">5</span>], rs2, rs1, funct3, imm[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>], OP_STORE};
    }

    <span class="hljs-keyword">function</span> jal (rd : <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">20</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm[<span class="hljs-number">19</span>], imm[<span class="hljs-number">9</span>:<span class="hljs-number">0</span>], imm[<span class="hljs-number">10</span>], imm[<span class="hljs-number">18</span>:<span class="hljs-number">11</span>], rd, OP_JAL};
    }

    <span class="hljs-keyword">function</span> jalr (rd: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm, rs1, <span class="hljs-number">3&#39;b000</span>, rd, OP_JALR};
    }

    <span class="hljs-keyword">function</span> beq (rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm[<span class="hljs-number">11</span>], imm[<span class="hljs-number">9</span>:<span class="hljs-number">4</span>], rs2, rs1, <span class="hljs-number">3&#39;b000</span>, imm[<span class="hljs-number">3</span>:<span class="hljs-number">0</span>], imm[<span class="hljs-number">10</span>], OP_BRANCH};
    }

    <span class="hljs-keyword">function</span> bne (rs1: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, rs2: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt;, imm: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt;) -&gt; Inst {
        <span class="hljs-keyword">return</span> {imm[<span class="hljs-number">11</span>], imm[<span class="hljs-number">9</span>:<span class="hljs-number">4</span>], rs2, rs1, <span class="hljs-number">3&#39;b001</span>, imm[<span class="hljs-number">3</span>:<span class="hljs-number">0</span>], imm[<span class="hljs-number">10</span>], OP_BRANCH};
    }

    <span class="hljs-keyword">function</span> ebreak () -&gt; Inst {
        <span class="hljs-keyword">return</span> <span class="hljs-number">32&#39;h00100073</span>;
    }
}
</code></pre></div><p>rvc_conveterモジュールのポートを定義します。 <code>src/rvc_converter.veryl</code>を作成し、次のように記述します (リスト40)。</p><p><span class="caption">▼リスト13.40: ポートの定義 (rvc_converter.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6be9c4012aad1c763d3ecf0967de694dd7c9324ba05422733b3a84c8a811a97c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> inst_gen_pkg::*;

<span class="hljs-keyword">module</span> rvc_converter (
    inst16: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">16</span>&gt;,
    is_rvc: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>    ,
    inst32: <span class="hljs-keyword">output</span> Inst     , <span class="hljs-comment">// expanded inst16</span>
) {
</code></pre></div><p>rvc_converterモジュールは、<code>inst16</code>で16ビットの値を受け取り、 それがRVC命令なら<code>is_rvc</code>を<code>1</code>にして、 <code>inst32</code>に同じ意味の32ビット幅の命令を出力する組み合わせ回路です。</p><p><code>inst16</code>からソースレジスタ番号を生成します (リスト41)。 <code>rs1d</code>、<code>rs2d</code>の番号の範囲は<code>x8</code>から<code>x15</code>です。</p><p><span class="caption">▼リスト13.41: レジスタ番号の生成 (rvc_converter.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6be9c4012aad1c763d3ecf0967de694dd7c9324ba05422733b3a84c8a811a97c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> rs1 : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst16[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
<span class="hljs-keyword">let</span> rs2 : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst16[<span class="hljs-number">6</span>:<span class="hljs-number">2</span>];
<span class="hljs-keyword">let</span> rs1d: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = {<span class="hljs-number">2&#39;b01</span>, inst16[<span class="hljs-number">9</span>:<span class="hljs-number">7</span>]};
<span class="hljs-keyword">let</span> rs2d: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = {<span class="hljs-number">2&#39;b01</span>, inst16[<span class="hljs-number">4</span>:<span class="hljs-number">2</span>]};
</code></pre></div><p><code>inst16</code>から即値を生成します (リスト42)。</p><p><span class="caption">▼リスト13.42: 即値の生成 (rvc_converter.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6be9c4012aad1c763d3ecf0967de694dd7c9324ba05422733b3a84c8a811a97c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> imm_i    : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {inst16[<span class="hljs-number">12</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">7</span>, inst16[<span class="hljs-number">6</span>:<span class="hljs-number">2</span>]};
<span class="hljs-keyword">let</span> imm_shamt: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt;  = {inst16[<span class="hljs-number">12</span>], inst16[<span class="hljs-number">6</span>:<span class="hljs-number">2</span>]};
<span class="hljs-keyword">let</span> imm_j    : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">20</span>&gt; = {inst16[<span class="hljs-number">12</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">10</span>, inst16[<span class="hljs-number">8</span>], inst16[<span class="hljs-number">10</span>:<span class="hljs-number">9</span>], inst16[<span class="hljs-number">6</span>], inst16[<span class="hljs-number">7</span>], inst16[<span class="hljs-number">2</span>], inst16[<span class="hljs-number">11</span>], inst16[<span class="hljs-number">5</span>:<span class="hljs-number">3</span>]};
<span class="hljs-keyword">let</span> imm_br   : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {inst16[<span class="hljs-number">12</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">5</span>, inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>], inst16[<span class="hljs-number">2</span>], inst16[<span class="hljs-number">11</span>:<span class="hljs-number">10</span>], inst16[<span class="hljs-number">4</span>:<span class="hljs-number">3</span>]};
<span class="hljs-keyword">let</span> c0_mem_w : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {<span class="hljs-number">5&#39;b0</span>, inst16[<span class="hljs-number">5</span>], inst16[<span class="hljs-number">12</span>:<span class="hljs-number">10</span>], inst16[<span class="hljs-number">6</span>], <span class="hljs-number">2&#39;b0</span>}; <span class="hljs-comment">// C.LW, C.SW</span>
<span class="hljs-keyword">let</span> c0_mem_d : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {<span class="hljs-number">4&#39;b0</span>, inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>], inst16[<span class="hljs-number">12</span>:<span class="hljs-number">10</span>], <span class="hljs-number">3&#39;b0</span>}; <span class="hljs-comment">// C.LD, C.SD</span>
</code></pre></div><p><code>inst16</code>から32ビット幅の命令を生成します (リスト43)。 opcode(<code>inst16[1:0]</code>)が<code>2&#39;b11</code>以外なら16ビット幅の命令なので、 <code>is_rvc</code>に<code>1</code>を割り当てます。 <code>inst32</code>には、初期値として右に<code>inst16</code>を詰めてゼロで拡張した値を割り当てます。</p><p>32ビット幅の命令への変換はopcode、funct、レジスタ番号などで分岐して地道に実装します。 32ビット幅の命令に変換できないとき<code>inst32</code>の値を更新しません。</p><p><code>inst16</code>が不正なRVC命令のとき、 inst_decoderモジュールでデコードできない命令をcoreモジュールに供給してIllegal instruction例外を発生させ、 tvalに16ビット幅の不正な命令が設定されます。</p><p><span class="caption">▼リスト13.43: RVC命令を32ビット幅の命令に変換する (rvc_converter.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6be9c4012aad1c763d3ecf0967de694dd7c9324ba05422733b3a84c8a811a97c">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    is_rvc = inst16[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">2&#39;b11</span>;
    inst32 = {<span class="hljs-number">16&#39;b0</span>, inst16};

    <span class="hljs-keyword">let</span> funct3: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt; = inst16[<span class="hljs-number">15</span>:<span class="hljs-number">13</span>];
    <span class="hljs-keyword">case</span> inst16[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] { <span class="hljs-comment">// opcode</span>
        <span class="hljs-number">2&#39;b00</span>: <span class="hljs-keyword">case</span> funct3 { <span class="hljs-comment">// C0</span>
            <span class="hljs-number">3&#39;b000</span>: <span class="hljs-keyword">if</span> inst16 != <span class="hljs-number">0</span> { <span class="hljs-comment">// C.ADDI4SPN</span>
                <span class="hljs-keyword">let</span> nzuimm: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">10</span>&gt; = {inst16[<span class="hljs-number">10</span>:<span class="hljs-number">7</span>], inst16[<span class="hljs-number">12</span>:<span class="hljs-number">11</span>], inst16[<span class="hljs-number">5</span>], inst16[<span class="hljs-number">6</span>], <span class="hljs-number">2&#39;b0</span>};
                inst32 = addi(rs2d, <span class="hljs-number">2</span>, {<span class="hljs-number">2&#39;b0</span>, nzuimm});
            }
            <span class="hljs-number">3&#39;b010</span>: inst32 = load(rs2d, rs1d, c0_mem_w, <span class="hljs-number">3&#39;b010</span>); <span class="hljs-comment">// C.LW</span>
            <span class="hljs-number">3&#39;b011</span>: <span class="hljs-keyword">if</span> XLEN &gt;= <span class="hljs-number">64</span> { <span class="hljs-comment">// C.LD</span>
                inst32 = load(rs2d, rs1d, c0_mem_d, <span class="hljs-number">3&#39;b011</span>);
            }
            <span class="hljs-number">3&#39;b110</span>: inst32 = store(rs1d, rs2d, c0_mem_w, <span class="hljs-number">3&#39;b010</span>); <span class="hljs-comment">// C.SW</span>
            <span class="hljs-number">3&#39;b111</span>: <span class="hljs-keyword">if</span> XLEN &gt;= <span class="hljs-number">64</span> { <span class="hljs-comment">// C.SD</span>
                inst32 = store(rs1d, rs2d, c0_mem_d, <span class="hljs-number">3&#39;b011</span>);
            }
            <span class="hljs-keyword">default</span>: {}
        }
        <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">case</span> funct3 { <span class="hljs-comment">// C1</span>
            <span class="hljs-number">3&#39;b000</span>: inst32 = addi(rs1, rs1, imm_i); <span class="hljs-comment">// C.ADDI</span>
            <span class="hljs-number">3&#39;b001</span>: inst32 = <span class="hljs-keyword">if</span> XLEN == <span class="hljs-number">32</span> ? jal(<span class="hljs-number">1</span>, imm_j) : addiw(rs1, rs1, imm_i); <span class="hljs-comment">// C.JAL / C.ADDIW</span>
            <span class="hljs-number">3&#39;b010</span>: inst32 = addi(rs1, <span class="hljs-number">0</span>, imm_i); <span class="hljs-comment">// C.LI</span>
            <span class="hljs-number">3&#39;b011</span>: <span class="hljs-keyword">if</span> rs1 == <span class="hljs-number">2</span> { <span class="hljs-comment">// C.ADDI16SP</span>
                <span class="hljs-keyword">let</span> imm   : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">10</span>&gt; = {inst16[<span class="hljs-number">12</span>], inst16[<span class="hljs-number">4</span>:<span class="hljs-number">3</span>], inst16[<span class="hljs-number">5</span>], inst16[<span class="hljs-number">2</span>], inst16[<span class="hljs-number">6</span>], <span class="hljs-number">4&#39;b0</span>};
                inst32 = addi(<span class="hljs-number">2</span>, <span class="hljs-number">2</span>, {imm[<span class="hljs-keyword">msb</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">2</span>, imm});
            } <span class="hljs-keyword">else</span> { <span class="hljs-comment">// C.LUI</span>
                inst32 = lui(rs1, {imm_i[<span class="hljs-keyword">msb</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">8</span>, imm_i});
            }
            <span class="hljs-number">3&#39;b100</span>: <span class="hljs-keyword">case</span> inst16[<span class="hljs-number">11</span>:<span class="hljs-number">10</span>] { <span class="hljs-comment">// funct2 or funct6[1:0]</span>
                <span class="hljs-number">2&#39;b00</span>: <span class="hljs-keyword">if</span> !(XLEN == <span class="hljs-number">32</span> &amp;&amp; imm_shamt[<span class="hljs-keyword">msb</span>] == <span class="hljs-number">1</span>) {
                    inst32 = srli(rs1d, rs1d, imm_shamt); <span class="hljs-comment">// C.SRLI</span>
                }
                <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">if</span> !(XLEN == <span class="hljs-number">32</span> &amp;&amp; imm_shamt[<span class="hljs-keyword">msb</span>] == <span class="hljs-number">1</span>) {
                    inst32 = srai(rs1d, rs1d, imm_shamt); <span class="hljs-comment">// C.SRAI</span>
                }
                <span class="hljs-number">2&#39;b10</span>: inst32 = andi(rs1d, rs1d, imm_i); <span class="hljs-comment">// C.ADNI</span>
                <span class="hljs-number">2&#39;b11</span>: <span class="hljs-keyword">if</span> inst16[<span class="hljs-number">12</span>] == <span class="hljs-number">0</span> {
                    <span class="hljs-keyword">case</span> inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>] {
                        <span class="hljs-number">2&#39;b00</span>  : inst32 = sub(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.SUB</span>
                        <span class="hljs-number">2&#39;b01</span>  : inst32 = inst_xor(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.XOR</span>
                        <span class="hljs-number">2&#39;b10</span>  : inst32 = inst_or(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.OR</span>
                        <span class="hljs-number">2&#39;b11</span>  : inst32 = inst_and(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.AND</span>
                        <span class="hljs-keyword">default</span>: {}
                    }
                } <span class="hljs-keyword">else</span> {
                    <span class="hljs-keyword">if</span> XLEN &gt;= <span class="hljs-number">64</span> {
                        <span class="hljs-keyword">if</span> inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>] == <span class="hljs-number">2&#39;b00</span> {
                            inst32 = subw(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.SUBW</span>
                        } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>] == <span class="hljs-number">2&#39;b01</span> {
                            inst32 = addw(rs1d, rs1d, rs2d); <span class="hljs-comment">// C.ADDW</span>
                        }
                    }
                }
                <span class="hljs-keyword">default</span>: {}
            }
            <span class="hljs-number">3&#39;b101</span> : inst32 = jal(<span class="hljs-number">0</span>, imm_j); <span class="hljs-comment">// C.J</span>
            <span class="hljs-number">3&#39;b110</span> : inst32 = beq(rs1d, <span class="hljs-number">0</span>, imm_br); <span class="hljs-comment">// C.BEQZ</span>
            <span class="hljs-number">3&#39;b111</span> : inst32 = bne(rs1d, <span class="hljs-number">0</span>, imm_br); <span class="hljs-comment">// C.BNEZ</span>
            <span class="hljs-keyword">default</span>: {}
        }
        <span class="hljs-number">2&#39;b10</span>: <span class="hljs-keyword">case</span> funct3 { <span class="hljs-comment">// C2</span>
            <span class="hljs-number">3&#39;b000</span>: <span class="hljs-keyword">if</span> !(XLEN == <span class="hljs-number">32</span> &amp;&amp; imm_shamt[<span class="hljs-keyword">msb</span>] == <span class="hljs-number">1</span>) {
                inst32 = slli(rs1, rs1, imm_shamt); <span class="hljs-comment">// C.SLLI</span>
            }
            <span class="hljs-number">3&#39;b010</span>: <span class="hljs-keyword">if</span> rs1 != <span class="hljs-number">0</span> { <span class="hljs-comment">// C.LWSP</span>
                <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt; = {inst16[<span class="hljs-number">3</span>:<span class="hljs-number">2</span>], inst16[<span class="hljs-number">12</span>], inst16[<span class="hljs-number">6</span>:<span class="hljs-number">4</span>], <span class="hljs-number">2&#39;b0</span>};
                inst32 = load(rs1, <span class="hljs-number">2</span>, {<span class="hljs-number">4&#39;b0</span>, offset}, <span class="hljs-number">3&#39;b010</span>);
            }
            <span class="hljs-number">3&#39;b011</span>: <span class="hljs-keyword">if</span> XLEN &gt;= <span class="hljs-number">64</span> &amp;&amp; rs1 != <span class="hljs-number">0</span> { <span class="hljs-comment">// C.LDSP</span>
                <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">9</span>&gt; = {inst16[<span class="hljs-number">4</span>:<span class="hljs-number">2</span>], inst16[<span class="hljs-number">12</span>], inst16[<span class="hljs-number">6</span>:<span class="hljs-number">5</span>], <span class="hljs-number">3&#39;b0</span>};
                inst32 = load(rs1, <span class="hljs-number">2</span>, {<span class="hljs-number">3&#39;b0</span>, offset}, <span class="hljs-number">3&#39;b011</span>);
            }
            <span class="hljs-number">3&#39;b100</span>: <span class="hljs-keyword">if</span> inst16[<span class="hljs-number">12</span>] == <span class="hljs-number">0</span> {
                inst32 = <span class="hljs-keyword">if</span> rs2 == <span class="hljs-number">0</span> ? jalr(<span class="hljs-number">0</span>, rs1, <span class="hljs-number">0</span>) : addi(rs1, rs2, <span class="hljs-number">0</span>); <span class="hljs-comment">// C.JR / C.MV</span>
            } <span class="hljs-keyword">else</span> {
                <span class="hljs-keyword">if</span> rs2 == <span class="hljs-number">0</span> {
                    inst32 = <span class="hljs-keyword">if</span> rs1 == <span class="hljs-number">0</span> ? ebreak() : jalr(<span class="hljs-number">1</span>, rs1, <span class="hljs-number">0</span>); <span class="hljs-comment">// C.EBREAK : C.JALR</span>
                } <span class="hljs-keyword">else</span> {
                    inst32 = add(rs1, rs1, rs2); <span class="hljs-comment">// C.ADD</span>
                }
            }
            <span class="hljs-number">3&#39;b110</span>: { <span class="hljs-comment">// C.SWSP</span>
                <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">8</span>&gt; = {inst16[<span class="hljs-number">8</span>:<span class="hljs-number">7</span>], inst16[<span class="hljs-number">12</span>:<span class="hljs-number">9</span>], <span class="hljs-number">2&#39;b0</span>};
                inst32 = store(<span class="hljs-number">2</span>, rs2, {<span class="hljs-number">4&#39;b0</span>, offset}, <span class="hljs-number">3&#39;b010</span>);
            }
            <span class="hljs-number">3&#39;b111</span>: <span class="hljs-keyword">if</span> XLEN &gt;= <span class="hljs-number">64</span> { <span class="hljs-comment">// C.SDSP</span>
                <span class="hljs-keyword">let</span> offset: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">9</span>&gt; = {inst16[<span class="hljs-number">9</span>:<span class="hljs-number">7</span>], inst16[<span class="hljs-number">12</span>:<span class="hljs-number">10</span>], <span class="hljs-number">3&#39;b0</span>};
                inst32 = store(<span class="hljs-number">2</span>, rs2, {<span class="hljs-number">3&#39;b0</span>, offset}, <span class="hljs-number">3&#39;b011</span>);
            }
            <span class="hljs-keyword">default</span>: {}
        }
        <span class="hljs-keyword">default</span>: {}
    }
}
</code></pre></div><h3 id="rvc命令を発行する" tabindex="-1">RVC命令を発行する <a class="header-anchor" href="#rvc命令を発行する" aria-label="Permalink to “RVC命令を発行する”">​</a></h3><p>inst_fetcherモジュールでrvc_converterモジュールをインスタンス化し、 RVC命令をcoreモジュールに供給します。</p><p>まず、rvc_converterモジュールをインスタンス化します (リスト44)。</p><p><span class="caption">▼リスト13.44: rvc_converterモジュールのインスタンス化 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// instruction converter</span>
<span class="hljs-keyword">var</span> rvcc_is_rvc: <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> rvcc_inst32: Inst ;

<span class="hljs-keyword">inst</span> rvcc: rvc_converter (
    inst16: <span class="hljs-keyword">case</span> issue_pc_offset {
        <span class="hljs-number">0</span>      : fetch_fifo_rdata.bits[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>],
        <span class="hljs-number">2</span>      : fetch_fifo_rdata.bits[<span class="hljs-number">31</span>:<span class="hljs-number">16</span>],
        <span class="hljs-number">4</span>      : fetch_fifo_rdata.bits[<span class="hljs-number">47</span>:<span class="hljs-number">32</span>],
        <span class="hljs-number">6</span>      : fetch_fifo_rdata.bits[<span class="hljs-number">63</span>:<span class="hljs-number">48</span>],
        <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
    },
    is_rvc: rvcc_is_rvc,
    inst32: rvcc_inst32,
);
</code></pre></div><p>RVC命令のとき、変換された32ビット幅の命令を<code>issue_fifo</code>に書き込み、 <code>issue_pc_offset</code>を<code>4</code>ではなく<code>2</code>増やすようにします (リスト45、 リスト46)。</p><p><span class="caption">▼リスト13.45: RVC命令のときのオフセットの更新 (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// offsetが6な32ビット命令の場合、</span>
<span class="hljs-comment">// アドレスと上位16ビットを保存してFIFOを読み進める</span>
<span class="hljs-keyword">if</span> issue_pc_offset == <span class="hljs-number">6</span> &amp;&amp; <span class="custom-hl-bold">!rvcc_is_rvc &amp;&amp;</span> !issue_is_rdata_saved {
    <span class="hljs-keyword">if</span> fetch_fifo_rvalid {
        issue_is_rdata_saved = <span class="hljs-number">1</span>;
        issue_saved_addr     = fetch_fifo_rdata.addr;
        issue_saved_bits     = fetch_fifo_rdata.bits[<span class="hljs-number">63</span>:<span class="hljs-number">48</span>];
    }
} <span class="hljs-keyword">else</span> {
    <span class="hljs-keyword">if</span> issue_fifo_wready &amp;&amp; issue_fifo_wvalid {
        issue_pc_offset      += <span class="custom-hl-bold"><span class="hljs-keyword">if</span> issue_is_rdata_saved || !rvcc_is_rvc ?</span> <span class="hljs-number">4</span> <span class="custom-hl-bold">: <span class="hljs-number">2</span></span>;
        issue_is_rdata_saved =  <span class="hljs-number">0</span>;
    }
}
</code></pre></div><p><span class="caption">▼リスト13.46: RVC命令のときのissue_fifoへの書き込み (inst_fetcher.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/1ec394efa56cff24df404ed290b72058fc69a416~1..1ec394efa56cff24df404ed290b72058fc69a416#diff-6e174507e7e639b62798d99d76de83f85f0201a5accd72b2a3190b528191b3b3">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> !core_if.is_hazard &amp;&amp; fetch_fifo_rvalid {
    <span class="hljs-keyword">if</span> offset == <span class="hljs-number">6</span> {
        <span class="hljs-comment">// offsetが6な32ビット命令の場合、</span>
        <span class="hljs-comment">// 命令は{rdata_next[15:0], rdata[63:48}になる</span>
        <span class="hljs-keyword">if</span> issue_is_rdata_saved {
            issue_fifo_wvalid       = <span class="hljs-number">1</span>;
            issue_fifo_wdata.addr   = {issue_saved_addr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
            issue_fifo_wdata.bits   = {rdata[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>], issue_saved_bits};
            issue_fifo_wdata.is_rvc = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="custom-hl-bold"><span class="hljs-keyword">if</span> rvcc_is_rvc {</span>
            <span class="custom-hl-bold">    fetch_fifo_rready       = issue_fifo_wready;</span>
            <span class="custom-hl-bold">    issue_fifo_wvalid       = <span class="hljs-number">1</span>;</span>
            <span class="custom-hl-bold">    issue_fifo_wdata.addr   = {raddr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};</span>
            <span class="custom-hl-bold">    issue_fifo_wdata.is_rvc = <span class="hljs-number">1</span>;</span>
            <span class="custom-hl-bold">    issue_fifo_wdata.bits   = rvcc_inst32;</span>
            <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            <span class="custom-hl-bold">    <span class="hljs-comment">// save inst[15:0]</span></span>
            <span class="custom-hl-bold">    fetch_fifo_rready = <span class="hljs-number">1</span>; <span class="hljs-comment">// Read next 8 bytes</span></span>
            <span class="custom-hl-bold">}</span>
        }
    } <span class="hljs-keyword">else</span> {
        fetch_fifo_rready     = issue_fifo_wready &amp;&amp; <span class="custom-hl-bold">!rvcc_is_rvc &amp;&amp;</span> offset == <span class="hljs-number">4</span>;
        issue_fifo_wvalid     = <span class="hljs-number">1</span>;
        issue_fifo_wdata.addr = {raddr[<span class="hljs-keyword">msb</span>:<span class="hljs-number">3</span>], offset};
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> rvcc_is_rvc {</span>
        <span class="custom-hl-bold">    issue_fifo_wdata.bits = rvcc_inst32;</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            issue_fifo_wdata.bits = <span class="hljs-keyword">case</span> offset {
                <span class="hljs-number">0</span>      : rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>],
                <span class="hljs-number">2</span>      : rdata[<span class="hljs-number">47</span>:<span class="hljs-number">16</span>],
                <span class="hljs-number">4</span>      : rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>],
                <span class="hljs-keyword">default</span>: <span class="hljs-number">0</span>,
            };
        <span class="custom-hl-bold">}</span>
        issue_fifo_wdata.is_rvc = <span class="custom-hl-bold">rvcc_is_rvc</span>;
    }
}
</code></pre></div><p>riscv-testsの<code>rv64uc-p-</code>から始まるテストを実行し、成功することを確認してください。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>Zc*拡張の一部の命令は複数の命令になります <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>ここで削除するコードは次の<a href="./14-impl-c.html">「13.4.3 inst_fetcherモジュールを作成する」</a>で実装するコードと似通っているため、削除せずにコメントアウトしておくと少し楽に実装できます。 <a href="#fnref2" class="footnote-backref">↩︎</a></p></li></ol></section>`,48)])])}const _=e(t,[["render",o]]);export{j as __pageData,_ as default};
