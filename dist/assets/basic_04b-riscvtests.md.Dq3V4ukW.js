import{_ as a,c as n,o as t,af as e}from"./chunks/framework.D5l_65jD.js";const d=JSON.parse('{"title":"riscv-testsによるテスト","description":"","frontmatter":{},"headers":[],"relativePath":"basic/04b-riscvtests.md","filePath":"basic/04b-riscvtests.md"}'),p={name:"basic/04b-riscvtests.md"};function l(r,s,c,i,o,h){return t(),n("div",null,[...s[0]||(s[0]=[e(`<h1 id="riscv-testsによるテスト" tabindex="-1">riscv-testsによるテスト <a class="header-anchor" href="#riscv-testsによるテスト" aria-label="Permalink to “riscv-testsによるテスト”">​</a></h1><p>第3章では、RV32IのCPUを実装しました。 簡単なテストを作成して動作を確かめましたが、 まだテストできていない命令が複数あります。 そこで、riscv-testsというテストを利用することで、 CPUがある程度正しく動いているらしいことを確かめます。</p><h2 id="riscv-testsとは何か" tabindex="-1">riscv-testsとは何か? <a class="header-anchor" href="#riscv-testsとは何か" aria-label="Permalink to “riscv-testsとは何か?”">​</a></h2><p>riscv-testsは、RISC-Vのプロセッサ向けのユニットテストやベンチマークテストの集合です。 命令や機能ごとにテストが用意されており、 これを利用することで簡単に実装を確かめられます。 すべての命令のすべての場合を網羅するようなテストではないため、 riscv-testsをパスしても、確実に実装が正しいとは言えないことに注意してください<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><p>GitHubの<a href="https://github.com/riscv-software-src/riscv-tests" target="_blank" rel="noreferrer">riscv-software-src/riscv-tests</a> からソースコードをダウンロードできます。</p><h2 id="riscv-testsのビルド" tabindex="-1">riscv-testsのビルド <a class="header-anchor" href="#riscv-testsのビルド" aria-label="Permalink to “riscv-testsのビルド”">​</a></h2><div class="info custom-block"><p class="custom-block-title"><b>riscv-testsのビルドが面倒、もしくはよく分からなくなってしまった方へ</b></p><p><a href="https://github.com/nananapo/riscv-tests-bin/tree/bin4" target="_blank" rel="noreferrer">https://github.com/nananapo/riscv-tests-bin/tree/bin4</a></p><p>完成品を上記のURLにおいておきます。 core/testにコピーしてください。</p></div><h3 id="riscv-testsをビルドする" tabindex="-1">riscv-testsをビルドする <a class="header-anchor" href="#riscv-testsをビルドする" aria-label="Permalink to “riscv-testsをビルドする”">​</a></h3><p>まず、riscv-testsをcloneします (リスト1)。</p><p><span class="caption">▼リスト5.1: riscv-testsのclone</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">git <span class="hljs-built_in">clone</span> https://github.com/riscv-software-src/riscv-tests</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash"><span class="hljs-built_in">cd</span> riscv-tests</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">git submodule update --init --recursive</span>
</code></pre></div><p>riscv-testsは、 プログラムの実行が<code>0x80000000</code>から始まると仮定した設定になっています。 しかし、CPUはアドレス<code>0x00000000</code>から実行を開始するため、 リンカにわたす設定ファイル<code>env/p/link.ld</code>を変更する必要があります(リスト2)。</p><p><span class="caption">▼リスト5.2: riscv-tests/env/p/link.ld</span></p><div class="language-ld"><button title="Copy Code" class="copy"></button><span class="lang">ld</span><pre class="hljs"><code>OUTPUT_ARCH( &quot;riscv&quot; )
ENTRY(_start)

SECTIONS
{
  . = <span class="custom-hl-bold">0x00000000</span>; ← 先頭を0x00000000に変更する
</code></pre></div><p>riscv-testsをビルドします。 必要なソフトウェアがインストールされていない場合、適宜インストールしてください (リスト3)。</p><p><span class="caption">▼リスト5.3: riscv-testsのビルド</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash"><span class="hljs-built_in">cd</span> riscv-testsを<span class="hljs-built_in">clone</span>したディレクトリ</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">autoconf</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./configure --prefix=core/testへのパス</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make install</span>
</code></pre></div><p>core/testにshareディレクトリが作成されます。</p><h3 id="成果物を-readmemhで読み込める形式に変換する" tabindex="-1">成果物を$readmemhで読み込める形式に変換する <a class="header-anchor" href="#成果物を-readmemhで読み込める形式に変換する" aria-label="Permalink to “成果物を$readmemhで読み込める形式に変換する”">​</a></h3><p>riscv-testsをビルドできましたが、 これは<code>$readmemh</code>システムタスクで読み込める形式(以降HEX形式と呼びます)ではありません。 これをCPUでテストを実行できるように、 ビルドしたテストのバイナリファイルをHEX形式に変換します。</p><p>まず、バイナリファイルをHEX形式に変換するPythonプログラム<code>test/bin2hex.py</code>を作成します(リスト4)。</p><p><span class="caption">▼リスト5.4: test/bin2hex.py</span></p><div class="language-py"><button title="Copy Code" class="copy"></button><span class="lang">py</span><pre class="hljs"><code><span class="hljs-keyword">import</span> sys

<span class="hljs-comment"># 使い方を表示する</span>
<span class="hljs-keyword">def</span> <span class="hljs-title function_">print_usage</span>():
    <span class="hljs-built_in">print</span>(sys.argv[<span class="hljs-number">1</span>])
    <span class="hljs-built_in">print</span>(<span class="hljs-string">&quot;Usage:&quot;</span>, sys.argv[<span class="hljs-number">0</span>], <span class="hljs-string">&quot;[bytes per line] [filename]&quot;</span>)
    exit()

<span class="hljs-comment"># コマンドライン引数を受け取る</span>
args = sys.argv[<span class="hljs-number">1</span>:]
<span class="hljs-keyword">if</span> <span class="hljs-built_in">len</span>(args) != <span class="hljs-number">2</span>:
    print_usage()
BYTES_PER_LINE = <span class="hljs-literal">None</span>
<span class="hljs-keyword">try</span>:
    BYTES_PER_LINE = <span class="hljs-built_in">int</span>(args[<span class="hljs-number">0</span>])
<span class="hljs-keyword">except</span>:
    print_usage()
FILE_NAME = args[<span class="hljs-number">1</span>]

<span class="hljs-comment"># バイナリファイルを読み込む</span>
allbytes = []
<span class="hljs-keyword">with</span> <span class="hljs-built_in">open</span>(FILE_NAME, <span class="hljs-string">&quot;rb&quot;</span>) <span class="hljs-keyword">as</span> f:
    allbytes = f.read()

<span class="hljs-comment"># 値を文字列に変換する</span>
bytestrs = []
<span class="hljs-keyword">for</span> b <span class="hljs-keyword">in</span> allbytes:
    bytestrs.append(<span class="hljs-built_in">format</span>(b, <span class="hljs-string">&#39;02x&#39;</span>))

<span class="hljs-comment"># 00を足すことでBYTES_PER_LINEの倍数に揃える</span>
bytestrs += [<span class="hljs-string">&quot;00&quot;</span>] * (BYTES_PER_LINE - <span class="hljs-built_in">len</span>(bytestrs) % BYTES_PER_LINE)

<span class="hljs-comment"># 出力</span>
results = []
<span class="hljs-keyword">for</span> i <span class="hljs-keyword">in</span> <span class="hljs-built_in">range</span>(<span class="hljs-number">0</span>, <span class="hljs-built_in">len</span>(bytestrs), BYTES_PER_LINE):
    s = <span class="hljs-string">&quot;&quot;</span>
    <span class="hljs-keyword">for</span> j <span class="hljs-keyword">in</span> <span class="hljs-built_in">range</span>(BYTES_PER_LINE):
        s += bytestrs[i + BYTES_PER_LINE - j - <span class="hljs-number">1</span>]
    results.append(s)
<span class="hljs-built_in">print</span>(<span class="hljs-string">&quot;\\n&quot;</span>.join(results))
</code></pre></div><p>このプログラムは、 第二引数に指定されるバイナリファイルを、 第一引数に与えられた数のバイト毎に区切り、 16進数のテキストで出力します。</p><p>HEXファイルに変換する前に、ビルドした成果物を確認する必要があります。 例えば<code>test/share/riscv-tests/isa/rv32ui-p-add</code>はELFファイル<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>です。 CPUはELFを直接に実行する機能を持っていないため、 <code>riscv64-unknown-elf-objcopy</code>を利用して、 ELFファイルを余計な情報を取り除いたバイナリファイルに変換します(リスト5)。</p><p><span class="caption">▼リスト5.5: ELFファイルをバイナリファイルに変換する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">find share/ -<span class="hljs-built_in">type</span> f -not -name <span class="hljs-string">&quot;*.dump&quot;</span> -<span class="hljs-built_in">exec</span> riscv32-unknown-elf-objcopy -O binary {} {}.bin \\;</span>
</code></pre></div><p>最後に、objcopyで生成されたバイナリファイルを、 PythonプログラムでHEXファイルに変換します(リスト6)。</p><p><span class="caption">▼リスト5.6: バイナリファイルをHEXファイルに変換する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">find share/ -<span class="hljs-built_in">type</span> f -name <span class="hljs-string">&quot;*.bin&quot;</span> -<span class="hljs-built_in">exec</span> sh -c <span class="hljs-string">&quot;python3 bin2hex.py 4 {} &gt; {}.hex&quot;</span> \\;</span>
</code></pre></div><h2 id="テスト内容の確認" tabindex="-1">テスト内容の確認 <a class="header-anchor" href="#テスト内容の確認" aria-label="Permalink to “テスト内容の確認”">​</a></h2><p>riscv-testsには複数のテストが用意されていますが、 本章では、名前が<code>rv32ui-p-</code>から始まるRV32I向けのテストを利用します。</p><p>例えば、ADD命令のテストである<code>test/share/riscv-tests/isa/rv32ui-p-add.dump</code>を読んでみます(リスト7)。 <code>rv32ui-p-add.dump</code>は、<code>rv32ui-p-add</code>のダンプファイルです。</p><p><span class="caption">▼リスト5.7: rv32ui-p-add.dump</span></p><div class="language-dump"><button title="Copy Code" class="copy"></button><span class="lang">dump</span><pre class="hljs"><code>Disassembly of section .text.init:

00000000 &lt;_start&gt;:
   0:   0500006f                j       50 &lt;reset_vector&gt;

00000004 &lt;trap_vector&gt;:
   4:   34202f73                csrr    t5,mcause ← t5 = mcause
  ...
  18:   00b00f93                li      t6,11
  1c:   03ff0063                beq     t5,t6,3c &lt;write_tohost&gt;
  ...

0000003c &lt;write_tohost&gt;: ← 0x1000にテスト結果を書き込む
  3c:   00001f17                auipc   t5,0x1
  40:   fc3f2223                sw      gp,-60(t5) # 1000 &lt;tohost&gt;
  ...

00000050 &lt;reset_vector&gt;:
  50:   00000093                li      ra,0
 ...    ← レジスタ値のゼロ初期化
  c8:   00000f93                li      t6,0
 ...    
 130:   00000297                auipc   t0,0x0
 134:   ed428293                addi    t0,t0,-300 # 4 &lt;trap_vector&gt;
 138:   30529073                csrw    mtvec,t0 ← mtvecにtrap_vectorのアドレスを書き込む
 ...    
 178:   00000297                auipc   t0,0x0
 17c:   01428293                addi    t0,t0,20 # 18c &lt;test_2&gt;
 180:   34129073                csrw    mepc,t0 ← mepcにtest_2のアドレスを書き込む
 ...    
 188:   30200073                mret ← mepcのアドレス=test_2にジャンプする

0000018c &lt;test_2&gt;: ← 0 + 0 = 0のテスト
 18c:   00200193                li      gp,2 ← gp = 2
 190:   00000593                li      a1,0
 194:   00000613                li      a2,0
 198:   00c58733                add     a4,a1,a2
 19c:   00000393                li      t2,0
 1a0:   4c771663                bne     a4,t2,66c &lt;fail&gt;
 ...
0000066c &lt;fail&gt;: ← 失敗したときのジャンプ先
 ...
 674:   00119193                sll     gp,gp,0x1 ← gpを1ビット左シフトする
 678:   0011e193                or      gp,gp,1 ← gpのLSBを1にする
 ...
 684:   00000073                ecall

00000688 &lt;pass&gt;: ← すべてのテストに成功したときのジャンプ先
 ...
 68c:   00100193                li      gp,1 ← gp = 1
 690:   05d00893                li      a7,93
 694:   00000513                li      a0,0
 698:   00000073                ecall
 69c:   c0001073                unimp
</code></pre></div><p>命令のテストは次の流れで実行されます。</p><ol><li>_start : reset_vectorにジャンプする。</li><li>reset_vector : 各種状態を初期化する。</li><li>test_* : テストを実行する。命令の結果がおかしかったらfailにジャンプする。最後まで正常に実行できたらpassにジャンプする。</li><li>fail、pass : テストの成否をレジスタに書き込み、trap_vectorにジャンプする。</li><li>trap_vector : write_tohostにジャンプする。</li><li>write_tohost : テスト結果をメモリに書き込む。ここでループする。</li></ol><p><code>_start</code>から実行を開始し、最終的に<code>write_tohost</code>に移動します。 テスト結果はメモリの<code>.tohost</code>に書き込まれます。 <code>.tohost</code>のアドレスは、リンカの設定ファイルに記述されています(リスト8)。 プログラムのサイズは<code>0x1000</code>よりも小さいため、 <code>.tohost</code>のアドレスは<code>0x1000</code>になります。</p><p><span class="caption">▼リスト5.8: riscv-tests/env/p/link.ld</span></p><div class="language-ld"><button title="Copy Code" class="copy"></button><span class="lang">ld</span><pre class="hljs"><code>OUTPUT_ARCH( &quot;riscv&quot; )
ENTRY(_start)

SECTIONS
{
  . = 0x00000000;
  .text.init : { *(.text.init) }
  <span class="custom-hl-bold">. = ALIGN(0x1000);</span>
  <span class="custom-hl-bold">.tohost : { *(.tohost) }</span>
</code></pre></div><h2 id="テストの終了検知" tabindex="-1">テストの終了検知 <a class="header-anchor" href="#テストの終了検知" aria-label="Permalink to “テストの終了検知”">​</a></h2><p>テストを実行するとき、テストの終了を検知して、成功か失敗かを報告する必要があります。</p><p>riscv-testsはテストの終了を示すために、<code>.tohost</code>にLSBが<code>1</code>な値を書き込みます。 書き込まれた値が<code>32&#39;h1</code>のとき、テストが正常に終了したことを表しています。 それ以外のときは、テストが失敗したことを表しています。</p><p>riscv-testsが終了したことを検知する処理をtopモジュールに記述します。 topモジュールでメモリへのアクセスを監視し、 <code>.tohost</code>にLSBが<code>1</code>な値が書き込まれたら、 <code>test_success</code>に結果を書き込んでテストを終了します。 (リスト9)。</p><p><span class="caption">▼リスト5.9: メモリアクセスを監視して終了を検知する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// riscv-testsの終了を検知する</span>
#[ifdef(TEST_MODE)]
<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">let</span> RISCVTESTS_TOHOST_ADDR: Addr = <span class="hljs-number">&#39;h1000</span> <span class="hljs-keyword">as</span> Addr;
    <span class="hljs-keyword">if</span> d_membus.valid &amp;&amp; d_membus.ready &amp;&amp; d_membus.wen == <span class="hljs-number">1</span> &amp;&amp; d_membus.addr == RISCVTESTS_TOHOST_ADDR &amp;&amp; d_membus.wdata[<span class="hljs-keyword">lsb</span>] == <span class="hljs-number">1&#39;b1</span> {
        test_success = d_membus.wdata == <span class="hljs-number">1</span>;
        <span class="hljs-keyword">if</span> d_membus.wdata == <span class="hljs-number">1</span> {
            $display(<span class="hljs-string">&quot;riscv-tests success!&quot;</span>);
        } <span class="hljs-keyword">else</span> {
            $display(<span class="hljs-string">&quot;riscv-tests failed!&quot;</span>);
            $error  (<span class="hljs-string">&quot;wdata : %h&quot;</span>, d_membus.wdata);
        }
        $finish();
    }
}
</code></pre></div><p><code>test_success</code>はポートとして定義します (リスト10)。</p><p><span class="caption">▼リスト5.10: テスト結果を報告するためのポートを宣言する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> top #(
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH_IS_ENV: <span class="hljs-keyword">bit</span>    = <span class="hljs-number">1</span>                 ,
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH       : <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>,
) (
    clk: <span class="hljs-keyword">input</span> <span class="hljs-keyword">clock</span>,
    rst: <span class="hljs-keyword">input</span> <span class="hljs-keyword">reset</span>,
    <span class="custom-hl-bold">#[ifdef(TEST_MODE)]</span>
    <span class="custom-hl-bold">test_success: <span class="hljs-keyword">output</span> <span class="hljs-keyword">bit</span>,</span>
) {
</code></pre></div><p>アトリビュートによって、 終了検知のコードと<code>test_success</code>ポートは <code>TEST_MODE</code>マクロが定義されているときにのみ存在するようになっています。</p><h2 id="テストの実行" tabindex="-1">テストの実行 <a class="header-anchor" href="#テストの実行" aria-label="Permalink to “テストの実行”">​</a></h2><p>試しにADD命令のテストを実行してみましょう。 ADD命令のテストのHEXファイルは<code>test/share/riscv-tests/isa/rv32ui-p-add.bin.hex</code>です。</p><p>TEST_MODEマクロを定義してシミュレータをビルドし、正常に動くことを確認します(リスト11)。</p><p><span class="caption">▼リスト5.11: ADD命令のriscv-testsを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span> ← TEST_MODEマクロを定義してビルドする</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/share/riscv-tests/isa/rv32ui-p-add.bin.hex 0</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 0500006f
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   8</span>
00000050 : 00000093
...
<span class="hljs-meta prompt_"># </span><span class="language-bash">                 593</span>
00000040 : fc3f2223
  itype     : 000100
  imm       : ffffffc4
  rs1[30]   : 0000103c
  rs2[ 3]   : 00000001
  op1       : 0000103c
  op2       : ffffffc4
  alu res   : 00001000
  mem stall : 1
  mem rdata : ff1ff06f
riscv-tests success!
- ~/core/src/top.sv:26: Verilog $finish
</code></pre></div><p><code>riscv-tests success!</code>と表示され、テストが正常終了しました<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>。</p><h2 id="複数のテストの自動実行" tabindex="-1">複数のテストの自動実行 <a class="header-anchor" href="#複数のテストの自動実行" aria-label="Permalink to “複数のテストの自動実行”">​</a></h2><p>ADD命令以外の命令もテストしたいですが、わざわざコマンドを手打ちしたくありません。 自動でテストを実行して、その結果を報告するプログラムを作成しましょう。</p><p><code>test/test.py</code>を作成し、次のように記述します(リスト12)。</p><p><span class="caption">▼リスト5.12: test.py</span></p><div class="language-py"><button title="Copy Code" class="copy"></button><span class="lang">py</span><pre class="hljs"><code><span class="hljs-keyword">import</span> argparse
<span class="hljs-keyword">import</span> os
<span class="hljs-keyword">import</span> subprocess

parser = argparse.ArgumentParser()
parser.add_argument(<span class="hljs-string">&quot;sim_path&quot;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;path to simlator&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;dir&quot;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;directory includes test&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;files&quot;</span>, nargs=<span class="hljs-string">&#39;*&#39;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;test hex file names&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;-r&quot;</span>, <span class="hljs-string">&quot;--recursive&quot;</span>, action=<span class="hljs-string">&#39;store_true&#39;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;search file recursively&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;-e&quot;</span>, <span class="hljs-string">&quot;--extension&quot;</span>, default=<span class="hljs-string">&quot;hex&quot;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;test file extension&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;-o&quot;</span>, <span class="hljs-string">&quot;--output_dir&quot;</span>, default=<span class="hljs-string">&quot;results&quot;</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;result output directory&quot;</span>)
parser.add_argument(<span class="hljs-string">&quot;-t&quot;</span>, <span class="hljs-string">&quot;--time_limit&quot;</span>, <span class="hljs-built_in">type</span>=<span class="hljs-built_in">float</span>, default=<span class="hljs-number">10</span>, <span class="hljs-built_in">help</span>=<span class="hljs-string">&quot;limit of execution time. set 0 to nolimit&quot;</span>)
args = parser.parse_args()

<span class="hljs-comment"># run test</span>
<span class="hljs-keyword">def</span> <span class="hljs-title function_">test</span>(<span class="hljs-params">file_name</span>):
    result_file_path = os.path.join(args.output_dir, file_name.replace(os.sep, <span class="hljs-string">&quot;_&quot;</span>) + <span class="hljs-string">&quot;.txt&quot;</span>)
    cmd = args.sim_path + <span class="hljs-string">&quot; &quot;</span> + file_name + <span class="hljs-string">&quot; 0&quot;</span>
    success = <span class="hljs-literal">False</span>
    <span class="hljs-keyword">with</span> <span class="hljs-built_in">open</span>(result_file_path, <span class="hljs-string">&quot;w&quot;</span>) <span class="hljs-keyword">as</span> f:
        no = f.fileno()
        p = subprocess.Popen(<span class="hljs-string">&quot;exec &quot;</span> + cmd, shell=<span class="hljs-literal">True</span>, stdout=no, stderr=no)
        <span class="hljs-keyword">try</span>:
            p.wait(<span class="hljs-literal">None</span> <span class="hljs-keyword">if</span> args.time_limit == <span class="hljs-number">0</span> <span class="hljs-keyword">else</span> args.time_limit)
            success = p.returncode == <span class="hljs-number">0</span>
        <span class="hljs-keyword">except</span>: <span class="hljs-keyword">pass</span>
        <span class="hljs-keyword">finally</span>:
            p.terminate()
            p.kill()
    <span class="hljs-built_in">print</span>((<span class="hljs-string">&quot;PASS&quot;</span> <span class="hljs-keyword">if</span> success <span class="hljs-keyword">else</span> <span class="hljs-string">&quot;FAIL&quot;</span>) + <span class="hljs-string">&quot; : &quot;</span>+ file_name)
    <span class="hljs-keyword">return</span> (file_name, success)

<span class="hljs-comment"># search files</span>
<span class="hljs-keyword">def</span> <span class="hljs-title function_">dir_walk</span>(<span class="hljs-params"><span class="hljs-built_in">dir</span></span>):
    <span class="hljs-keyword">for</span> entry <span class="hljs-keyword">in</span> os.scandir(<span class="hljs-built_in">dir</span>):
        <span class="hljs-keyword">if</span> entry.is_dir():
            <span class="hljs-keyword">if</span> args.recursive:
                <span class="hljs-keyword">for</span> e <span class="hljs-keyword">in</span> dir_walk(entry.path):
                    <span class="hljs-keyword">yield</span> e
            <span class="hljs-keyword">continue</span>
        <span class="hljs-keyword">if</span> entry.is_file():
            <span class="hljs-keyword">if</span> <span class="hljs-keyword">not</span> entry.name.endswith(args.extension):
                <span class="hljs-keyword">continue</span>
            <span class="hljs-keyword">if</span> <span class="hljs-built_in">len</span>(args.files) == <span class="hljs-number">0</span>:
                <span class="hljs-keyword">yield</span> entry.path
            <span class="hljs-keyword">for</span> f <span class="hljs-keyword">in</span> args.files:
                <span class="hljs-keyword">if</span> entry.name.find(f) != -<span class="hljs-number">1</span>:
                    <span class="hljs-keyword">yield</span> entry.path
                    <span class="hljs-keyword">break</span>

<span class="hljs-keyword">if</span> __name__ == <span class="hljs-string">&#39;__main__&#39;</span>:
    os.makedirs(args.output_dir, exist_ok=<span class="hljs-literal">True</span>)

    res_strs = []
    res_statuses = []

    <span class="hljs-keyword">for</span> hexpath <span class="hljs-keyword">in</span> dir_walk(args.<span class="hljs-built_in">dir</span>):
        f, s = test(os.path.abspath(hexpath))
        res_strs.append((<span class="hljs-string">&quot;PASS&quot;</span> <span class="hljs-keyword">if</span> s <span class="hljs-keyword">else</span> <span class="hljs-string">&quot;FAIL&quot;</span>) + <span class="hljs-string">&quot; : &quot;</span> + f)
        res_statuses.append(s)

    res_strs = <span class="hljs-built_in">sorted</span>(res_strs)
    statusText = <span class="hljs-string">&quot;Test Result : &quot;</span> + <span class="hljs-built_in">str</span>(<span class="hljs-built_in">sum</span>(res_statuses)) + <span class="hljs-string">&quot; / &quot;</span> + <span class="hljs-built_in">str</span>(<span class="hljs-built_in">len</span>(res_statuses))

    <span class="hljs-keyword">with</span> <span class="hljs-built_in">open</span>(os.path.join(args.output_dir, <span class="hljs-string">&quot;result.txt&quot;</span>), <span class="hljs-string">&quot;w&quot;</span>, encoding=<span class="hljs-string">&#39;utf-8&#39;</span>) <span class="hljs-keyword">as</span> f:
        f.write(statusText + <span class="hljs-string">&quot;\\n&quot;</span>)
        f.write(<span class="hljs-string">&quot;\\n&quot;</span>.join(res_strs))

    <span class="hljs-built_in">print</span>(statusText)

    <span class="hljs-keyword">if</span> <span class="hljs-built_in">sum</span>(res_statuses) != <span class="hljs-built_in">len</span>(res_statuses):
        exit(<span class="hljs-number">1</span>)
</code></pre></div><p>このPythonプログラムは、 第2引数で指定したディレクトリに存在する、 第3引数で指定した文字列を名前に含むファイルを、 第1引数で指定したシミュレータで実行し、 その結果を報告します。</p><p>次のオプションの引数が存在します。</p><dl><dt>-r</dt><dd> 第2引数で指定されたディレクトリの中にあるディレクトリも走査します。 デフォルトでは走査しません。 </dd><dt>-e 拡張子</dt><dd> 指定した拡張子のファイルのみを対象にテストします。 HEXファイルをテストしたい場合は、\`-e hex\`にします。 デフォルトでは\`hex\`が指定されています。 </dd><dt>-o ディレクトリ</dt><dd> 指定したディレクトリにテスト結果を格納します。 デフォルトでは\`result\`ディレクトリに格納します。 </dd><dt>-t 時間</dt><dd> テストに時間制限を設けます。 0を指定すると時間制限はなくなります。 デフォルト値は10(秒)です。 </dd></dl><p>テストが成功したか失敗したかの判定には、 シミュレータの終了コードを利用しています。 テストが失敗したときに終了コードが<code>1</code>になるように、 Verilatorに渡しているC++プログラムを変更します (リスト13)。</p><p><span class="caption">▼リスト5.13: tb_verilator.cpp</span></p><div class="language-cpp"><button title="Copy Code" class="copy"></button><span class="lang">cpp</span><pre class="hljs"><code><span class="hljs-meta">#<span class="hljs-keyword">ifdef</span> TEST_MODE</span>
    <span class="hljs-keyword">return</span> dut-&gt;test_success != <span class="hljs-number">1</span>;
<span class="hljs-meta">#<span class="hljs-keyword">endif</span></span>
</code></pre></div><p>それでは、RV32Iのテストを実行しましょう。 riscv-testsのRV32I向けのテストの接頭辞である<code>rv32ui-p-</code>を引数に指定します(リスト14)。</p><p><span class="caption">▼リスト5.14: rv32ui-pから始まるテストを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv32ui-p-</span>
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lh.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sb.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sltiu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sh.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bltu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-or.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sra.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-xor.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-addi.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srai.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-auipc.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slli.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slti.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lb.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bge.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sub.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-xori.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sw.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-beq.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-fence_i.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-jal.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-and.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lui.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bgeu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-slt.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sll.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-jalr.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-add.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-simple.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-andi.bin.hex
FAIL : ~/core/test/share/riscv-tests/isa/rv32ui-p-ma_data.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lhu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-lbu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-sltu.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-ori.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-blt.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-bne.bin.hex
PASS : ~/core/test/share/riscv-tests/isa/rv32ui-p-srl.bin.hex
Test Result : 39 / 40
</code></pre></div><p><code>rv32ui-p-</code>から始まる40個のテストの内、39個のテストに成功しました。 テストの詳細な結果はresultsディレクトリに格納されています。</p><p><code>rv32ui-p-ma_data</code>は、 ロードストアするサイズに整列されていないアドレスへのロードストア命令のテストです。 これは後の章で例外として対処するため、今は無視します。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>実装の正しさを完全に確かめるには形式的検証(formal verification)を行う必要があります <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>ELF(Executable and Linkable Format)とは実行可能ファイルの形式です <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>実行が終了しない場合はどこかしらにバグがあります。rv32ui-p-add.dumpと実行ログを見比べて、頑張って原因を探してください <a href="#fnref3" class="footnote-backref">↩︎</a></p></li></ol></section>`,74)])])}const j=a(p,[["render",l]]);export{d as __pageData,j as default};
