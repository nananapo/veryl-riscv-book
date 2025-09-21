import{_ as a,c as n,o as l,af as p,au as e,av as c,aw as t,ax as r}from"./chunks/framework.D5l_65jD.js";const v=JSON.parse('{"title":"RV64Iの実装","description":"","frontmatter":{},"headers":[],"relativePath":"basic/05-impl-rv64i.md","filePath":"basic/05-impl-rv64i.md"}'),o={name:"basic/05-impl-rv64i.md"};function d(i,s,h,u,b,m){return l(),n("div",null,[...s[0]||(s[0]=[p(`<h1 id="rv64iの実装" tabindex="-1">RV64Iの実装 <a class="header-anchor" href="#rv64iの実装" aria-label="Permalink to “RV64Iの実装”">​</a></h1><p>これまでに、RISC-Vの32ビットの基本整数命令セットであるRV32IのCPUを実装しました。 RISC-Vには64ビットの基本整数命令セットとしてRV64Iが定義されています。 本章では、RV32IのCPUをRV64Iにアップグレードします。</p><p>では、具体的にRV32IとRV64Iは何が違うのでしょうか? まず、RV64IではXLENが32ビットから64ビットに変更され、レジスタの幅や各種演算命令の演算の幅が64ビットになります。 それに伴い、 32ビット幅での整数演算を行う命令、 64ビット幅でロードストアを行う命令が追加されます(表1)。 また、演算の幅が64ビットに広がるだけではなく、 一部の命令の動作が少し変わります(表2)。</p><div id="rv64i.new_insts" class="table"><p class="caption">表6.1: RV64Iで追加される命令</p><table><tr class="hline"><th>命令</th><th>動作</th></tr><tr class="hline"><td>ADD[I]W</td><td>32ビット単位で加算を行う。結果は符号拡張する</td></tr><tr class="hline"><td>SUBW</td><td>32ビット単位で減算を行う。結果は符号拡張する</td></tr><tr class="hline"><td>SLL[I]W</td><td>レジスタの値を0 ～ 31ビット左論理シフトする。結果は符号拡張する</td></tr><tr class="hline"><td>SRL[I]W</td><td>レジスタの値を0 ～ 31ビット右論理シフトする。結果は符号拡張する</td></tr><tr class="hline"><td>SRA[I]W</td><td>レジスタの値を0 ～ 31ビット右算術シフトする。結果は符号拡張する</td></tr><tr class="hline"><td>LWU</td><td>メモリから32ビット読み込む。結果はゼロで拡張する</td></tr><tr class="hline"><td>LD</td><td>メモリから64ビット読み込む</td></tr><tr class="hline"><td>SD</td><td>メモリに64ビット書き込む</td></tr></table></div><div id="rv64i.change" class="table"><p class="caption">表6.2: RV64Iで変更される命令</p><table><tr class="hline"><th>命令</th><th>変更後の動作</th></tr><tr class="hline"><td>SLL[I]</td><td>0 ～ 63ビット左論理シフトする</td></tr><tr class="hline"><td>SRL[I]</td><td>0 ～ 63ビット右論理シフトする</td></tr><tr class="hline"><td>SRA[I]</td><td>0 ～ 63ビット右算術シフトする</td></tr><tr class="hline"><td>LUI</td><td>32ビットの即値を生成する。結果は符号拡張する</td></tr><tr class="hline"><td>AUIPC</td><td>32ビットの即値を符号拡張したものにpcを足し合わせる</td></tr><tr class="hline"><td>LW</td><td>メモリから32ビット読み込む。結果は符号拡張する</td></tr></table></div> 実装のテストにはriscv-testsを利用します。 RV64I向けのテストは\`rv64ui-p-\`から始まるテストです。 命令を実装するたびにテストを実行することで、 命令が正しく実行できていることを確認します。 <h2 id="xlenの変更" tabindex="-1">XLENの変更 <a class="header-anchor" href="#xlenの変更" aria-label="Permalink to “XLENの変更”">​</a></h2><p>レジスタの幅が32ビットから64ビットに変わるということは、 XLENが32から64に変わるということです。 eeiパッケージに定義している<code>XLEN</code>を64に変更します(リスト1)。 RV64Iになっても命令の幅(ILEN)は32ビットのままです。</p><p><span class="caption">▼リスト6.1: XLENを変更する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> XLEN: <span class="hljs-keyword">u32</span> = <span class="custom-hl-bold"><span class="hljs-number">64</span></span>;
</code></pre></div><h3 id="sll-i-、srl-i-、sra-i-命令を変更する" tabindex="-1">SLL[I]、SRL[I]、SRA[I]命令を変更する <a class="header-anchor" href="#sll-i-、srl-i-、sra-i-命令を変更する" aria-label="Permalink to “SLL[I]、SRL[I]、SRA[I]命令を変更する”">​</a></h3><p>RV32Iでは、シフト命令はrs1の値を0 ～ 31ビットシフトする命令として定義されています。 これがRV64Iでは、rs1の値を0 ～ 63ビットシフトする命令に変更されます。</p><p>これに対応するために、ALUのシフト演算する量を5ビットから6ビットに変更します (リスト2)。 I形式の命令(SLLI、SRLI、SRAI)のときは即値の下位6ビット、 R形式の命令(SLL、SRL、SRA)のときはレジスタの下位6ビットを利用します。</p><p><span class="caption">▼リスト6.2: シフト命令でシフトする量を変更する (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> sll: UIntX = op1 &lt;&lt; op2[<span class="custom-hl-bold"><span class="hljs-number">5</span></span>:<span class="hljs-number">0</span>];
<span class="hljs-keyword">let</span> srl: UIntX = op1 &gt;&gt; op2[<span class="custom-hl-bold"><span class="hljs-number">5</span></span>:<span class="hljs-number">0</span>];
<span class="hljs-keyword">let</span> sra: SIntX = $<span class="hljs-keyword">signed</span>(op1) &gt;&gt;&gt; op2[<span class="custom-hl-bold"><span class="hljs-number">5</span></span>:<span class="hljs-number">0</span>];
</code></pre></div><h3 id="lui、auipc命令を変更する" tabindex="-1">LUI、AUIPC命令を変更する <a class="header-anchor" href="#lui、auipc命令を変更する" aria-label="Permalink to “LUI、AUIPC命令を変更する”">​</a></h3><p>RV32Iでは、LUI命令は32ビットの即値をそのままレジスタに格納する命令として定義されています。 これがRV64Iでは、32ビットの即値を64ビットに符号拡張した値を格納する命令に変更されます。 AUIPC命令も同様で、即値にPCを足す前に、即値を64ビットに符号拡張します。</p><p>この対応ですが、XLENを64に変更した時点ですでに完了しています(リスト3)。 そのため、コードの変更の必要はありません。</p><p><span class="caption">▼リスト6.3: U形式の即値はXLENビットに拡張されている (inst_decoder.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> imm_u: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_u_g) - <span class="hljs-number">12</span>, imm_u_g, <span class="hljs-number">12&#39;b0</span>};
</code></pre></div><h3 id="csrを変更する" tabindex="-1">CSRを変更する <a class="header-anchor" href="#csrを変更する" aria-label="Permalink to “CSRを変更する”">​</a></h3><p>MXLEN(=XLEN)が64ビットに変更されると、CSRの幅も64ビットに変更されます。 そのため、mtvec、mepc、mcauseレジスタの幅を64ビットに変更する必要があります。</p><p>しかし、mtvec、mepc、mcauseレジスタは XLENビットのレジスタ(<code>UIntX</code>)として定義しているため、 変更の必要はありません。 また、mtvec、mepc、mcauseレジスタはMXLENを基準に定義されており、 RV32IからRV64Iに変わってもフィールドに変化はないため、 対応は必要ありません。</p><p>唯一、書き込みマスクの幅を広げる必要があります (リスト4)。</p><p><span class="caption">▼リスト6.4: CSRの書き込みマスクの幅を広げる (csrunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MTVEC_WMASK : UIntX = &#39;h<span class="custom-hl-bold">ffff_ffff_</span>ffff_fffc;
<span class="hljs-keyword">const</span> MEPC_WMASK  : UIntX = &#39;h<span class="custom-hl-bold">ffff_ffff_</span>ffff_fffc;
<span class="hljs-keyword">const</span> MCAUSE_WMASK: UIntX = &#39;h<span class="custom-hl-bold">ffff_ffff_</span>ffff_ffff;
</code></pre></div><h3 id="lw命令を変更する" tabindex="-1">LW命令を変更する <a class="header-anchor" href="#lw命令を変更する" aria-label="Permalink to “LW命令を変更する”">​</a></h3><p>LW命令は32ビットの値をロードする命令です。 RV64Iでは、LW命令の結果が64ビットに符号拡張されるようになります。 これに対応するため、memunitモジュールの<code>rdata</code>の割り当てのLW部分を変更します (リスト5)。</p><p><span class="caption">▼リスト6.5: LW命令のメモリの読み込み結果を符号拡張する (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-number">2&#39;b10</span>  : <span class="custom-hl-bold">{D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">32</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]}</span>,
</code></pre></div><p>また、XLENが64に変更されたことで、 幅を<code>MEM_DATA_WIDTH</code>(=32)として定義している<code>req_wdata</code>の代入文のビット幅が左右で合わなくなってしまっています。 ビット幅を合わせるために、rs2の下位<code>MEM_DATA_WIDTH</code>ビットだけを切り取ります (リスト6)。</p><p><span class="caption">▼リスト6.6: 左辺と右辺でビット幅を合わせる (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> state {
    State::Init: <span class="hljs-keyword">if</span> is_new &amp; inst_is_memop(ctrl) {
        state     = State::WaitReady;
        req_wen   = inst_is_store(ctrl);
        req_addr  = addr;
        req_wdata = rs2<span class="custom-hl-bold">[MEM_DATA_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]</span> &lt;&lt; {addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-number">3&#39;b0</span>};
</code></pre></div><h3 id="riscv-testsでテストする" tabindex="-1">riscv-testsでテストする <a class="header-anchor" href="#riscv-testsでテストする" aria-label="Permalink to “riscv-testsでテストする”">​</a></h3><h4 id="rv32i向けのテストの実行" tabindex="-1">RV32I向けのテストの実行 <a class="header-anchor" href="#rv32i向けのテストの実行" aria-label="Permalink to “RV32I向けのテストの実行”">​</a></h4><p>まず、RV32I向けのテストが正しく動くことを確認します(リスト7)。</p><p><span class="caption">▼リスト6.7: RV32I向けのテストを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv32ui-p-</span>
...
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srl.bin.hex
Test Result : 40 / 40
</code></pre></div><p>RV32I向けのテストにすべて成功しました。 riscv-testsのRV32I向けのテストは、XLENが64のときにテストを実行せずに成功とします(リスト8)。</p><p><span class="caption">▼リスト6.8: rv32ui-p-addはXLENが64のときにテストせずに成功する (rv32ui-p-add.dump)</span></p><div class="language-rv32i"><button title="Copy Code" class="copy"></button><span class="lang">rv32i</span><pre class="hljs"><code>00000050 &lt;reset_vector&gt;:
 ...
 13c:   00100513                li      a0,1 ← a0 = 1
 140:   01f51513                slli    a0,a0,0x1f ← a0を31ビット左シフト
 144:   00054c63                bltz    a0,15c &lt;reset_vector+0x10c&gt; ← a0が0より小さかったらジャンプ
 148:   0ff0000f                fence
 14c:   00100193                li      gp,1 ← gp=1 (テスト成功) にする
 150:   05d00893                li      a7,93
 154:   00000513                li      a0,0
 158:   00000073                ecall ← trap_vectorにジャンプして終了
</code></pre></div><p>riscv-testsは、a0に1を代入した後、a0を31ビット左シフトします。 XLENが32のとき、a0の最上位ビット(符号ビット)が1になり、a0は0より小さくなります。 XLENが64のとき、a0の符号は変わらないため、a0は0より大きくなります。 これを利用して、XLENが32ではないときは<code>trap_vector</code>にジャンプして、テスト成功として終了しています。</p><h4 id="rv64i向けのテストの実行" tabindex="-1">RV64I向けのテストの実行 <a class="header-anchor" href="#rv64i向けのテストの実行" aria-label="Permalink to “RV64I向けのテストの実行”">​</a></h4><p>それでは、RV64I向けのテストを実行します(リスト9)。 RV64I向けのテストは名前が<code>rv64ui-p-</code>から始まります、</p><p><span class="caption">▼リスト6.9: RV64I向けのテストを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-</span>
...
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
Test Result : 14 / 52
</code></pre></div><p>ADD命令のテストを含む、ほとんどのテストに失敗してしまいました。 これはriscv-testsのテストが、まだ未実装の命令を含むためです(リスト10)。</p><p><span class="caption">▼リスト6.10: ADD命令のテストは未実装の命令(ADDIW命令)を含む (rv64ui-p-add.dump)</span></p><div class="language-rv64ui-p-add"><button title="Copy Code" class="copy"></button><span class="lang">rv64ui-p-add</span><pre class="hljs"><code>0000000000000208 &lt;test_7&gt;:
 208:   00700193                li      gp,7
 20c:   800005b7                lui     a1,0x80000
 210:   ffff8637                lui     a2,0xffff8
 214:   00c58733                add     a4,a1,a2
 218:   ffff03b7                lui     t2,0xffff0
 21c:   fff3839b                <span class="custom-hl-bold">addiw      t2,t2,-1</span> # fffffffffffeffff &lt;_end+0xfffffffffffedfff&gt;
 220:   00f39393                slli    t2,t2,0xf
 224:   46771063                bne     a4,t2,684 &lt;fail&gt;
</code></pre></div><p>ということで、失敗していることを気にせずに実装を進めます。</p><h2 id="add-i-w、subw命令の実装" tabindex="-1">ADD[I]W、SUBW命令の実装 <a class="header-anchor" href="#add-i-w、subw命令の実装" aria-label="Permalink to “ADD[I]W、SUBW命令の実装”">​</a></h2><p>RV64Iでは、ADD命令は64ビット単位で演算する命令になり、 32ビットの加算をするADDW命令とADDIW命令が追加されます。 同様に、SUB命令は64ビッド単位の演算になり、 32ビットの減算をするSUBW命令が追加されます。 32ビットの演算結果は符号拡張します。</p><h3 id="add-i-w、subw命令をデコードする" tabindex="-1">ADD[I]W、SUBW命令をデコードする <a class="header-anchor" href="#add-i-w、subw命令をデコードする" aria-label="Permalink to “ADD[I]W、SUBW命令をデコードする”">​</a></h3><p><img src="`+e+`" alt="ADDW、ADDIW、SUBW命令のフォーマット"> ADDW命令とSUBW命令はR形式で、opcodeは<code>OP-32</code>(<code>7&#39;b0111011</code>)です。 ADDIW命令はI形式で、opcodeは<code>OP-IMM-32</code>(<code>7&#39;b0011011</code>)です。</p><p>まず、eeiパッケージにopcodeの定数を定義します (リスト11)。</p><p><span class="caption">▼リスト6.11: opcodeを定義する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> OP_OP_32    : <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = <span class="hljs-number">7&#39;b0111011</span>;
<span class="hljs-keyword">const</span> OP_OP_IMM_32: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = <span class="hljs-number">7&#39;b0011011</span>;
</code></pre></div><p>次に、<code>InstCtrl</code>構造体に、 32ビット単位で演算を行う命令であることを示す<code>is_op32</code>フラグを追加します (リスト12)。</p><p><span class="caption">▼リスト6.12: is_op32を追加する (corectrl.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> InstCtrl {
    itype   : InstType   , <span class="hljs-comment">// 命令の形式</span>
    rwb_en  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// レジスタに書き込むかどうか</span>
    is_lui  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// LUI命令である</span>
    is_aluop: <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ALUを利用する命令である</span>
    <span class="custom-hl-bold">is_op32 : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// OP-32またはOP-IMM-32である</span></span>
    is_jump : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ジャンプ命令である</span>
    is_load : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ロード命令である</span>
    is_csr  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// CSR命令である</span>
    funct3  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
    funct7  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">7</span>&gt;, <span class="hljs-comment">// 命令のfunct7フィールド</span>
}
</code></pre></div><p>inst_decoderモジュールの<code>InstCtrl</code>と即値を生成している部分を変更します ( リスト13、 リスト14 )。 これでデコードは完了です。</p><p><span class="caption">▼リスト6.13: OP-32、OP-IMM-32のInstCtrlの生成 (inst_decoder.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>OP_OP_IMM: {
    InstType::I, T, F, T, <span class="custom-hl-bold">F,</span> F, F, F
},
<span class="custom-hl-bold">OP_OP_32: {</span>
<span class="custom-hl-bold">    InstType::R, T, F, T, T, F, F, F</span>
<span class="custom-hl-bold">},</span>
<span class="custom-hl-bold">OP_OP_IMM_32: {</span>
<span class="custom-hl-bold">    InstType::I, T, F, T, T, F, F, F</span>
<span class="custom-hl-bold">},</span>
OP_SYSTEM: {
    InstType::I, T, F, F, <span class="custom-hl-bold">F,</span> F, F, T
},
</code></pre></div><p><span class="caption">▼リスト6.14: OP-IMM-32の即値の生成 (inst_decoder.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>imm = <span class="hljs-keyword">case</span> op {
    OP_LUI, OP_AUIPC       : imm_u,
    OP_JAL                 : imm_j,
    OP_JALR, OP_LOAD       : imm_i,
    OP_OP_IMM, <span class="custom-hl-bold">OP_OP_IMM_32</span>: imm_i,
    OP_BRANCH              : imm_b,
    OP_STORE               : imm_s,
    <span class="hljs-keyword">default</span>                : &#39;x,
};
</code></pre></div><h3 id="aluにaddw、subwを実装する" tabindex="-1">ALUにADDW、SUBWを実装する <a class="header-anchor" href="#aluにaddw、subwを実装する" aria-label="Permalink to “ALUにADDW、SUBWを実装する”">​</a></h3><p>制御フラグを生成できたので、 それに応じて32ビットのADDとSUBを計算します。</p><p>まず、32ビットの足し算と引き算の結果を生成します (リスト15)。</p><p><span class="caption">▼リスト6.15: 32ビットの足し算と引き算をする (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> add32: UInt32 = op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] + op2[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>];
<span class="hljs-keyword">let</span> sub32: UInt32 = op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] - op2[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>];
</code></pre></div><p>次に、フラグによって演算結果を選択する関数sel_wを作成します (リスト16)。 この関数は、 <code>is_op32</code>が<code>1</code>なら<code>value32</code>を64ビットに符号拡張した値、 <code>0</code>なら<code>value64</code>を返します。</p><p><span class="caption">▼リスト6.16: 演算結果を選択する関数を作成する (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">function</span> sel_w (
    is_op32: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span> ,
    value32: <span class="hljs-keyword">input</span> UInt32,
    value64: <span class="hljs-keyword">input</span> UInt64,
) -&gt; UInt64 {
    <span class="hljs-keyword">if</span> is_op32 {
        <span class="hljs-keyword">return</span> {value32[<span class="hljs-keyword">msb</span>] <span class="hljs-keyword">repeat</span> <span class="hljs-number">32</span>, value32};
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">return</span> value64;
    }
}
</code></pre></div><p>sel_w関数を使用し、aluモジュールの演算処理を変更します。 case文の足し算と引き算の部分を次のように変更します (リスト17)。</p><p><span class="caption">▼リスト6.17: 32ビットの演算結果を選択する (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-keyword">if</span> ctrl.is_aluop {
        <span class="hljs-keyword">case</span> ctrl.funct3 {
            <span class="hljs-number">3&#39;b000</span> : result = <span class="hljs-keyword">if</span> ctrl.itype == InstType::I | ctrl.funct7 == <span class="hljs-number">0</span> ? <span class="custom-hl-bold">sel_w(ctrl.is_op32, add32, </span>add<span class="custom-hl-bold">)</span> : <span class="custom-hl-bold">sel_w(ctrl.is_op32, sub32, </span>sub<span class="custom-hl-bold">)</span>;
            <span class="hljs-number">3&#39;b001</span> : result = sll;
            <span class="hljs-number">3&#39;b010</span> : result = slt;
</code></pre></div><h3 id="add-i-w、subw命令をテストする" tabindex="-1">ADD[I]W、SUBW命令をテストする <a class="header-anchor" href="#add-i-w、subw命令をテストする" aria-label="Permalink to “ADD[I]W、SUBW命令をテストする”">​</a></h3><p>RV64I向けのテストを実行して、結果ファイルを確認します ( リスト18、 リスト19 )。</p><p><span class="caption">▼リスト6.18: RV64I向けのテストを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-</span>
</code></pre></div><p><span class="caption">▼リスト6.19: テストの実行結果 (results/result.txt)</span></p><div class="language-txt"><button title="Copy Code" class="copy"></button><span class="lang">txt</span><pre class="hljs"><code>Test Result : 42 / 52
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-slliw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sllw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraiw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-srliw.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-srlw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-addiw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-addw.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-subw.bin.hex
...
</code></pre></div><p>ADDIW、ADDW、SUBWだけでなく、未実装の命令以外のテストにも成功しました。</p><h2 id="sll-i-w、srl-i-w、sra-i-w命令の実装" tabindex="-1">SLL[I]W、SRL[I]W、SRA[I]W命令の実装 <a class="header-anchor" href="#sll-i-w、srl-i-w、sra-i-w命令の実装" aria-label="Permalink to “SLL[I]W、SRL[I]W、SRA[I]W命令の実装”">​</a></h2><p>RV64Iでは、SLL[I]、SRL[I]、SRA[I]命令はrs1を0 ～ 63ビットシフトする命令になり、 rs1の下位32ビットを0 ～ 31ビットシフトするSLL[I]W、SRL[I]W、SRA[I]W命令が追加されます。 32ビットの演算結果は符号拡張します。</p><p><img src="`+c+`" alt="SLL[I]W、SRL[I]W、SRA[I]W命令のフォーマット"> SLL[I]W、SRL[I]W、SRA[I]W命令のフォーマットは、 RV32IのSLL[I]、SRL[I]、SRA[I]命令のopcodeを変えたものと同じです。 SLLW、SRLW、SRAW命令はR形式で、opcodeは<code>OP-32</code>です。 SLLIW、SRLIW、SRAIW命令はI形式で、opcodeは<code>OP-IMM-32</code>です。 どちらのopcodeの命令も、 ADD[I]W命令とSUBW命令の実装時にデコードが完了しています。</p><p>aluモジュールで、32ビットのシフト演算の結果を生成します (リスト20)。</p><p><span class="caption">▼リスト6.20: 32ビットのシフト演算をする (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> sll32: UInt32 = op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] &lt;&lt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];
<span class="hljs-keyword">let</span> srl32: UInt32 = op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] &gt;&gt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];
<span class="hljs-keyword">let</span> sra32: SInt32 = $<span class="hljs-keyword">signed</span>(op1[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]) &gt;&gt;&gt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];
</code></pre></div><p>生成したシフト演算の結果をsel_w関数で選択します。 case文のシフト演算の部分を次のように変更します (リスト21)。</p><p><span class="caption">▼リスト6.21: 32ビットの演算結果を選択する (alu.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">case</span> ctrl.funct3 {
    <span class="hljs-number">3&#39;b000</span>: result = <span class="hljs-keyword">if</span> ctrl.itype == InstType::I | ctrl.funct7 == <span class="hljs-number">0</span> ? sel_w(ctrl.is_op32, add32, add) : sel_w(ctrl.is_op32, sub32, sub);
    <span class="hljs-number">3&#39;b001</span>: result = <span class="custom-hl-bold">sel_w(ctrl.is_op32, sll32, </span>sll<span class="custom-hl-bold">)</span>;
    <span class="hljs-number">3&#39;b010</span>: result = slt;
    <span class="hljs-number">3&#39;b011</span>: result = sltu;
    <span class="hljs-number">3&#39;b100</span>: result = op1 ^ op2;
    <span class="hljs-number">3&#39;b101</span>: result = <span class="hljs-keyword">if</span> ctrl.funct7[<span class="hljs-number">5</span>] == <span class="hljs-number">0</span> ? <span class="custom-hl-bold">sel_w(ctrl.is_op32, srl32, </span>srl<span class="custom-hl-bold">)</span> : <span class="custom-hl-bold">sel_w(ctrl.is_op32, sra32, </span>sra<span class="custom-hl-bold">)</span>;
</code></pre></div><h3 id="sll-i-w、srl-i-w、sra-i-w命令をテストする" tabindex="-1">SLL[I]W、SRL[I]W、SRA[I]W命令をテストする <a class="header-anchor" href="#sll-i-w、srl-i-w、sra-i-w命令をテストする" aria-label="Permalink to “SLL[I]W、SRL[I]W、SRA[I]W命令をテストする”">​</a></h3><p>RV64I向けのテストを実行し、結果ファイルを確認します (リスト22、リスト23)。</p><p><span class="caption">▼リスト6.22: RV64I向けのテストを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-</span>
</code></pre></div><p><span class="caption">▼リスト6.23: テストの実行結果 (results/result.txt)</span></p><div class="language-txt"><button title="Copy Code" class="copy"></button><span class="lang">txt</span><pre class="hljs"><code>Test Result : 48 / 52
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sll.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-slli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-slliw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sllw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sra.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srai.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraiw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sraw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srl.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srliw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-srlw.bin.hex
...
</code></pre></div><p>SLLW、SLLIW、SRLW、SRLIW、SRAW、SRAIW命令のテストに成功していることを確認できます。</p><h2 id="lwu命令の実装" tabindex="-1">LWU命令の実装 <a class="header-anchor" href="#lwu命令の実装" aria-label="Permalink to “LWU命令の実装”">​</a></h2><p>LB、LH命令は、ロードした値を符号拡張した値をレジスタに格納します。 これに対して、LBU、LHU命令は、 ロードした値をゼロで拡張した値をレジスタに格納します。</p><p>同様に、LW命令は、ロードした値を符号拡張した値をレジスタに格納します。 これに対して、RV64Iでは、 ロードした32ビットの値をゼロで拡張した値をレジスタに格納する LWU命令が追加されます。</p><p><img src="`+t+`" alt="LWU命令のフォーマット"> LWU命令はI形式で、opcodeは<code>LOAD</code>です。 ロードストア命令はfunct3によって区別できて、LWU命令のfunct3は<code>3&#39;b110</code>です。 デコード処理に変更は必要なく、メモリにアクセスする処理を変更する必要があります。</p><p>memunitモジュールの、ロードする部分を変更します。 32ビットを<code>rdata</code>に割り当てるとき、 <code>sext</code>によって符号かゼロで拡張するかを選択します (リスト24)。</p><p><span class="caption">▼リスト6.24: LWU命令の実装 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-number">2&#39;b10</span>  : {<span class="custom-hl-bold">sext &amp; D[<span class="hljs-number">31</span>]</span> <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">32</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]},
</code></pre></div><h3 id="lwu命令をテストする" tabindex="-1">LWU命令をテストする <a class="header-anchor" href="#lwu命令をテストする" aria-label="Permalink to “LWU命令をテストする”">​</a></h3><p>LWU命令のテストを実行します(リスト25)。</p><p><span class="caption">▼リスト6.25: LWU命令をテストする</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-lwu</span>
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-lwu.bin.hex
Test Result : 1 / 1
</code></pre></div><h2 id="ld、sd命令の実装" tabindex="-1">LD、SD命令の実装 <a class="header-anchor" href="#ld、sd命令の実装" aria-label="Permalink to “LD、SD命令の実装”">​</a></h2><p>RV64Iには、64ビット単位でロードストアを行うLD命令とSD命令が定義されています。</p><p><img src="`+r+`" alt="LD、SD命令のフォーマット"> LD命令はI形式で、opcodeは<code>LOAD</code>です。 SD命令はS形式で、opcodeは<code>STORE</code>です。 どちらの命令もfunct3は<code>3&#39;b011</code>です。 デコード処理に変更は必要ありません。</p><h3 id="メモリの幅を広げる" tabindex="-1">メモリの幅を広げる <a class="header-anchor" href="#メモリの幅を広げる" aria-label="Permalink to “メモリの幅を広げる”">​</a></h3><p>現在のメモリの1つのデータの幅(<code>MEM_DATA_WIDTH</code>)は32ビットですが、 このままだと64ビットでロードやストアを行うときに、 最低2回のメモリアクセスが必要です。 これを1回のメモリアクセスで済ませるために、 データの幅を32ビットから64ビットに広げます (リスト26)。</p><p><span class="caption">▼リスト6.26: MEM_DATA_WIDTHを64ビットに変更する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> MEM_DATA_WIDTH: <span class="hljs-keyword">u32</span> = <span class="custom-hl-bold"><span class="hljs-number">64</span></span>;
</code></pre></div><h3 id="命令フェッチ処理を修正する" tabindex="-1">命令フェッチ処理を修正する <a class="header-anchor" href="#命令フェッチ処理を修正する" aria-label="Permalink to “命令フェッチ処理を修正する”">​</a></h3><p><code>XLEN</code>、<code>MEM_DATA_WIDTH</code>が変わっても、 命令の長さ(<code>ILEN</code>)は32ビットのままです。 そのため、topモジュールの<code>i_membus.rdata</code>の幅は32ビットなのに対し、 <code>membus.rdata</code>は64ビットになり、ビット幅が一致しません。</p><p>ビット幅を合わせて正しく命令をフェッチするために、 64ビットの読み出しデータの上位32ビット、 下位32ビットをアドレスの下位ビットで選択します。 アドレスが8の倍数のときは下位32ビット、 それ以外のときは上位32ビットを選択します。</p><p>まず、命令フェッチの要求アドレスをレジスタに格納します ( リスト27、 リスト28 )。</p><p><span class="caption">▼リスト6.27: アドレスを格納するためのレジスタの定義 (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> memarb_last_i    : <span class="hljs-keyword">logic</span>;
<span class="custom-hl-bold"><span class="hljs-keyword">var</span> memarb_last_iaddr: Addr ;</span>
</code></pre></div><p><span class="caption">▼リスト6.28: レジスタに命令フェッチの要求アドレスを格納する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// メモリアクセスを調停する</span>
<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        memarb_last_i     = <span class="hljs-number">0</span>;
        <span class="custom-hl-bold">memarb_last_iaddr = <span class="hljs-number">0</span>;</span>
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> membus.ready {
            memarb_last_i     = !d_membus.valid;
            <span class="custom-hl-bold">memarb_last_iaddr = i_membus.addr;</span>
        }
    }
}
</code></pre></div><p>このレジスタの値を利用し、 <code>i_membus.rdata</code>に割り当てる値を選択します (リスト29)。</p><p><span class="caption">▼リスト6.29: アドレスによってデータを選択する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>i_membus.rdata  = <span class="hljs-keyword">if</span> memarb_last_iaddr[<span class="hljs-number">2</span>] == <span class="hljs-number">0</span> ? membus.rdata[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>] : membus.rdata[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>];
</code></pre></div><h3 id="sd命令を実装する" tabindex="-1">SD命令を実装する <a class="header-anchor" href="#sd命令を実装する" aria-label="Permalink to “SD命令を実装する”">​</a></h3><p>SD命令の実装のためには、 書き込むデータ(<code>wdata</code>)と書き込みマスク(<code>wmask</code>)を変更する必要があります。</p><p>書き込むデータはアドレスの下位2ビットではなく下位3ビット分シフトします (リスト30)。</p><p><span class="caption">▼リスト6.30: 書き込むデータの変更 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>req_wdata = rs2 &lt;&lt; {addr[<span class="custom-hl-bold"><span class="hljs-number">2</span></span>:<span class="hljs-number">0</span>], <span class="hljs-number">3&#39;b0</span>};
</code></pre></div><p>書き込みマスクは4ビットから8ビットに拡張されるため、 アドレスの下位2ビットではなく下位3ビットで選択します (リスト31)。</p><p><span class="caption">▼リスト6.31: 書き込みマスクの変更 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>req_wmask = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>: <span class="custom-hl-bold"><span class="hljs-number">8</span></span><span class="hljs-number">&#39;b1</span> &lt;&lt; addr[<span class="custom-hl-bold"><span class="hljs-number">2</span></span>:<span class="hljs-number">0</span>],
    <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">case</span> addr[<span class="custom-hl-bold"><span class="hljs-number">2</span></span>:<span class="hljs-number">0</span>] {
        <span class="custom-hl-bold"><span class="hljs-number">6</span>      : <span class="hljs-number">8&#39;b11000000</span>,</span>
        <span class="custom-hl-bold"><span class="hljs-number">4</span>      : <span class="hljs-number">8&#39;b00110000</span>,</span>
        <span class="hljs-number">2</span>      : <span class="custom-hl-bold"><span class="hljs-number">8&#39;b00001100</span></span>,
        <span class="hljs-number">0</span>      : <span class="custom-hl-bold"><span class="hljs-number">8&#39;b00000011</span></span>,
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="hljs-number">2&#39;b10</span>: <span class="custom-hl-bold"><span class="hljs-keyword">case</span> addr[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>] {</span>
        <span class="custom-hl-bold"><span class="hljs-number">0</span>      : <span class="hljs-number">8&#39;b00001111</span>,</span>
        <span class="custom-hl-bold"><span class="hljs-number">4</span>      : <span class="hljs-number">8&#39;b11110000</span>,</span>
        <span class="custom-hl-bold"><span class="hljs-keyword">default</span>: &#39;x,</span>
    <span class="custom-hl-bold">},</span>
    <span class="custom-hl-bold"><span class="hljs-number">2&#39;b11</span>  : <span class="hljs-number">8&#39;b11111111</span>,</span>
    <span class="hljs-keyword">default</span>: &#39;x,
};
</code></pre></div><h3 id="ld命令を実装する" tabindex="-1">LD命令を実装する <a class="header-anchor" href="#ld命令を実装する" aria-label="Permalink to “LD命令を実装する”">​</a></h3><p>メモリのデータ幅が64ビットに広がるため、 <code>rdata</code>に割り当てる値を、 アドレスの下位2ビットではなく下位3ビットで選択します (リスト32)。</p><p><span class="caption">▼リスト6.32: rdataの変更 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>rdata = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>: <span class="hljs-keyword">case</span> addr[<span class="custom-hl-bold"><span class="hljs-number">2</span></span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">0</span>      : {sext &amp; D[<span class="hljs-number">7</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">7</span>:<span class="hljs-number">0</span>]},
        <span class="hljs-number">1</span>      : {sext &amp; D[<span class="hljs-number">15</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">15</span>:<span class="hljs-number">8</span>]},
        <span class="hljs-number">2</span>      : {sext &amp; D[<span class="hljs-number">23</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">23</span>:<span class="hljs-number">16</span>]},
        <span class="hljs-number">3</span>      : {sext &amp; D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">24</span>]},
        <span class="custom-hl-bold"><span class="hljs-number">4</span>      : {sext &amp; D[<span class="hljs-number">39</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">39</span>:<span class="hljs-number">32</span>]},</span>
        <span class="custom-hl-bold"><span class="hljs-number">5</span>      : {sext &amp; D[<span class="hljs-number">47</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">47</span>:<span class="hljs-number">40</span>]},</span>
        <span class="custom-hl-bold"><span class="hljs-number">6</span>      : {sext &amp; D[<span class="hljs-number">55</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">55</span>:<span class="hljs-number">48</span>]},</span>
        <span class="custom-hl-bold"><span class="hljs-number">7</span>      : {sext &amp; D[<span class="hljs-number">63</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">63</span>:<span class="hljs-number">56</span>]},</span>
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">case</span> addr[<span class="custom-hl-bold"><span class="hljs-number">2</span></span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">0</span>      : {sext &amp; D[<span class="hljs-number">15</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>]},
        <span class="hljs-number">2</span>      : {sext &amp; D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">16</span>]},
        <span class="custom-hl-bold"><span class="hljs-number">4</span>      : {sext &amp; D[<span class="hljs-number">47</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">47</span>:<span class="hljs-number">32</span>]},</span>
        <span class="custom-hl-bold"><span class="hljs-number">6</span>      : {sext &amp; D[<span class="hljs-number">63</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">63</span>:<span class="hljs-number">48</span>]},</span>
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="custom-hl-bold"><span class="hljs-number">2&#39;b10</span>: <span class="hljs-keyword">case</span> addr[<span class="hljs-number">2</span>:<span class="hljs-number">0</span>] {</span>
    <span class="custom-hl-bold">    <span class="hljs-number">0</span>      : {sext &amp; D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">32</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">0</span>]},</span>
    <span class="custom-hl-bold">    <span class="hljs-number">4</span>      : {sext &amp; D[<span class="hljs-number">63</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">32</span>, D[<span class="hljs-number">63</span>:<span class="hljs-number">32</span>]},</span>
    <span class="custom-hl-bold">    <span class="hljs-keyword">default</span>: &#39;x,</span>
    <span class="custom-hl-bold">},</span>
    <span class="custom-hl-bold"><span class="hljs-number">2&#39;b11</span>  :</span> D,
    <span class="hljs-keyword">default</span>: &#39;x,
};
</code></pre></div><h3 id="ld、sd命令をテストする" tabindex="-1">LD、SD命令をテストする <a class="header-anchor" href="#ld、sd命令をテストする" aria-label="Permalink to “LD、SD命令をテストする”">​</a></h3><p>LD、SD命令のテストを実行する前に、 メモリのデータ単位が4バイトから8バイトになったため、 テストのHEXファイルを4バイト単位の改行から8バイト単位の改行に変更します (リスト33)。</p><p><span class="caption">▼リスト6.33: HEXファイルを8バイト単位に変更する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash"><span class="hljs-built_in">cd</span> <span class="hljs-built_in">test</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">find share/ -<span class="hljs-built_in">type</span> f -name <span class="hljs-string">&quot;*.bin&quot;</span> -<span class="hljs-built_in">exec</span> sh -c <span class="hljs-string">&quot;python3 bin2hex.py 8 {} &gt; {}.hex&quot;</span> \\;</span>
</code></pre></div><p>riscv-testsを実行します(リスト34)。</p><p><span class="caption">▼リスト6.34: RV32I、RV64Iをテストする</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv32ui-p-</span>
...
Test Result : 40 / 40
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-</span>
...
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
...
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-ld.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv64ui-p-sd.bin.hex
...
Test Result : 51 / 52
</code></pre></div><p>RV64IのCPUを実装できました。</p>`,148)])])}const y=a(o,[["render",d]]);export{v as __pageData,y as default};
