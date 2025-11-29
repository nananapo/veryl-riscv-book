import{_ as s,c as n,o as l,ah as e,aA as p,aB as c,aC as d,aD as t,aE as r,aF as o,aG as i}from"./chunks/framework.BNheOMQd.js";const j=JSON.parse('{"title":"CPUのパイプライン化","description":"","frontmatter":{},"headers":[],"relativePath":"05a-pipeline.md","filePath":"05a-pipeline.md"}'),b={name:"05a-pipeline.md"};function h(m,a,_,f,u,y){return l(),n("div",null,[...a[0]||(a[0]=[e('<h1 id="cpuのパイプライン化" tabindex="-1">CPUのパイプライン化 <a class="header-anchor" href="#cpuのパイプライン化" aria-label="Permalink to “CPUのパイプライン化”">​</a></h1><p>これまでの章では、 同時に1つの命令を実行するCPUを実装しました。 高機能なCPUを実装するのは面白いですが、 プログラムの実行が遅くてはいけません。 機能を増やす前に、一度性能のことを考えてみましょう。</p><h2 id="cpuの速度" tabindex="-1">CPUの速度 <a class="header-anchor" href="#cpuの速度" aria-label="Permalink to “CPUの速度”">​</a></h2><p>CPUの性能指標は、 例えば消費電力や実行速度が考えられます。 本章では、プログラムの実行速度を考えます。</p><h3 id="cpuの性能を考える" tabindex="-1">CPUの性能を考える <a class="header-anchor" href="#cpuの性能を考える" aria-label="Permalink to “CPUの性能を考える”">​</a></h3><p>性能の比較にはクロック周波数やコア数などが用いられますが、 プログラムの実行速度を比較する場合、 プログラムの実行にかかる時間のみが絶対的な指標になります。 プログラムの実行時間は、次のような式で表せます (図1)</p><p><img src="'+p+'" alt="CPU性能方程式"> それぞれの用語の定義は次の通りです。</p><dl><dt>CPU時間 (CPU time)</dt><dd> プログラムの実行のためにCPUが費やした時間 </dd><dt>実行命令数</dt><dd> プログラムの実行で実行される命令数 </dd><dt>CPI (Clock cycles Per Instruction)</dt><dd> プログラム全体またはプログラムの一部分の命令を実行した時の1命令当たりの平均クロック・サイクル数 </dd><dt>クロック周波数 (clock rate)</dt><dd> クロック・サイクル時間(clock cycle time)の逆数<br> クロック・サイクル時間は、クロックが`0`→`1`→`0`になる周期のこと </dd></dl><p>今のところ、CPUは命令をスキップしたり無駄に実行することはありません。 そのため、実行命令数は、プログラムを1命令ずつ順に実行していった時の実行命令数になります。</p><p>CPIを計測するためには、 何の命令にどれだけのクロック・サイクル数がかかるかと、 それぞれの命令の割合が必要です。 今のところ、 メモリにアクセスする命令は3 ～ 4クロック、 それ以外の命令は1クロックで実行されます。 命令の割合は考えないでおきます。</p><p>クロック周波数は、CPUの回路のクリティカルパスの長さによって決まります。 クリティカルパスとは、組み合わせ回路の中で最も大きな遅延を持つ経路のことです。</p><h3 id="実行速度を上げる方法を考える" tabindex="-1">実行速度を上げる方法を考える <a class="header-anchor" href="#実行速度を上げる方法を考える" aria-label="Permalink to “実行速度を上げる方法を考える”">​</a></h3><p>CPU性能方程式の各項に注目すると、 CPU時間を減らすためには、 実行命令数を減らすか、 CPIを減らすか、 クロック周波数を増大させる必要があります。</p><h4 id="実行命令数に注目する" tabindex="-1">実行命令数に注目する <a class="header-anchor" href="#実行命令数に注目する" aria-label="Permalink to “実行命令数に注目する”">​</a></h4><p>実行命令数を減らすためには、 コンパイラによる最適化でプログラムの命令数を減らすソフトウェア的な方法と、 命令セットアーキテクチャ(ISA)を変更することで必要な命令数を減らす方法が存在します。 どちらも本書の目的とするところではないので、検討しません<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>。</p><h4 id="cpiに注目する" tabindex="-1">CPIに注目する <a class="header-anchor" href="#cpiに注目する" aria-label="Permalink to “CPIに注目する”">​</a></h4><p>CPIを減らすためには、 例えばどの命令も1クロックで実行してしまうという方法が考えられます。 しかし、そのために論理回路を大きくすると、 その分クリティカルパスが長くなってしまう場合があります。 また、1クロックに1命令しか実行しない場合、 どう頑張ってもCPIは1より小さくなりません。</p><p>CPIをより効果的に減らすためには、 1クロックで1つ以上の命令を実行開始し、 1つ以上の命令を実行完了すればいいです。 これを実現する手法として、 スーパースカラやアウトオブオーダー実行が存在します。 これらの手法はずっと後の章で解説、実装します。</p><h4 id="クロック周波数に注目する" tabindex="-1">クロック周波数に注目する <a class="header-anchor" href="#クロック周波数に注目する" aria-label="Permalink to “クロック周波数に注目する”">​</a></h4><p>クロック周波数を増大させるには、 クリティカルパスの長さを短くする必要があります。</p><p>今のところ、CPUは計算命令を1クロック(<strong>シングルサイクル</strong>)で実行します。 例えばADD命令を実行するとき、 FIFOに保存されたADD命令をデコードし、 命令のビット列をもとにレジスタの値を選択し、 ALUで足し算を実行し、 その結果をレジスタにライトバックします。 これらを1クロックで実行するということは、 命令が保存されている32ビットのレジスタと32*64ビットのレジスタファイルを入力に、 64ビットのADD演算の結果を出力する組み合わせ回路が存在するということです。 この回路は大変に段数の深い組み合わせ回路を必要とし、 長いクリティカルパスを生成する原因になります。</p><p>クロック周波数を増大させるもっとも単純な方法は、 命令の処理をいくつかの<strong>ステージ(段)</strong>に分割し、 複数クロックで1つの命令を実行することです。 複数のクロック・サイクルで命令を実行することから、 この形式のCPUは<strong>マルチサイクル</strong>CPUと呼びます。</p><p><img src="'+c+'" alt="命令の実行 (マルチサイクル)"> 命令の処理をいくつかのステージに分割すると、 それに合わせて回路の深さが軽減され、 クロック周波数を増大させられます。</p><p>図2では、 1つの命令を3クロック(ステージ)で実行しています。 3クロックもかかるのであれば、 CPIが3倍になり、 CPU時間が増えてしまいそうです。 しかし、処理を均等な3ステージに分割できた場合、 クロック周波数は3分の1になる<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>ため、 それほどCPU時間は増えません。</p><p>しかし、CPIがステージ分だけ増大してしまうのは問題です。 この問題は、命令の処理を、まるで車の組立のように流れ作業で行うことで緩和できます(図3)。 このような処理のことを、<strong>パイプライン処理</strong>と呼びます。</p><p><img src="'+d+'" alt="命令の実行 (パイプライン処理)"> 本章では、 CPUをパイプライン化することで性能の向上を図ります。</p><h3 id="パイプライン処理のステージを考える" tabindex="-1">パイプライン処理のステージを考える <a class="header-anchor" href="#パイプライン処理のステージを考える" aria-label="Permalink to “パイプライン処理のステージを考える”">​</a></h3><p>具体的に処理をどのようなステージに分割してパイプライン処理を実現すればいいでしょうか? これを考えるために、第3章の最初で検討したCPUの動作を振り返ります。 第3章では、CPUの動作を次のように順序付けしました。</p><ol><li>PCに格納されたアドレスにある命令をフェッチする</li><li>命令を取得したらデコードする</li><li>計算で使用するデータを取得する (レジスタの値を取得したり、即値を生成する)</li><li>計算する命令の場合、計算を行う</li><li>メモリにアクセスする命令の場合、メモリ操作を行う</li><li>計算やメモリアクセスの結果をレジスタに格納する</li><li>PCの値を次に実行する命令のアドレスに設定する</li></ol><p>もう少し大きな処理単位に分割しなおすと、 次の5つの処理(ステージ)を構成できます。 ステージ名の後ろに、それぞれ対応する上のリストの処理の番号を記載しています。</p><dl><dt>IF (Instruction Fetch) ステージ (1)</dt><dd> メモリから命令をフェッチします。<br> フェッチした命令をIDステージに受け渡します。 </dd><dt>ID (Instruction Decode) ステージ (2、3)</dt><dd> 命令をデコードし、制御フラグと即値を生成します。<br> 生成したデータをEXステージに渡します。 </dd><dt>EX (EXecute) ステージ (3、4)</dt><dd> 制御フラグ、即値、レジスタの値を利用し、ALUで計算します。<br> 分岐判定やジャンプ先の計算も行い、生成したデータをMEMステージに渡します。 </dd><dt>MEM (MEMory) ステージ (5、7)</dt><dd> メモリにアクセスする命令とCSR命令を処理します。<br> 分岐命令かつ分岐が成立する、ジャンプ命令である、またはトラップが発生するとき、 IF、ID、EXステージにある命令を無効化して、ジャンプ先をIFステージに伝えます。 メモリのロード、CSRの読み込み結果をWBステージに渡します。 </dd><dt>WB (WriteBack) ステージ (6)</dt><dd> ALUの演算結果、メモリやCSRの読み込み結果など、命令の処理結果をレジスタに書き込みます。 </dd></dl><p>MEMステージではジャンプするときにIF、ID、EXステージにある命令を無効化します。 これは、IF、ID、EXステージにある命令は、 ジャンプによって実行されない命令になるためです。 パイプラインのステージにある命令を無効化することを、 パイプラインを<strong>フラッシュ</strong>(flush)すると呼びます。</p><p>IF、ID、EX、MEM、WBの5段の構成を、 <strong>5段パイプライン</strong>(Five Stage Pipeline)と呼ぶことがあります。</p><div class="info custom-block"><p class="custom-block-title"><b>CSRをMEMステージで処理する</b></p><p>上記の5段のパイプライン処理では、CSRの処理をMEMステージで行っています。 これはいったいなぜでしょうか?</p><p>CPUにはECALL命令による例外しか実装してしないため、 EXステージでCSRの処理を行ってしまっても問題ありません。 しかし、他の例外、例えばメモリアクセスに伴う例外を実装するとき、 問題が生じます。</p><p>メモリアクセスに起因する例外が発生するのはMEMステージです。 このとき、EXステージでCSRの処理を行っていて、 EXステージに存在する命令がmtvecレジスタに書き込むCSRRW命令だった場合、 本来はMEMステージで発生した例外によって実行されないはずであるCSRRW命令によって、 既にmtvecレジスタが書き換えられているかもしれません。 これを復元する処理を書くことはできますが、 MEMステージ以降でCSRを処理することでもこの事態を回避できるため、 MEMステージでCSRを処理しています。</p></div><h2 id="パイプライン処理の実装" tabindex="-1">パイプライン処理の実装 <a class="header-anchor" href="#パイプライン処理の実装" aria-label="Permalink to “パイプライン処理の実装”">​</a></h2><h3 id="ステージに分割する準備をする" tabindex="-1">ステージに分割する準備をする <a class="header-anchor" href="#ステージに分割する準備をする" aria-label="Permalink to “ステージに分割する準備をする”">​</a></h3><p>それでは、CPUをパイプライン化します。</p><p>パイプライン処理では、 複数のステージがそれぞれ違う命令を処理します。 そのため、それぞれのステージのために、 現在処理している命令を保持するためのレジスタ(<strong>パイプラインレジスタ</strong>)を用意します。</p><p><img src="'+t+`" alt="パイプライン処理の概略図"> まず、処理を複数ステージに分割する前に、 既存の変数の名前を変更します。</p><p>coreモジュールでは、 命令をフェッチする処理に使う変数の名前の先頭に<code>if_</code>、 FIFOから取り出した命令の情報を表す変数の名前の先頭に<code>inst_</code>をつけています。</p><p>命令をフェッチする処理はIFステージに該当するため、 <code>if_</code>から始まる変数はこのままで問題ありません。 しかし、<code>inst_</code>から始まる変数は、 CPUの処理を複数ステージに分けたとき、 どのステージの変数か分からなくなります。 IFステージの次はIDステージであるため、 変数がIDステージのものであることを示す名前に変えてしまいます。</p><p><span class="caption">▼リスト7.1: 変数名を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/ce17345d3dc053dfaeb3bd3de7476570b62d9290~1..ce17345d3dc053dfaeb3bd3de7476570b62d9290#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> ids_valid    : <span class="hljs-keyword">logic</span>    = if_fifo_rvalid;
<span class="hljs-keyword">var</span> ids_is_new   : <span class="hljs-keyword">logic</span>   ; <span class="hljs-comment">// 命令が現在のクロックで供給されたかどうか</span>
<span class="hljs-keyword">let</span> ids_pc       : Addr     = if_fifo_rdata.addr;
<span class="hljs-keyword">let</span> ids_inst_bits: Inst     = if_fifo_rdata.bits;
<span class="hljs-keyword">var</span> ids_ctrl     : InstCtrl;
<span class="hljs-keyword">var</span> ids_imm      : UIntX   ;
</code></pre></div><p><code>inst_valid</code>、<code>inst_is_new</code>、<code>inst_pc</code>、 <code>inst_bits</code>、<code>inst_ctrl</code>、<code>inst_imm</code>の名前をリスト1のように変更します。 定義だけではなく、変数を使用しているところもすべて変更してください。</p><h3 id="fifoを作成する" tabindex="-1">FIFOを作成する <a class="header-anchor" href="#fifoを作成する" aria-label="Permalink to “FIFOを作成する”">​</a></h3><p>命令フェッチ処理とそれ以降の処理は、それぞれ独立して動作しています。 実は既にCPUは、IFとIDステージ(命令フェッチ以外の処理を行うステージ)の2ステージのパイプライン処理を行っています。</p><p>IFステージとIDステージはFIFOで区切られており、 FIFOのレジスタを経由して命令の受け渡しを行います。 これと同様に、 5ステージのパイプライン処理の実装では、 それぞれのステージをFIFOで接続します(図5)。 ただし、FIFOのサイズは1とします。 この場合、FIFOはただの1つのレジスタです。</p><p><img src="`+r+'" alt="FIFOを利用したパイプライン処理"> IFからIDへのFIFOは存在するため、 IDからEX、EXからMEM、MEMからWBへのFIFOを作成します。</p><h4 id="構造体の定義" tabindex="-1">構造体の定義 <a class="header-anchor" href="#構造体の定義" aria-label="Permalink to “構造体の定義”">​</a></h4><p><img src="'+o+`" alt="構造体のフィールドの生存区間"> まず、FIFOに格納するデータの型を定義します。 それぞれのフィールドが存在する区間は図6の通りです。</p><p><span class="caption">▼リスト7.2: ID → EXの間のFIFOのデータ型 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b3c950a53b53cc05ae2e45e89963766fe4ac035d~1..b3c950a53b53cc05ae2e45e89963766fe4ac035d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> exq_type {
    addr: Addr    ,
    bits: Inst    ,
    ctrl: InstCtrl,
    imm : UIntX   ,
}
</code></pre></div><p>IDステージは、IFステージから命令のアドレスと命令のビット列を受け取ります。 命令のビット列をデコードして、制御フラグと即値を生成し、EXステージに渡します(リスト2)。</p><p><span class="caption">▼リスト7.3: EX → MEMの間のFIFOのデータ型 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b3c950a53b53cc05ae2e45e89963766fe4ac035d~1..b3c950a53b53cc05ae2e45e89963766fe4ac035d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> memq_type {
    addr      : Addr       ,
    bits      : Inst       ,
    ctrl      : InstCtrl   ,
    imm       : UIntX      ,
    alu_result: UIntX      ,
    rs1_addr  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">5</span>&gt;,
    rs1_data  : UIntX      ,
    rs2_data  : UIntX      ,
    br_taken  : <span class="hljs-keyword">logic</span>      ,
    jump_addr : Addr       ,
}
</code></pre></div><p>EXステージは、IDステージで生成された制御フラグと即値と受け取ります。 整数演算命令のとき、レジスタの値を使って計算します。 分岐命令のとき、分岐判定を行います。 CSRやメモリアクセスでrs1とrs2を利用するため、 演算の結果とともにMEMステージに渡します(リスト3)。</p><p><span class="caption">▼リスト7.4: MEM → WBの間のFIFOのデータ型 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b3c950a53b53cc05ae2e45e89963766fe4ac035d~1..b3c950a53b53cc05ae2e45e89963766fe4ac035d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">struct</span> wbq_type {
    addr      : Addr    ,
    bits      : Inst    ,
    ctrl      : InstCtrl,
    imm       : UIntX   ,
    alu_result: UIntX   ,
    mem_rdata : UIntX   ,
    csr_rdata : UIntX   ,
}
</code></pre></div><p>MEMステージは、 メモリのロード結果とCSRの読み込みデータを生成し、 WBステージに渡します(リスト4)。</p><p>WBステージでは、 命令がライトバックする命令のとき、 即値、ALUの計算結果、メモリのロード結果、CSRの読み込みデータから1つを選択し、 レジスタに値を書き込みます。</p><p>構造体のフィールドの生存区間が図6のようになっている理由が分かったでしょうか?</p><h4 id="fifoのインスタンス化" tabindex="-1">FIFOのインスタンス化 <a class="header-anchor" href="#fifoのインスタンス化" aria-label="Permalink to “FIFOのインスタンス化”">​</a></h4><p>FIFOと接続するための変数を定義し、FIFOをインスタンス化します (リスト5、リスト6)。 <code>DATA_TYPE</code>パラメータには先ほど作成した構造体を設定します。 FIFOのデータ個数は1であるため、<code>WIDTH</code>パラメータには<code>1</code>を設定します<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>。 <code>mem_wb_fifo</code>の<code>flush</code>は<code>0</code>にしています。</p><p><span class="caption">▼リスト7.5: FIFOと接続するための変数を定義する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b3c950a53b53cc05ae2e45e89963766fe4ac035d~1..b3c950a53b53cc05ae2e45e89963766fe4ac035d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// ID -&gt; EXのFIFO</span>
<span class="hljs-keyword">var</span> exq_wready: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> exq_wvalid: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> exq_wdata : exq_type;
<span class="hljs-keyword">var</span> exq_rready: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> exq_rvalid: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> exq_rdata : exq_type;

<span class="hljs-comment">// EX -&gt; MEMのFIFO</span>
<span class="hljs-keyword">var</span> memq_wready: <span class="hljs-keyword">logic</span>    ;
<span class="hljs-keyword">var</span> memq_wvalid: <span class="hljs-keyword">logic</span>    ;
<span class="hljs-keyword">var</span> memq_wdata : memq_type;
<span class="hljs-keyword">var</span> memq_rready: <span class="hljs-keyword">logic</span>    ;
<span class="hljs-keyword">var</span> memq_rvalid: <span class="hljs-keyword">logic</span>    ;
<span class="hljs-keyword">var</span> memq_rdata : memq_type;

<span class="hljs-comment">// MEM -&gt; WBのFIFO</span>
<span class="hljs-keyword">var</span> wbq_wready: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> wbq_wvalid: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> wbq_wdata : wbq_type;
<span class="hljs-keyword">var</span> wbq_rready: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> wbq_rvalid: <span class="hljs-keyword">logic</span>   ;
<span class="hljs-keyword">var</span> wbq_rdata : wbq_type;
</code></pre></div><p><span class="caption">▼リスト7.6: FIFOのインスタンス化 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b3c950a53b53cc05ae2e45e89963766fe4ac035d~1..b3c950a53b53cc05ae2e45e89963766fe4ac035d#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> id_ex_fifo: fifo #(
    DATA_TYPE: exq_type,
    WIDTH    : <span class="hljs-number">1</span>       ,
) (
    clk                   ,
    rst                   ,
    flush : control_hazard,
    wready: exq_wready    ,
    wvalid: exq_wvalid    ,
    wdata : exq_wdata     ,
    rready: exq_rready    ,
    rvalid: exq_rvalid    ,
    rdata : exq_rdata     ,
);

<span class="hljs-keyword">inst</span> ex_mem_fifo: fifo #(
    DATA_TYPE: memq_type,
    WIDTH    : <span class="hljs-number">1</span>        ,
) (
    clk                   ,
    rst                   ,
    flush : control_hazard,
    wready: memq_wready   ,
    wvalid: memq_wvalid   ,
    wdata : memq_wdata    ,
    rready: memq_rready   ,
    rvalid: memq_rvalid   ,
    rdata : memq_rdata    ,
);

<span class="hljs-keyword">inst</span> mem_wb_fifo: fifo #(
    DATA_TYPE: wbq_type,
    WIDTH    : <span class="hljs-number">1</span>       ,
) (
    clk               ,
    rst               ,
    <span class="custom-hl-bold">flush : <span class="hljs-number">0</span></span>         ,
    wready: wbq_wready,
    wvalid: wbq_wvalid,
    wdata : wbq_wdata ,
    rready: wbq_rready,
    rvalid: wbq_rvalid,
    rdata : wbq_rdata ,
);
</code></pre></div><h3 id="ifステージを実装する" tabindex="-1">IFステージを実装する <a class="header-anchor" href="#ifステージを実装する" aria-label="Permalink to “IFステージを実装する”">​</a></h3><p>まず、IFステージを実装します。 ...といっても、 既にIFステージ(=命令フェッチ処理)は独立に動くものとして実装されているため、 手を加える必要はありません。</p><p>リスト7のようなコメントを挿入すると、 ステージの処理を書いている区間が分かりやすくなります。 ID、EX、MEM、WBステージを実装するときにも同様のコメントを挿入し、 ステージの処理のコードをまとまった場所に配置しましょう。</p><p><span class="caption">▼リスト7.7: IFステージが始まることを示すコメントを挿入する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">///////////////////////////////// IF Stage /////////////////////////////////</span>

<span class="hljs-keyword">var</span> if_pc          : Addr ;
...
</code></pre></div><h3 id="idステージを実装する" tabindex="-1">IDステージを実装する <a class="header-anchor" href="#idステージを実装する" aria-label="Permalink to “IDステージを実装する”">​</a></h3><p>IDステージでは、命令をデコードします。 既に<code>ids_ctrl</code>と<code>ids_imm</code>には、 デコード結果の制御フラグと即値が割り当てられているため、 既存のコードの変更は必要ありません。</p><p>デコード結果はEXステージに渡します。 EXステージにデータを渡すには、 <code>exq_wdata</code>にデータを割り当てます (リスト8)。</p><p><span class="caption">▼リスト7.8: EXステージに値を渡す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// ID -&gt; EX</span>
    if_fifo_rready = exq_wready;
    exq_wvalid     = if_fifo_rvalid;
    exq_wdata.addr = if_fifo_rdata.addr;
    exq_wdata.bits = if_fifo_rdata.bits;
    exq_wdata.ctrl = ids_ctrl;
    exq_wdata.imm  = ids_imm;
}
</code></pre></div><p>IDステージにある命令は、 EXステージが命令を受け入れられるとき(<code>exq_wready</code>)、 IDステージを完了してEXステージに処理を進められます。 この仕組みは、 <code>if_fifo_rready</code>に<code>exq_wready</code>を割り当てることで実現できます。</p><p>最後に、命令が現在のクロックで供給されたかどうかを示す変数<code>id_is_new</code>は必要ないため削除します (リスト9)。</p><p><span class="caption">▼リスト7.9: ids_is_newを削除する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-del"><span class="hljs-keyword">var</span> ids_is_new   : <span class="hljs-keyword">logic</span>   ;</span>
</code></pre></div><h3 id="exステージを実装する" tabindex="-1">EXステージを実装する <a class="header-anchor" href="#exステージを実装する" aria-label="Permalink to “EXステージを実装する”">​</a></h3><p>EXステージでは、 整数演算命令のときはALUで計算し、 分岐命令のときは分岐判定を行います。</p><p>まず、EXステージに存在する命令の情報を<code>exq_rdata</code>から取り出します(リスト10)。</p><p><span class="caption">▼リスト7.10: 変数の定義 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> exs_valid    : <span class="hljs-keyword">logic</span>    = exq_rvalid;
<span class="hljs-keyword">let</span> exs_pc       : Addr     = exq_rdata.addr;
<span class="hljs-keyword">let</span> exs_inst_bits: Inst     = exq_rdata.bits;
<span class="hljs-keyword">let</span> exs_ctrl     : InstCtrl = exq_rdata.ctrl;
<span class="hljs-keyword">let</span> exs_imm      : UIntX    = exq_rdata.imm;
</code></pre></div><p>次に、EXステージで扱う変数の名前を変更します。 変数の名前に<code>exs_</code>をつけます (リスト11)。</p><p><span class="caption">▼リスト7.11: 変数名を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// レジスタ番号</span>
<span class="hljs-keyword">let</span> <span class="custom-hl-bold">exs_</span>rs1_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = <span class="custom-hl-bold">exs</span>_inst_bits[<span class="hljs-number">19</span>:<span class="hljs-number">15</span>];
<span class="hljs-keyword">let</span> <span class="custom-hl-bold">exs_</span>rs2_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = <span class="custom-hl-bold">exs</span>_inst_bits[<span class="hljs-number">24</span>:<span class="hljs-number">20</span>];

<span class="hljs-comment">// ソースレジスタのデータ</span>
<span class="hljs-keyword">let</span> <span class="custom-hl-bold">exs_</span>rs1_data: UIntX = <span class="hljs-keyword">if</span> <span class="custom-hl-bold">exs_</span>rs1_addr == <span class="hljs-number">0</span> ? <span class="hljs-number">0</span> : regfile[<span class="custom-hl-bold">exs_</span>rs1_addr];
<span class="hljs-keyword">let</span> <span class="custom-hl-bold">exs_</span>rs2_data: UIntX = <span class="hljs-keyword">if</span> <span class="custom-hl-bold">exs_</span>rs2_addr == <span class="hljs-number">0</span> ? <span class="hljs-number">0</span> : regfile[<span class="custom-hl-bold">exs_</span>rs2_addr];

<span class="hljs-comment">// ALU</span>
<span class="hljs-keyword">var</span> <span class="custom-hl-bold">exs_</span>op1       : UIntX;
<span class="hljs-keyword">var</span> <span class="custom-hl-bold">exs_</span>op2       : UIntX;
<span class="hljs-keyword">var</span> <span class="custom-hl-bold">exs_</span>alu_result: UIntX;

<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-keyword">case</span> <span class="custom-hl-bold">exs</span>_ctrl.itype {
        InstType::R, InstType::B: {
            <span class="custom-hl-bold">exs_</span>op1 = <span class="custom-hl-bold">exs_</span>rs1_data;
            <span class="custom-hl-bold">exs_</span>op2 = <span class="custom-hl-bold">exs_</span>rs2_data;
        }
        InstType::I, InstType::S: {
            <span class="custom-hl-bold">exs_</span>op1 = <span class="custom-hl-bold">exs_</span>rs1_data;
            <span class="custom-hl-bold">exs_</span>op2 = <span class="custom-hl-bold">exs</span>_imm;
        }
        InstType::U, InstType::J: {
            <span class="custom-hl-bold">exs_</span>op1 = <span class="custom-hl-bold">exs</span>_pc;
            <span class="custom-hl-bold">exs_</span>op2 = <span class="custom-hl-bold">exs</span>_imm;
        }
        <span class="hljs-keyword">default</span>: {
            <span class="custom-hl-bold">exs_</span>op1 = &#39;x;
            <span class="custom-hl-bold">exs_</span>op2 = &#39;x;
        }
    }
}

<span class="hljs-keyword">inst</span> alum: alu (
    ctrl  : <span class="custom-hl-bold">exs</span>_ctrl      ,
    op1   : <span class="custom-hl-bold">exs_</span>op1       ,
    op2   : <span class="custom-hl-bold">exs_</span>op2       ,
    result: <span class="custom-hl-bold">exs_</span>alu_result,
);

<span class="hljs-keyword">var</span> <span class="custom-hl-bold">exs_</span>brunit_take: <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">inst</span> bru: brunit (
    funct3: <span class="custom-hl-bold">exs</span>_ctrl.funct3,
    op1   : <span class="custom-hl-bold">exs_</span>op1        ,
    op2   : <span class="custom-hl-bold">exs_</span>op2        ,
    take  : <span class="custom-hl-bold">exs_</span>brunit_take,
);
</code></pre></div><p>最後に、MEMステージに命令とデータを渡します。 MEMステージにデータを渡すために、 <code>memq_wdata</code>にデータを割り当てます (リスト12)。</p><p><span class="caption">▼リスト7.12: MEMステージにデータを渡す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// EX -&gt; MEM</span>
    exq_rready            = memq_wready;
    memq_wvalid           = exq_rvalid;
    memq_wdata.addr       = exq_rdata.addr;
    memq_wdata.bits       = exq_rdata.bits;
    memq_wdata.ctrl       = exq_rdata.ctrl;
    memq_wdata.imm        = exq_rdata.imm;
    memq_wdata.rs1_addr   = exs_rs1_addr;
    memq_wdata.rs1_data   = exs_rs1_data;
    memq_wdata.rs2_data   = exs_rs2_data;
    memq_wdata.alu_result = exs_alu_result;
    ← ジャンプ命令、または、分岐命令かつ分岐が成立するとき、<span class="hljs-number">1</span>にする
    memq_wdata.br_taken   = exs_ctrl.is_jump || inst_is_br(exs_ctrl) &amp;&amp; exs_brunit_take;
    memq_wdata.jump_addr  = <span class="hljs-keyword">if</span> inst_is_br(exs_ctrl) ? exs_pc + exs_imm : exs_alu_result &amp; ~<span class="hljs-number">1</span>;
}
</code></pre></div><p><code>br_taken</code>には、 ジャンプ命令かどうか、または分岐命令かつ分岐が成立するか、 という条件を割り当てます。 <code>jump_addr</code>には、 分岐命令、またはジャンプ命令のジャンプ先を割り当てます。 MEMステージではこれを利用してジャンプと分岐を処理します。</p><p>EXステージにある命令は、 MEMステージが命令を受け入れられるとき(<code>memq_wready</code>)、 EXステージを完了してMEMステージに処理を進められます。 この仕組みは、 <code>exq_rready</code>に<code>memq_wready</code>を割り当てることで実現できます。</p><h3 id="memステージを実装する" tabindex="-1">MEMステージを実装する <a class="header-anchor" href="#memステージを実装する" aria-label="Permalink to “MEMステージを実装する”">​</a></h3><p>MEMステージでは、メモリにアクセスする命令とCSR命令を処理します。 また、ジャンプ命令、分岐命令かつ分岐が成立、またはトラップが発生するとき、 次に実行する命令のアドレスを変更します。</p><p>ロードストア命令でメモリにアクセスしているとき、 EXステージからMEMステージに別の命令の処理を進めることはできず、 パイプライン処理は止まってしまいます。 パイプライン処理を進められない状態のことを<strong>パイプラインハザード</strong>(pipeline hazard)と呼びます。</p><p>まず、MEMステージに存在する命令の情報を<code>memq_rdata</code>から取り出します(リスト13)。 MEMステージでは、csrunitモジュールに、 命令が現在のクロックでMEMステージに供給されたかどうかの情報を渡します。 そのため、変数<code>mem_is_new</code>を定義しています。</p><p><span class="caption">▼リスト7.13: 変数の定義 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> mems_is_new   : <span class="hljs-keyword">logic</span>      ;
<span class="hljs-keyword">let</span> mems_valid    : <span class="hljs-keyword">logic</span>       = memq_rvalid;
<span class="hljs-keyword">let</span> mems_pc       : Addr        = memq_rdata.addr;
<span class="hljs-keyword">let</span> mems_inst_bits: Inst        = memq_rdata.bits;
<span class="hljs-keyword">let</span> mems_ctrl     : InstCtrl    = memq_rdata.ctrl;
<span class="hljs-keyword">let</span> mems_rd_addr  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">5</span>&gt; = mems_inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
</code></pre></div><p><code>mem_is_new</code>には、<code>id_is_new</code>の更新に利用していたコードを利用します(リスト14)。</p><p><span class="caption">▼リスト7.14: mem_is_newの更新 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        <span class="custom-hl-bold">mems</span>_is_new = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> memq_rvalid {
            <span class="custom-hl-bold">mems</span>_is_new = memq_rready;
        } <span class="hljs-keyword">else</span> {
            <span class="custom-hl-bold">mems</span>_is_new = <span class="hljs-number">1</span>;
        }
    }
}
</code></pre></div><p>次に、MEMモジュールで使う変数に合わせて、 memunitモジュールとcsrunitモジュールのポートに割り当てている変数名を変更します (リスト15)。</p><p><span class="caption">▼リスト7.15: 変数名を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> memu_rdata: UIntX;
<span class="hljs-keyword">var</span> memu_stall: <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">inst</span> memu: memunit (
    clk                          ,
    rst                          ,
    valid : <span class="custom-hl-bold">mems</span>_valid           ,
    is_new: <span class="custom-hl-bold">mems</span>_is_new          ,
    ctrl  : <span class="custom-hl-bold">mems</span>_ctrl            ,
    addr  : <span class="custom-hl-bold">memq_rdata.</span>alu_result,
    rs2   : <span class="custom-hl-bold">memq_rdata.</span>rs2_data  ,
    rdata : memu_rdata           ,
    stall : memu_stall           ,
    membus: d_membus             ,
);

<span class="hljs-keyword">var</span> csru_rdata      : UIntX;
<span class="hljs-keyword">var</span> csru_raise_trap : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> csru_trap_vector: Addr ;

<span class="hljs-keyword">inst</span> csru: csrunit (
    clk                            ,
    rst                            ,
    valid   : <span class="custom-hl-bold">mems</span>_valid           ,
    pc      : <span class="custom-hl-bold">mems</span>_pc              ,
    ctrl    : <span class="custom-hl-bold">mems</span>_ctrl            ,
    rd_addr : <span class="custom-hl-bold">mems</span>_rd_addr         ,
    csr_addr: <span class="custom-hl-bold">mems</span>_inst_bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>],
    rs1     : <span class="hljs-keyword">if</span> <span class="custom-hl-bold">mems</span>_ctrl.funct3[<span class="hljs-number">2</span>] == <span class="hljs-number">1</span> &amp;&amp; <span class="custom-hl-bold">mems</span>_ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] != <span class="hljs-number">0</span> ?
        {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - $bits(<span class="custom-hl-bold">memq_rdata.</span>rs1_addr), <span class="custom-hl-bold">memq_rdata.</span>rs1_addr} <span class="hljs-comment">// rs1を0で拡張する</span>
    :
        <span class="custom-hl-bold">memq_rdata.</span>rs1_data
    ,
    rdata      : csru_rdata      ,
    raise_trap : csru_raise_trap ,
    trap_vector: csru_trap_vector,
);
</code></pre></div><p>フェッチ先が変わったことを表す変数<code>control_hazard</code>と、 新しいフェッチ先を示す信号<code>control_hazard_pc_next</code>では、 EXステージで計算したデータとCSRステージのトラップ情報を利用します (リスト16)。</p><p><span class="caption">▼リスト7.16: ジャンプの判定処理 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> control_hazard         = <span class="custom-hl-bold">mems</span>_valid &amp;&amp; (csru_raise_trap || <span class="custom-hl-bold">mems_</span>ctrl.is_jump || <span class="custom-hl-bold">memq_rdata.</span>br_taken);
<span class="hljs-keyword">assign</span> control_hazard_pc_next = <span class="hljs-keyword">if</span> csru_raise_trap ? csru_trap_vector : <span class="custom-hl-bold">memq_rdata.</span>jump_addr;
</code></pre></div><p>ジャンプ命令の後ろの余計な命令を実行しないために、 <code>control_hazard</code>が<code>1</code>になったとき、 ID、EX、MEMステージに命令を供給するFIFOをフラッシュします。 <code>control_hazard</code>が<code>1</code>になるとき、 MEMステージの処理は完了しています。 後述しますが、WBステージの処理は必ず1クロックで終了します。 そのため、フラッシュするとき、 MEMステージにある命令は必ずWBステージに移動します。</p><p>最後に、WBステージに命令とデータを渡します(リスト17)。 WBステージにデータを渡すために、 <code>wbq_wdata</code>にデータを割り当てます</p><p><span class="caption">▼リスト7.17: WBステージにデータを渡す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// MEM -&gt; WB</span>
    memq_rready          = wbq_wready &amp;&amp; !memu_stall;
    wbq_wvalid           = memq_rvalid &amp;&amp; !memu_stall;
    wbq_wdata.addr       = memq_rdata.addr;
    wbq_wdata.bits       = memq_rdata.bits;
    wbq_wdata.ctrl       = memq_rdata.ctrl;
    wbq_wdata.imm        = memq_rdata.imm;
    wbq_wdata.alu_result = memq_rdata.alu_result;
    wbq_wdata.mem_rdata  = memu_rdata;
    wbq_wdata.csr_rdata  = csru_rdata;
}
</code></pre></div><p>MEMステージにある命令は、 memunitモジュールが処理中ではなく(<code>!memy_stall</code>)、 WBステージが命令を受け入れられるとき(<code>wbq_wready</code>)、 MEMステージを完了してWBステージに処理を進められます。 この仕組みは、<code>memq_rready</code>と<code>wbq_wvalid</code>を確認してください。</p><h3 id="wbステージを実装する" tabindex="-1">WBステージを実装する <a class="header-anchor" href="#wbステージを実装する" aria-label="Permalink to “WBステージを実装する”">​</a></h3><p>WBステージでは、命令の結果をレジスタにライトバックします。 WBステージが完了したら命令の処理は終わりなので、命令を破棄します。</p><p>まず、WBステージに存在する命令の情報を<code>wbq_rdata</code>から取り出します (リスト18)。</p><p><span class="caption">▼リスト7.18: 変数の定義 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> wbs_valid    : <span class="hljs-keyword">logic</span>    = wbq_rvalid;
<span class="hljs-keyword">let</span> wbs_pc       : Addr     = wbq_rdata.addr;
<span class="hljs-keyword">let</span> wbs_inst_bits: Inst     = wbq_rdata.bits;
<span class="hljs-keyword">let</span> wbs_ctrl     : InstCtrl = wbq_rdata.ctrl;
<span class="hljs-keyword">let</span> wbs_imm      : UIntX    = wbq_rdata.imm;
</code></pre></div><p>次に、WBステージで扱う変数名を変更します。 変数名に<code>wbs_</code>をつけます (リスト19)。</p><p><span class="caption">▼リスト7.19: 変数名を変更する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> <span class="custom-hl-bold">wbs_</span>rd_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = <span class="custom-hl-bold">wbs_</span>inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
<span class="hljs-keyword">let</span> <span class="custom-hl-bold">wbs_</span>wb_data: UIntX    = <span class="hljs-keyword">switch</span> {
    <span class="custom-hl-bold">wbs_</span>ctrl.is_lui : <span class="custom-hl-bold">wbs_</span>imm,
    <span class="custom-hl-bold">wbs_</span>ctrl.is_jump: <span class="custom-hl-bold">wbs_</span>pc + <span class="hljs-number">4</span>,
    <span class="custom-hl-bold">wbs_</span>ctrl.is_load: <span class="custom-hl-bold">wbq_rdata.</span>mem_rdata,
    <span class="custom-hl-bold">wbs_</span>ctrl.is_csr : <span class="custom-hl-bold">wbq_rdata.</span>csr_rdata,
    <span class="hljs-keyword">default</span>         : <span class="custom-hl-bold">wbq_rdata.</span>alu_result
};

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> <span class="custom-hl-bold">wbs</span>_valid &amp;&amp; <span class="custom-hl-bold">wbs</span>_ctrl.rwb_en {
        regfile[<span class="custom-hl-bold">wbs_</span>rd_addr] = <span class="custom-hl-bold">wbs_</span>wb_data;
    }
}
</code></pre></div><p>最後に、命令をFIFOから取り出します。 WBステージでは命令を複数クロックで処理することはなく、 WBステージの次のステージを待つ必要もありません。 <code>wbq_rready</code>に<code>1</code>を割り当てることで、 常にFIFOから命令を取り出します(リスト20)。</p><p><span class="caption">▼リスト7.20: 命令をFIFOから取り出す (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// WB -&gt; END</span>
    wbq_rready = <span class="hljs-number">1</span>;
}
</code></pre></div><p>これで、IF、ID、EX、MEM、WBステージを作成できました。</p><h3 id="デバッグのために情報を表示する" tabindex="-1">デバッグのために情報を表示する <a class="header-anchor" href="#デバッグのために情報を表示する" aria-label="Permalink to “デバッグのために情報を表示する”">​</a></h3><p>今までは同時に1つの命令しか処理していませんでしたが、 これからは全てのステージで別の命令を処理することになります。 デバッグ表示を変更しておきましょう。</p><p>リスト21のように、デバッグ表示のalways_ffブロックを変更します。</p><p><span class="caption">▼リスト7.21: 各ステージの情報をデバッグ表示する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/b8f0532d937d3f231710cb7f234470dc4b447fc8~1..b8f0532d937d3f231710cb7f234470dc4b447fc8#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">///////////////////////////////// DEBUG /////////////////////////////////</span>
<span class="hljs-keyword">var</span> clock_count: <span class="hljs-keyword">u64</span>;

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        clock_count = <span class="hljs-number">1</span>;
    } <span class="hljs-keyword">else</span> {
        clock_count = clock_count + <span class="hljs-number">1</span>;

        $display(<span class="hljs-string">&quot;&quot;</span>);
        $display(<span class="hljs-string">&quot;# %d&quot;</span>, clock_count);

        $display(<span class="hljs-string">&quot;IF ------&quot;</span>);
        $display(<span class="hljs-string">&quot;     pc : %h&quot;</span>, if_pc);
        $display(<span class="hljs-string">&quot; is req : %b&quot;</span>, if_is_requested);
        $display(<span class="hljs-string">&quot; pc req : %h&quot;</span>, if_pc_requested);
        $display(<span class="hljs-string">&quot;ID ------&quot;</span>);
        <span class="hljs-keyword">if</span> ids_valid {
            $display(<span class="hljs-string">&quot;  %h : %h&quot;</span>, ids_pc, if_fifo_rdata.bits);
            $display(<span class="hljs-string">&quot;  itype : %b&quot;</span>, ids_ctrl.itype);
            $display(<span class="hljs-string">&quot;  imm   : %h&quot;</span>, ids_imm);
        }
        $display(<span class="hljs-string">&quot;EX -----&quot;</span>);
        <span class="hljs-keyword">if</span> exs_valid {
            $display(<span class="hljs-string">&quot;  %h : %h&quot;</span>, exq_rdata.addr, exq_rdata.bits);
            $display(<span class="hljs-string">&quot;  op1     : %h&quot;</span>, exs_op1);
            $display(<span class="hljs-string">&quot;  op2     : %h&quot;</span>, exs_op2);
            $display(<span class="hljs-string">&quot;  alu     : %h&quot;</span>, exs_alu_result);
            <span class="hljs-keyword">if</span> inst_is_br(exs_ctrl) {
                $display(<span class="hljs-string">&quot;  br take : &quot;</span>, exs_brunit_take);
            }
        }
        $display(<span class="hljs-string">&quot;MEM -----&quot;</span>);
        <span class="hljs-keyword">if</span> mems_valid {
            $display(<span class="hljs-string">&quot;  %h : %h&quot;</span>, memq_rdata.addr, memq_rdata.bits);
            $display(<span class="hljs-string">&quot;  mem stall : %b&quot;</span>, memu_stall);
            $display(<span class="hljs-string">&quot;  mem rdata : %h&quot;</span>, memu_rdata);
            <span class="hljs-keyword">if</span> mems_ctrl.is_csr {
                $display(<span class="hljs-string">&quot;  csr rdata : %h&quot;</span>, csru_rdata);
                $display(<span class="hljs-string">&quot;  csr trap  : %b&quot;</span>, csru_raise_trap);
                $display(<span class="hljs-string">&quot;  csr vec   : %h&quot;</span>, csru_trap_vector);
            }
            <span class="hljs-keyword">if</span> memq_rdata.br_taken {
                $display(<span class="hljs-string">&quot;  JUMP TO   : %h&quot;</span>, memq_rdata.jump_addr);
            }
        }
        $display(<span class="hljs-string">&quot;WB ----&quot;</span>);
        <span class="hljs-keyword">if</span> wbs_valid {
            $display(<span class="hljs-string">&quot;  %h : %h&quot;</span>, wbq_rdata.addr, wbq_rdata.bits);
            <span class="hljs-keyword">if</span> wbs_ctrl.rwb_en {
                $display(<span class="hljs-string">&quot;  reg[%d] &lt;= %h&quot;</span>, wbs_rd_addr, wbs_wb_data);
            }
        }
    }
}
</code></pre></div><h3 id="パイプライン処理をテストする" tabindex="-1">パイプライン処理をテストする <a class="header-anchor" href="#パイプライン処理をテストする" aria-label="Permalink to “パイプライン処理をテストする”">​</a></h3><p>それでは、riscv-testsを実行してみましょう。 試しに、RV64IのADDのテストを実行します。</p><p><span class="caption">▼リスト7.22: パイプライン処理のテスト</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-add.bin.hex</span>
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-add.bin.hex
Test Result : 0 / 1
</code></pre></div><p>おや? テストに失敗してしまいました。 一体何が起きているのでしょうか?</p><h2 id="データ依存の対処" tabindex="-1">データ依存の対処 <a class="header-anchor" href="#データ依存の対処" aria-label="Permalink to “データ依存の対処”">​</a></h2><h3 id="正しく動かないプログラムを確認する" tabindex="-1">正しく動かないプログラムを確認する <a class="header-anchor" href="#正しく動かないプログラムを確認する" aria-label="Permalink to “正しく動かないプログラムを確認する”">​</a></h3><p>実は、ただIF、ID、EX、MEM、WBステージに処理を分割するだけでは、 正しく命令を実行できません。 例えば、リスト23のようなプログラムは正しく動きません。</p><p><code>test/sample_datahazard.hex</code>を作成し、次のように記述します (リスト23)。</p><p><span class="caption">▼リスト7.23: sample_datahazard.hex</span> <a href="https://github.com/nananapo/bluecore/compare/8287aa33e805123d97ab08049d141c22fe87dd58~1..8287aa33e805123d97ab08049d141c22fe87dd58#diff-a043735b81693306b322a137be7748b5eb8f7fd37108e65ae7288953d43ea0fe">差分をみる</a></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>0010811300100093 // 0:addi x1, x0, 1    4: addi x2, x1, 1
</code></pre></div><p>このプログラムでは、 x1にx0 + 1を代入した後、x2にx1 + 1を代入します。 シミュレータを実行し、どのように実行されるかを確かめます(リスト24)。</p><p><span class="caption">▼リスト7.24: sample_datahazard.hexを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/sample_datahazard.hex 7</span>
...
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   5</span>
ID ------
  0000000000000004 : 00108113
  itype : 000010
  imm   : 0000000000000001
EX -----
  0000000000000000 : 00100093
  op1     : 0000000000000000 ← x0
  op2     : 0000000000000001 ← 即値
  alu     : 0000000000000001 ← ゼロレジスタ + 1 = 1
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   6</span>
ID ------
  0000000000000008 : 00000000
  itype : 000000
  imm   : 0000000000000000
EX -----
  0000000000000004 : 00108113
  op1     : 0000000000000000 ← x1
  op2     : 0000000000000001 ← 即値
  alu     : 0000000000000001 ← x1 + 1 = 2のはずだが1になっている
MEM -----
  0000000000000000 : 00100093
  ...
</code></pre></div><p>ログを確認すると、 アドレス0の命令でx1が1になっているはずですが、 アドレス4の命令でx1を読み込むときにx1は0になっています。</p><p>この問題は、 まだアドレス0の命令の結果がレジスタファイルに書き込まれていないのに、 アドレス4の命令でレジスタファイルで結果を読み出しているために発生しています。</p><h3 id="データ依存とは何か" tabindex="-1">データ依存とは何か？ <a class="header-anchor" href="#データ依存とは何か" aria-label="Permalink to “データ依存とは何か？”">​</a></h3><p>ある命令Aの実行結果の値を利用する命令Bが存在するとき、 命令Aと命令Bの間には<strong>データ依存</strong>(data dependence)があると呼びます。 データ依存に対処するためには、 命令Aの結果がレジスタに書き込まれるのを待つ必要があります。 データ依存があることにより発生するパイプラインハザードのことを <strong>データハザード</strong>(data hazard)と呼びます。</p><p><img src="`+i+`" alt="データ依存関係のあるプログラム"></p><h3 id="データ依存に対処する" tabindex="-1">データ依存に対処する <a class="header-anchor" href="#データ依存に対処する" aria-label="Permalink to “データ依存に対処する”">​</a></h3><p>レジスタの値を読み出すのはEXステージです。 データ依存に対処するために、 データ依存関係があるときにEXステージをストールさせます。</p><p>まず、MEMとEXか、WBとEXステージにある命令の間にデータ依存があることを検知します (リスト25)。 例えばMEMステージとデータ依存の関係にあるとき、 MEMステージの命令はライトバックする命令で、 rdがEXステージのrs1、またはrs2と一致しています。</p><p><span class="caption">▼リスト7.25: データ依存の検知 (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8287aa33e805123d97ab08049d141c22fe87dd58~1..8287aa33e805123d97ab08049d141c22fe87dd58#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// データハザード</span>
<span class="hljs-keyword">let</span> exs_mem_data_hazard: <span class="hljs-keyword">logic</span> = mems_valid &amp;&amp; mems_ctrl.rwb_en &amp;&amp; (mems_rd_addr == exs_rs1_addr || mems_rd_addr == exs_rs2_addr);
<span class="hljs-keyword">let</span> exs_wb_data_hazard : <span class="hljs-keyword">logic</span> = wbs_valid &amp;&amp; wbs_ctrl.rwb_en &amp;&amp; (wbs_rd_addr == exs_rs1_addr || wbs_rd_addr == exs_rs2_addr);
<span class="hljs-keyword">let</span> exs_data_hazard    : <span class="hljs-keyword">logic</span> = exs_mem_data_hazard || exs_wb_data_hazard;
</code></pre></div><p>次に、データ依存があるときに、データハザードを発生させます (リスト26)。 データハザードを起こすためには、 EXステージのFIFOの<code>rready</code>とMEMステージの<code>wvalid</code>に、 データハザードが発生していないという条件を加えます。</p><p><span class="caption">▼リスト7.26: データ依存があるときにデータハザードを起こす (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8287aa33e805123d97ab08049d141c22fe87dd58~1..8287aa33e805123d97ab08049d141c22fe87dd58#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// EX -&gt; MEM</span>
    exq_rready            = memq_wready<span class="custom-hl-bold"> &amp;&amp; !exs_data_hazard</span>;
    memq_wvalid           = exq_rvalid<span class="custom-hl-bold"> &amp;&amp; !exs_data_hazard</span>;
</code></pre></div><p>最後に、データハザードが発生しているかどうかをデバッグ表示します (リスト27)。</p><p><span class="caption">▼リスト7.27: データハザードが発生しているかをデバッグ表示する (core.veryl)</span> <a href="https://github.com/nananapo/bluecore/compare/8287aa33e805123d97ab08049d141c22fe87dd58~1..8287aa33e805123d97ab08049d141c22fe87dd58#diff-bdad1723f95a5423ff5ab8ba69bb572aabe1c8def0cda1748f6f980f61b57510">差分をみる</a></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>$display(<span class="hljs-string">&quot;EX -----&quot;</span>);
<span class="hljs-keyword">if</span> exs_valid {
    $display(<span class="hljs-string">&quot;  %h : %h&quot;</span>, exq_rdata.addr, exq_rdata.bits);
    $display(<span class="hljs-string">&quot;  op1     : %h&quot;</span>, exs_op1);
    $display(<span class="hljs-string">&quot;  op2     : %h&quot;</span>, exs_op2);
    $display(<span class="hljs-string">&quot;  alu     : %h&quot;</span>, exs_alu_result);
    <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  dhazard : %b&quot;</span>, exs_data_hazard);</span>
</code></pre></div><h3 id="パイプライン処理をテストする-1" tabindex="-1">パイプライン処理をテストする <a class="header-anchor" href="#パイプライン処理をテストする-1" aria-label="Permalink to “パイプライン処理をテストする”">​</a></h3><p><code>test/sample_datahazard.hex</code>が正しく動くことを確認します。</p><p><span class="caption">▼リスト7.28: sample_datahazard.hexが正しく動くことを確認する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">./obj_dir/sim <span class="hljs-built_in">test</span>/sample_datahazard.hex 7</span>
...
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   5</span>
...
ID ------
  0000000000000004 : 00108113
  itype : 000010
  imm   : 0000000000000001
EX -----
  0000000000000000 : 00100093
  op1     : 0000000000000000
  op2     : 0000000000000001
  alu     : 0000000000000001
  dhazard : 0
...
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   6</span>
...
EX -----
  0000000000000004 : 00108113
  op1     : 0000000000000000
  op2     : 0000000000000001
  alu     : 0000000000000001
  dhazard : 1 ← データハザードが発生している
MEM -----
  0000000000000000 : 00100093
  mem stall : 0
  mem rdata : 0000000000000000
WB ----
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   7</span>
...
EX -----
  0000000000000004 : 00108113
  op1     : 0000000000000000
  op2     : 0000000000000001
  alu     : 0000000000000001
  dhazard : 1
MEM -----
WB ----
  0000000000000000 : 00100093
  reg[ 1] &lt;= 0000000000000001 ← 1が書き込まれる
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   8</span>
...
EX -----
  0000000000000004 : 00108113
  op1     : 0000000000000001 ← x1=1が読み込まれた
  op2     : 0000000000000001
  alu     : 0000000000000002 ← 正しい計算が行われている
  dhazard : 0 ← データハザードが解消された
MEM -----
WB ----
</code></pre></div><p>アドレス4の命令が、 6クロック目と7クロック目にEXステージでデータハザードが発生し、 アドレス0の命令が実行終了するのを待っているのを確認できます。</p><p>RV64Iのriscv-testsも実行します。</p><p><span class="caption">▼リスト7.29: riscv-testsを実行する</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim VERILATOR_FLAGS=<span class="hljs-string">&quot;-DTEST_MODE&quot;</span></span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">python3 <span class="hljs-built_in">test</span>/test.py -r obj_dir/sim <span class="hljs-built_in">test</span>/share rv64ui-p-</span>
...
FAIL : ~/core/test/share/riscv-tests/isa/rv64ui-p-ma_data.bin.hex
...
Test Result : 51 / 52
</code></pre></div><p>正しくパイプライン処理が動いていることを確認できました。</p><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>他の方法として、関数呼び出しやループをCPU側で検知して結果を保存して利用することで実行命令数を減らす手法があります。この手法はずっと後の章で検討します。 <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>実際のところは均等に分割することはできないため、Nステージに分割してもクロック周波数はN分の1になりません <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p>FIFOのデータ個数は<code>2 ** WIDTH - 1</code>です <a href="#fnref3" class="footnote-backref">↩︎</a></p></li></ol></section>`,172)])])}const g=s(b,[["render",h]]);export{j as __pageData,g as default};
