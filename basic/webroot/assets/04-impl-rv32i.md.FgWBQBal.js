import{_ as a,c as n,o as l,ah as e,ap as p,aq as c,ar as t,as as d}from"./chunks/framework.BNheOMQd.js";const j=JSON.parse('{"title":"RV32Iの実装","description":"","frontmatter":{},"headers":[],"relativePath":"04-impl-rv32i.md","filePath":"04-impl-rv32i.md"}'),o={name:"04-impl-rv32i.md"};function r(i,s,h,m,u,y){return l(),n("div",null,[...s[0]||(s[0]=[e('<h1 id="rv32iの実装" tabindex="-1">RV32Iの実装 <a class="header-anchor" href="#rv32iの実装" aria-label="Permalink to “RV32Iの実装”">​</a></h1><p>本章では、RISC-Vの基本整数命令セットである<strong>RV32I</strong>を実装します。 基本整数命令という名前の通り、 整数の足し引きやビット演算、 ジャンプ、分岐命令などの最小限の命令しか実装されていません。 また、32ビット幅の汎用レジスタが32個定義されています。 ただし、0番目のレジスタの値は常に<code>0</code>です。</p><p>RISC-VのCPUは基本整数命令セットを必ず実装して、 他の命令や機能は拡張として実装します。 複雑な機能を持つCPUを実装する前に、 まずは最小限の命令を実行できるCPUを実装しましょう。</p><h2 id="cpuは何をやっているのか" tabindex="-1">CPUは何をやっているのか? <a class="header-anchor" href="#cpuは何をやっているのか" aria-label="Permalink to “CPUは何をやっているのか?”">​</a></h2><p>CPUを実装するには何が必要でしょうか? まずはCPUとはどのような動作をするものなのかを考えます。 <strong>プログラム内蔵方式</strong>(stored-program computer)と呼ばれるコンピュータのCPUは、 次の手順でプログラムを実行します。</p><ol><li><strong>メモリ</strong>(memory, 記憶装置)からプログラムを読み込む</li><li>プログラムを実行する</li><li>1、2の繰り返し</li></ol><p>ここで、メモリから読み込まれる「プログラム」とは一体何を指しているのでしょうか? 普通のプログラマが書くのはC言語やRustなどのプログラミング言語のプログラムですが、 通常のCPUはそれをそのまま解釈して実行することはできません。 そのため、メモリから読み込まれる「プログラム」とは、 CPUが読み込んで実行できる形式のプログラムです。 これはよく<strong>機械語</strong>(machine code)と呼ばれ、<code>0</code>と<code>1</code>で表される2進数のビット列<sup class="footnote-ref"><a href="#fn1" id="fnref1">[1]</a></sup>で記述されています。</p><p>メモリから機械語を読み込んで実行するのがCPUの仕事ということが分かりました。 これをもう少し掘り下げます。</p><p>まず、機械語をメモリから読み込むためには、 メモリのどこを読み込みたいのかという情報(<strong>アドレス</strong>, address)をメモリに与える必要があります。 また、当然ながらメモリが必要です。</p><p>CPUは機械語を実行しますが、 一気にすべての機械語を読み込んだり実行するわけではなく、 機械語の最小単位である<strong>命令</strong>(instruction)を一つずつ読み込んで実行します。 命令をメモリに要求、取得することを、命令をフェッチすると呼びます。</p><p>命令がCPUに供給されると、 CPUは命令のビット列がどのような意味を持っていて、 何をすればいいかを判定します。 このことを、命令をデコードすると呼びます。</p><p>命令をデコードすると、いよいよ計算やメモリの読み書きを行います。 しかし、例えば足し算を計算するにも、 何と何を足し合わせればいいのか分かりません。 この計算に使うデータは、次のいずれかで指定されます。</p><ul><li>レジスタ(= CPU内に存在する計算データ用のレジスタ列)の番号</li><li>即値(= 命令のビット列から生成される数値)</li></ul><p>計算対象のデータにレジスタと即値のどちらを使うかは命令によって異なります。 レジスタの番号は命令のビット列の中に含まれています。</p><p><strong>フォンノイマン型アーキテクチャ</strong>(von Neumann architecture)と呼ばれるコンピュータの構成方式では、 メモリのデータの読み書きを、機械語が格納されているメモリと同じメモリに対して行います。</p><p>計算やメモリの読み書きが終わると、その結果をレジスタに格納します。 例えば、足し算を行う命令なら足し算の結果、 メモリから値を読み込む命令なら読み込まれた値を格納します。</p><p>これで命令の実行は終わりですが、CPUは次の命令を実行する必要があります。 今現在実行している命令のアドレスを格納しているレジスタのことを<strong>プログラムカウンタ</strong>(program counter, PC)と呼びます。 CPUはPCの値をメモリに渡すことで命令をフェッチしています。</p><p>CPUは次の命令を実行するために、 PCの値を次の命令のアドレスに設定します。 ジャンプ命令の場合はPCの値をジャンプ先のアドレスに設定します。 分岐命令の場合は、まず、分岐の成否を判定します。 分岐が成立する場合はPCの値を分岐先のアドレスに設定します。 分岐が成立しない場合は通常の命令と同じです。</p><p>ここまでの話をまとめると、CPUの動作は次のようになります(図1)。</p><p><img src="'+p+`" alt="CPUの動作"></p><ol><li>PCに格納されたアドレスにある命令をフェッチする</li><li>命令を取得したらデコードする</li><li>計算で使用するデータを取得する (レジスタの値を取得したり、即値を生成する)</li><li>計算する命令の場合、計算を行う</li><li>メモリにアクセスする命令の場合、メモリ操作を行う</li><li>計算やメモリアクセスの結果をレジスタに格納する</li><li>PCの値を次に実行する命令のアドレスに設定する</li></ol><p>CPUが一体どんなものなのかが分かりましたか? 実装を始めましょう。</p><h2 id="プロジェクトの作成" tabindex="-1">プロジェクトの作成 <a class="header-anchor" href="#プロジェクトの作成" aria-label="Permalink to “プロジェクトの作成”">​</a></h2><p>まず、Verylのプロジェクトを作成します(リスト1)。 プロジェクトはcoreという名前にしています。</p><p><span class="caption">▼リスト3.1: 新規プロジェクトの作成</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">veryl new core</span>
[INFO ]      Created &quot;core&quot; project
</code></pre></div><p>すると、プロジェクト名のディレクトリと、その中に<code>Veryl.toml</code>、srcディレクトリが作成されます。 Verylのソースファイルはsrcディレクトリに作成します。</p><p><code>Veryl.toml</code>にはプロジェクトの設定を記述します。 デフォルトの状態だとソースマップファイルが生成されますが、使用しない場合は<code>Veryl.toml</code>を次のように変更してください(リスト2)。</p><p><span class="caption">▼リスト3.2: Veryl.toml</span></p><div class="language-toml"><button title="Copy Code" class="copy"></button><span class="lang">toml</span><pre class="hljs"><code><span class="hljs-section">[project]</span>
<span class="hljs-attr">name</span> = <span class="hljs-string">&quot;core&quot;</span>
<span class="hljs-attr">version</span> = <span class="hljs-string">&quot;0.1.0&quot;</span>
<span class="hljs-section">[build]</span>
<span class="hljs-attr">source</span> = <span class="hljs-string">&quot;src&quot;</span>
<span class="custom-hl-bold"><span class="hljs-attr">sourcemap_target</span> = {type =<span class="hljs-string">&quot;none&quot;</span>}</span>
<span class="hljs-attr">target</span> = {type = <span class="hljs-string">&quot;directory&quot;</span>, path = <span class="hljs-string">&quot;target&quot;</span>}
</code></pre></div><h2 id="定数の定義" tabindex="-1">定数の定義 <a class="header-anchor" href="#定数の定義" aria-label="Permalink to “定数の定義”">​</a></h2><p>いよいよコードを記述します。 まず、CPU内で何度も使用する定数や型を書いておくためのパッケージを作成します。</p><p><code>src/eei.veryl</code>を作成し、次のように記述します(リスト3)。</p><p><span class="caption">▼リスト3.3: eei.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">package</span> eei {
    <span class="hljs-keyword">const</span> XLEN: <span class="hljs-keyword">u32</span> = <span class="hljs-number">32</span>;
    <span class="hljs-keyword">const</span> ILEN: <span class="hljs-keyword">u32</span> = <span class="hljs-number">32</span>;

    <span class="hljs-keyword">type</span> UIntX  = <span class="hljs-keyword">logic</span>&lt;XLEN&gt;;
    <span class="hljs-keyword">type</span> UInt32 = <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">32</span>&gt;  ;
    <span class="hljs-keyword">type</span> UInt64 = <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">64</span>&gt;  ;
    <span class="hljs-keyword">type</span> Inst   = <span class="hljs-keyword">logic</span>&lt;ILEN&gt;;
    <span class="hljs-keyword">type</span> Addr   = <span class="hljs-keyword">logic</span>&lt;XLEN&gt;;
}
</code></pre></div><p>eeiとは、RISC-V execution environment interfaceの略です。 RISC-Vのプログラムの実行環境とインターフェースという広い意味があり、 ISAの定義もeeiに含まれているため、この名前を使用しています。</p><p>eeiパッケージには、次の定数を定義します。</p><dl><dt>XLEN</dt><dd> XLENは、RISC-Vにおいて整数レジスタの長さを示す数字として定義されています。 RV32Iのレジスタの長さは32ビットであるため、値を32にしています。 </dd><dt>ILEN</dt><dd> ILENは、RISC-VにおいてCPUの実装がサポートする命令の最大の幅を示す値として定義されています。 RISC-Vの命令の幅は、後の章で説明する圧縮命令を除けばすべて32ビットです。 そのため、値を32にしています。 </dd></dl><p>また、何度も使用することになる型に、type文によって別名を付けています。</p><dl><dt>UIntX、UInt32、UInt64</dt><dd> 幅がそれぞれXLEN、32、64の符号なし整数型 </dd><dt>Inst</dt><dd> 命令のビット列を格納するための型 </dd><dt>Addr</dt><dd> メモリのアドレスを格納するための型。 RISC-Vで使用できるメモリ空間の幅はXLENなので\`UIntX\`でもいいですが、 アドレスであることを明示するための別名を定義しています。 </dd></dl><h2 id="メモリ" tabindex="-1">メモリ <a class="header-anchor" href="#メモリ" aria-label="Permalink to “メモリ”">​</a></h2><p>CPUはメモリに格納された命令を実行します。 そのため、CPUの実装のためにはメモリの実装が必要です。 RV32Iにおいて命令の幅は32ビット(ILEN)です。 また、メモリからの読み込み命令、書き込み命令の最大の幅も32ビットです。</p><p>これを実現するために、次のような要件のメモリを実装します。</p><ul><li>読み書きの単位は32ビット</li><li>クロックに同期してメモリアクセスの要求を受け取る</li><li>要求を受け取った次のクロックで結果を返す</li></ul><h3 id="メモリのインターフェースを定義する" tabindex="-1">メモリのインターフェースを定義する <a class="header-anchor" href="#メモリのインターフェースを定義する" aria-label="Permalink to “メモリのインターフェースを定義する”">​</a></h3><p>このメモリモジュールには、クロックとリセット信号の他に表1のようなポートを定義する必要があります。 これを一つ一つ定義して接続するのは面倒なため、interfaceを定義します。</p><div id="memmodule-if" class="table"><p class="caption">表3.1: メモリモジュールに必要なポート</p><table><tr class="hline"><th>ポート名</th><th>型</th><th>向き</th><th>意味</th></tr><tr class="hline"><td>valid</td><td>logic</td><td>input</td><td>メモリアクセスを要求しているかどうか</td></tr><tr class="hline"><td>ready</td><td>logic</td><td>output</td><td>メモリアクセス要求を受容するかどうか</td></tr><tr class="hline"><td>addr</td><td>logic&lt;ADDR_WIDTH&gt;</td><td>input</td><td>アクセス先のアドレス</td></tr><tr class="hline"><td>wen</td><td>logic</td><td>input</td><td>書き込みかどうか (1なら書き込み)</td></tr><tr class="hline"><td>wdata</td><td>logic&lt;DATA_WIDTH&gt;</td><td>input</td><td>書き込むデータ</td></tr><tr class="hline"><td>rvalid</td><td>logic</td><td>output</td><td>受容した要求の処理が終了したかどうか</td></tr><tr class="hline"><td>rdata</td><td>logic&lt;DATA_WIDTH&gt;</td><td>output</td><td>受容した読み込み命令の結果</td></tr></table></div> \`src/membus_if.veryl\`を作成し、次のように記述します(リスト4)。 <p><span class="caption">▼リスト3.4: インターフェースの定義 (membus_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">interface</span> membus_if::&lt;DATA_WIDTH: <span class="hljs-keyword">u32</span>, ADDR_WIDTH: <span class="hljs-keyword">u32</span>&gt; {
    <span class="hljs-keyword">var</span> valid : <span class="hljs-keyword">logic</span>            ;
    <span class="hljs-keyword">var</span> ready : <span class="hljs-keyword">logic</span>            ;
    <span class="hljs-keyword">var</span> addr  : <span class="hljs-keyword">logic</span>&lt;ADDR_WIDTH&gt;;
    <span class="hljs-keyword">var</span> wen   : <span class="hljs-keyword">logic</span>            ;
    <span class="hljs-keyword">var</span> wdata : <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt;;
    <span class="hljs-keyword">var</span> rvalid: <span class="hljs-keyword">logic</span>            ;
    <span class="hljs-keyword">var</span> rdata : <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt;;

    <span class="hljs-keyword">modport</span> master {
        valid : <span class="hljs-keyword">output</span>,
        ready : <span class="hljs-keyword">input</span> ,
        addr  : <span class="hljs-keyword">output</span>,
        wen   : <span class="hljs-keyword">output</span>,
        wdata : <span class="hljs-keyword">output</span>,
        rvalid: <span class="hljs-keyword">input</span> ,
        rdata : <span class="hljs-keyword">input</span> ,
    }

    <span class="hljs-keyword">modport</span> slave {
        ..<span class="hljs-keyword">converse</span>(master)
    }
}
</code></pre></div><p>membus_ifはジェネリックインターフェースです。 ジェネリックパラメータとして、 <code>ADDR_WIDTH</code>と<code>DATA_WIDTH</code>が定義されています。 <code>ADDR_WIDTH</code>はアドレスの幅、 <code>DATA_WIDTH</code>は1つのデータの幅です。</p><p>interfaceを利用することで変数の定義が不要になり、 ポートの相互接続を簡潔にできます。</p><h3 id="メモリモジュールを実装する" tabindex="-1">メモリモジュールを実装する <a class="header-anchor" href="#メモリモジュールを実装する" aria-label="Permalink to “メモリモジュールを実装する”">​</a></h3><p>メモリを作る準備が整いました。 <code>src/memory.veryl</code>を作成し、次のように記述します(リスト5)。</p><p><span class="caption">▼リスト3.5: メモリモジュールの定義 (memory.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> memory::&lt;DATA_WIDTH: <span class="hljs-keyword">u32</span>, ADDR_WIDTH: <span class="hljs-keyword">u32</span>&gt; #(
    <span class="hljs-keyword">param</span> FILEPATH_IS_ENV: <span class="hljs-keyword">logic</span>  = <span class="hljs-number">0</span> , <span class="hljs-comment">// FILEPATHが環境変数名かどうか</span>
    <span class="hljs-keyword">param</span> FILEPATH       : <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;&quot;</span>, <span class="hljs-comment">// メモリの初期化用ファイルのパス, または環境変数名</span>
) (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                                     ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                                     ,
    membus: <span class="hljs-keyword">modport</span> membus_if::&lt;DATA_WIDTH, ADDR_WIDTH&gt;::slave,
) {
    <span class="hljs-keyword">type</span> DataType = <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt;;

    <span class="hljs-keyword">var</span> mem: DataType [<span class="hljs-number">2</span> ** ADDR_WIDTH];

    <span class="hljs-keyword">initial</span> {
        <span class="hljs-comment">// memを初期化する</span>
        <span class="hljs-keyword">if</span> FILEPATH != <span class="hljs-string">&quot;&quot;</span> {
            <span class="hljs-keyword">if</span> FILEPATH_IS_ENV {
                $readmemh(util::get_env(FILEPATH), mem);
            } <span class="hljs-keyword">else</span> {
                $readmemh(FILEPATH, mem);
            }
        }
    }

    <span class="hljs-keyword">always_comb</span> {
        membus.ready = <span class="hljs-number">1</span>;
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            membus.rvalid = <span class="hljs-number">0</span>;
            membus.rdata  = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            membus.rvalid = membus.valid;
            membus.rdata  = mem[membus.addr[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]];
            <span class="hljs-keyword">if</span> membus.valid &amp;&amp; membus.wen {
                mem[membus.addr[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]] = membus.wdata;
            }
        }
    }
}
</code></pre></div><p>memoryモジュールはジェネリックモジュールです。 次のジェネリックパラメータを定義しています。</p><dl><dt>DATA_WIDTH</dt><dd> メモリのデータの単位の幅を指定するためのパラメータです。<br> この単位ビットでデータを読み書きします。 </dd><dt>ADDR_WIDTH</dt><dd> データのアドレスの幅(メモリの容量)を指定するためのパラメータです。<br> メモリの容量は\`DATA_WIDTH * (2 ** ADDR_WIDTH)\`ビットになります。 </dd></dl><p>ポートには、クロック信号とリセット信号とmembus_ifインターフェースを定義しています。</p><p>読み込み、書き込み時の動作は次の通りです。</p><dl><dt>読み込み</dt><dd> 読み込みが要求されるとき、 \`membus.valid\`が\`1\`、 \`membus.wen\`が\`0\`、 \`membus.addr\`が対象アドレスになっています。 次のクロックで、\`membus.rvalid\`が\`1\`になり、 \`membus.rdata\`は対象アドレスのデータになります。 </dd><dt>書き込み</dt><dd> 書き込みが要求されるとき、 \`membus.valid\`が\`1\`、 \`membus.wen\`が\`1\`、 \`membus.addr\`が対象アドレスになっています。 always_ffブロックでは、 \`membus.wen\`が\`1\`であることを確認し、 \`1\`の場合は対象アドレスに\`membus.wdata\`を書き込みます。 次のクロックで\`membus.rvalid\`が\`1\`になります。 </dd></dl><h3 id="メモリの初期化、環境変数の読み込み" tabindex="-1">メモリの初期化、環境変数の読み込み <a class="header-anchor" href="#メモリの初期化、環境変数の読み込み" aria-label="Permalink to “メモリの初期化、環境変数の読み込み”">​</a></h3><p>memoryモジュールのパラメータには、<code>FILEPATH_IS_ENV</code>と<code>FILEPATH</code>を定義しています。 memoryモジュールをインスタンス化するとき、 <code>FILEPATH</code>には、 メモリの初期値が格納されたファイルのパスか、 ファイルパスが格納されている環境変数名を指定します。 初期化は<code>$readmemh</code>システムタスクで行います。</p><p><code>FILEPATH_IS_ENV</code>が<code>1</code>のとき、 環境変数の値を取得して、初期化用のファイルのパスとして利用します。 環境変数はutilパッケージのget_env関数で取得します。</p><p>utilパッケージとget_env関数を作成します。 <code>src/util.veryl</code>を作成し、次のように記述します(リスト6)。</p><p><span class="caption">▼リスト3.6: util.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">embed</span> (inline) sv{{{
    <span class="hljs-keyword">package</span> svutil;
        <span class="hljs-keyword">import</span> <span class="hljs-string">&quot;DPI-C&quot;</span> context <span class="hljs-keyword">function</span> <span class="hljs-keyword">string</span> get_env_value(<span class="hljs-keyword">input</span> <span class="hljs-keyword">string</span> key);
        <span class="hljs-keyword">function</span> <span class="hljs-keyword">string</span> get_env(<span class="hljs-keyword">input</span> <span class="hljs-keyword">string</span> name);
            <span class="hljs-keyword">return</span> get_env_value(name);
        endfunction
    endpackage
}}}

<span class="hljs-keyword">package</span> util {
    <span class="hljs-keyword">function</span> get_env (
        name: <span class="hljs-keyword">input</span> <span class="hljs-keyword">string</span>,
    ) -&gt; <span class="hljs-keyword">string</span> {
        <span class="hljs-keyword">return</span> $sv::svutil::get_env(name);
    }
}
</code></pre></div><p>utilパッケージのget_env関数は、 コード中に埋め込まれたSystemVerilogのsvutilパッケージのget_env関数の結果を返しています。 svutilパッケージのget_env関数は、 C(C++)で定義されているget_env_value関数の結果を返しています。 get_env_value関数は後で定義します。</p><h2 id="最上位モジュールの作成" tabindex="-1">最上位モジュールの作成 <a class="header-anchor" href="#最上位モジュールの作成" aria-label="Permalink to “最上位モジュールの作成”">​</a></h2><p>次に、 最上位のモジュール(Top Module)を作成して、 memoryモジュールをインスタンス化します。</p><p>最上位のモジュールとは、 設計の階層の最上位に位置するモジュールのことです。 論理設計では、最上位モジュールの中に、 あらゆるモジュールやレジスタなどをインスタンス化します。</p><p>memoryモジュールはジェネリックモジュールであるため、 1つのデータのビット幅とメモリのサイズを指定する必要があります。 これらを示す定数をeeiパッケージに定義します(リスト7)。 メモリのアドレス幅(サイズ)には、適当に16を設定しています。 これによりメモリ容量は32ビット * (2 ** 16) = 256KiBになります。</p><p><span class="caption">▼リスト3.7: メモリのデータ幅とアドレスの幅の定数を定義する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// メモリのデータ幅</span>
<span class="hljs-keyword">const</span> MEM_DATA_WIDTH: <span class="hljs-keyword">u32</span> = <span class="hljs-number">32</span>;
<span class="hljs-comment">// メモリのアドレス幅</span>
<span class="hljs-keyword">const</span> MEM_ADDR_WIDTH: <span class="hljs-keyword">u32</span> = <span class="hljs-number">16</span>;
</code></pre></div><p>それでは、最上位のモジュールを作成します。 <code>src/top.veryl</code>を作成し、次のように記述します(リスト8)。</p><p><span class="caption">▼リスト3.8: 最上位モジュールの定義 (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> top #(
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH_IS_ENV: <span class="hljs-keyword">bit</span>    = <span class="hljs-number">1</span>                 ,
    <span class="hljs-keyword">param</span> MEMORY_FILEPATH       : <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>,
) (
    clk: <span class="hljs-keyword">input</span> <span class="hljs-keyword">clock</span>,
    rst: <span class="hljs-keyword">input</span> <span class="hljs-keyword">reset</span>,
) {
    <span class="hljs-keyword">inst</span> membus: membus_if::&lt;MEM_DATA_WIDTH, MEM_ADDR_WIDTH&gt;;

    <span class="hljs-keyword">inst</span> mem: memory::&lt;MEM_DATA_WIDTH, MEM_ADDR_WIDTH&gt; #(
        FILEPATH_IS_ENV: MEMORY_FILEPATH_IS_ENV,
        FILEPATH       : MEMORY_FILEPATH       ,
    ) (
        clk     ,
        rst     ,
        membus  ,
    );
}
</code></pre></div><p>topモジュールでは、先ほど作成したmemoryモジュールと、 membus_ifインターフェースをインスタンス化しています。</p><p>memoryモジュールとmembusインターフェースのジェネリックパラメータには、 <code>DATA_WIDTH</code>に<code>MEM_DATA_WIDTH</code>、 <code>ADDR_WIDTH</code>に<code>MEM_ADDR_WIDTH</code>を指定しています。 メモリの初期化は、環境変数MEMORY_FILE_PATHで行うようにパラメータで指定しています。</p><h2 id="命令フェッチ" tabindex="-1">命令フェッチ <a class="header-anchor" href="#命令フェッチ" aria-label="Permalink to “命令フェッチ”">​</a></h2><p>メモリを作成したので、命令フェッチ処理を作れるようになりました。</p><p>いよいよ、CPUのメインの部分を作成します。</p><h3 id="命令フェッチを実装する" tabindex="-1">命令フェッチを実装する <a class="header-anchor" href="#命令フェッチを実装する" aria-label="Permalink to “命令フェッチを実装する”">​</a></h3><p><code>src/core.veryl</code>を作成し、 次のように記述します(リスト9)。</p><p><span class="caption">▼リスト3.9: core.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">module</span> core (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                          ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                          ,
    membus: <span class="hljs-keyword">modport</span> membus_if::&lt;ILEN, XLEN&gt;::master,
) {

    <span class="hljs-keyword">var</span> if_pc          : Addr ;
    <span class="hljs-keyword">var</span> if_is_requested: <span class="hljs-keyword">logic</span>; <span class="hljs-comment">// フェッチ中かどうか</span>
    <span class="hljs-keyword">var</span> if_pc_requested: Addr ; <span class="hljs-comment">// 要求したアドレス</span>

    <span class="hljs-keyword">let</span> if_pc_next: Addr = if_pc + <span class="hljs-number">4</span>;

    <span class="hljs-comment">// 命令フェッチ処理</span>
    <span class="hljs-keyword">always_comb</span> {
        membus.valid = <span class="hljs-number">1</span>;
        membus.addr  = if_pc;
        membus.wen   = <span class="hljs-number">0</span>;
        membus.wdata = &#39;x; <span class="hljs-comment">// wdataは使用しない</span>
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            if_pc           = <span class="hljs-number">0</span>;
            if_is_requested = <span class="hljs-number">0</span>;
            if_pc_requested = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">if</span> if_is_requested {
                <span class="hljs-keyword">if</span> membus.rvalid {
                    if_is_requested = membus.ready &amp;&amp; membus.valid;
                    <span class="hljs-keyword">if</span> membus.ready &amp;&amp; membus.valid {
                        if_pc           = if_pc_next;
                        if_pc_requested = if_pc;
                    }
                }
            } <span class="hljs-keyword">else</span> {
                <span class="hljs-keyword">if</span> membus.ready &amp;&amp; membus.valid {
                    if_is_requested = <span class="hljs-number">1</span>;
                    if_pc           = if_pc_next;
                    if_pc_requested = if_pc;
                }
            }
        }
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if</span> if_is_requested &amp;&amp; membus.rvalid {
            $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, if_pc_requested, membus.rdata);
        }
    }
}
</code></pre></div><p>coreモジュールは、 クロック信号とリセット信号、 membus_ifインターフェースをポートに持ちます。 membus_ifインターフェースのジェネリックパラメータには、 データ単位として<code>ILEN</code>(1つの命令のビット幅)、 アドレスの幅として<code>XLEN</code>を指定しています。</p><p><code>if_pc</code>レジスタはPC(プログラムカウンタ)です。 ここで<code>if_</code>という接頭辞はinstruction fetch(命令フェッチ)の略です。 <code>if_is_requested</code>はフェッチ中かどうかを管理しており、 フェッチ中のアドレスを<code>if_pc_requested</code>に格納しています。 どのレジスタも<code>0</code>で初期化しています。</p><p>always_combブロックでは、 アドレス<code>if_pc</code>にあるデータを常にメモリに要求しています。 命令フェッチではメモリの読み込みしか行わないため、 <code>membus.wen</code>は<code>0</code>にしています。</p><p>上から1つめのalways_ffブロックでは、 フェッチ中かどうかとメモリがready(要求を受け入れる)状態かどうかによって、 <code>if_pc</code>と<code>if_is_requested</code>、<code>if_pc_requested</code>の値を変更しています。</p><p>メモリにデータを要求するとき、 <code>if_pc</code>を次の命令のアドレス(<code>4</code>を足したアドレス)に変更して、 <code>if_is_requested</code>を<code>1</code>に変更しています。 フェッチ中かつ<code>membus.rvalid</code>が<code>1</code>のとき、 命令フェッチが完了し、データが<code>membus.rdata</code>に供給されています。 メモリがready状態なら、 すぐに次の命令フェッチを開始します。 この状態遷移を繰り返すことによって、 アドレス<code>0</code>→<code>4</code>→<code>8</code>→<code>c</code>→<code>10</code>...の命令を 次々にフェッチします。</p><p>上から2つめのalways_ffブロックは、 デバッグ用の表示を行うコードです。 命令フェッチが完了したとき、 その結果を<code>$display</code>システムタスクによって出力します。</p><h3 id="memoryモジュールとcoreモジュールを接続する" tabindex="-1">memoryモジュールとcoreモジュールを接続する <a class="header-anchor" href="#memoryモジュールとcoreモジュールを接続する" aria-label="Permalink to “memoryモジュールとcoreモジュールを接続する”">​</a></h3><p>次に、 topモジュールでcoreモジュールをインスタンス化し、 membus_ifインターフェースでメモリと接続します。</p><p>coreモジュールが指定するアドレスは1バイト単位のアドレスです。 それに対して、 memoryモジュールは32ビット(=4バイト)単位でデータを整列しているため、 データは4バイト単位のアドレスで指定する必要があります。</p><p>まず、1バイト単位のアドレスを、 4バイト単位のアドレスに変換する関数を作成します (リスト10)。 これは、1バイト単位のアドレスの下位2ビットを切り詰めることによって実現できます。</p><p><span class="caption">▼リスト3.10: アドレスを変換する関数を作成する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// アドレスをメモリのデータ単位でのアドレスに変換する</span>
<span class="hljs-keyword">function</span> addr_to_memaddr (
    addr: <span class="hljs-keyword">input</span> <span class="hljs-keyword">logic</span>&lt;XLEN&gt;,
) -&gt; <span class="hljs-keyword">logic</span>&lt;MEM_ADDR_WIDTH&gt; {
    <span class="hljs-keyword">return</span> addr[$clog2(MEM_DATA_WIDTH / <span class="hljs-number">8</span>)+:MEM_ADDR_WIDTH];
}
</code></pre></div><p>addr_to_memaddr関数は、 <code>MEM_DATA_WIDTH</code>(=32)をバイトに変換した値(=4)のlog2をとった値(=2)を使って、 <code>addr[17:2]</code>を切り取っています。 範囲の選択には<code>+:</code>を利用しています。</p><p>次に、coreモジュール用のmembus_ifインターフェースを作成します(リスト11)。 ジェネリックパラメータには、 coreモジュールのインターフェースのジェネリックパラメータと同じく、 ILENとXLENを割り当てます。</p><p><span class="caption">▼リスト3.11: coreモジュール用のmembus_ifインターフェースをインスタンス化する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> membus     : membus_if::&lt;MEM_DATA_WIDTH, MEM_ADDR_WIDTH&gt;;
<span class="custom-hl-bold"><span class="hljs-keyword">inst</span> membus_core: membus_if::&lt;ILEN, XLEN&gt;;</span>
</code></pre></div><p><code>membus</code>と<code>membus_core</code>を接続します。 アドレスにはaddr_to_memaddr関数で変換した値を割り当てます (リスト12)。</p><p><span class="caption">▼リスト3.12: membusとmembus_coreを接続する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_comb</span> {
    membus.valid      = membus_core.valid;
    membus_core.ready = membus.ready;
    <span class="hljs-comment">// アドレスをデータ幅単位のアドレスに変換する</span>
    membus.addr        = addr_to_memaddr(membus_core.addr);
    membus.wen         = <span class="hljs-number">0</span>; <span class="hljs-comment">// 命令フェッチは常に読み込み</span>
    membus.wdata       = &#39;x;
    membus_core.rvalid = membus.rvalid;
    membus_core.rdata  = membus.rdata;
}
</code></pre></div><p>最後にcoreモジュールをインスタンス化します (リスト13)。 メモリとCPUが接続されました。</p><p><span class="caption">▼リスト3.13: coreモジュールをインスタンス化する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk                ,
    rst                ,
    membus: membus_core,
);
</code></pre></div><h3 id="命令フェッチをテストする" tabindex="-1">命令フェッチをテストする <a class="header-anchor" href="#命令フェッチをテストする" aria-label="Permalink to “命令フェッチをテストする”">​</a></h3><p>ここまでのコードが正しく動くかを検証します。</p><p>Verylで記述されたコードは<code>veryl build</code>コマンドでSystemVerilogのコードに変換できます。 変換されたソースコードをオープンソースのVerilogシミュレータであるVerilatorで実行することで、 命令フェッチが正しく動いていることを確認します。</p><p>まず、Verylのプロジェクトをビルドします(リスト14)。</p><p><span class="caption">▼リスト3.14: Verylのプロジェクトのビルド</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">veryl <span class="hljs-built_in">fmt</span> ← フォーマットする</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">veryl build ← ビルドする</span>
</code></pre></div><p>上記のコマンドを実行すると、 verylファイルと同名の<code>sv</code>ファイルと<code>core.f</code>ファイルが生成されます。 拡張子が<code>sv</code>のファイルはSystemVerilogのファイルで、 <code>core.f</code>には生成されたSystemVerilogのファイルのリストが記載されています。 これをシミュレータのビルドに利用します。</p><p>シミュレータのビルドにはVerilatorを利用します。 Verilatorは、与えられたSystemVerilogのコードをC++プログラムに変換することでシミュレータを生成します。 Verilatorを利用するために、次のようなC++プログラムを書きます<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>。</p><p><code>src/tb_verilator.cpp</code>を作成し、次のように記述します(リスト15)。</p><p><span class="caption">▼リスト3.15: tb_verilator.cpp</span></p><div class="language-cpp"><button title="Copy Code" class="copy"></button><span class="lang">cpp</span><pre class="hljs"><code><span class="hljs-meta">#<span class="hljs-keyword">include</span> <span class="hljs-string">&lt;iostream&gt;</span></span>
<span class="hljs-meta">#<span class="hljs-keyword">include</span> <span class="hljs-string">&lt;filesystem&gt;</span></span>
<span class="hljs-meta">#<span class="hljs-keyword">include</span> <span class="hljs-string">&lt;stdlib.h&gt;</span></span>
<span class="hljs-meta">#<span class="hljs-keyword">include</span> <span class="hljs-string">&lt;verilated.h&gt;</span></span>
<span class="hljs-meta">#<span class="hljs-keyword">include</span> <span class="hljs-string">&quot;Vcore_top.h&quot;</span></span>

<span class="hljs-keyword">namespace</span> fs = std::filesystem;

<span class="hljs-keyword">extern</span> <span class="hljs-string">&quot;C&quot;</span> <span class="hljs-function"><span class="hljs-type">const</span> <span class="hljs-type">char</span>* <span class="hljs-title">get_env_value</span><span class="hljs-params">(<span class="hljs-type">const</span> <span class="hljs-type">char</span>* key)</span> </span>{
    <span class="hljs-type">const</span> <span class="hljs-type">char</span>* value = <span class="hljs-built_in">getenv</span>(key);
    <span class="hljs-keyword">if</span> (value == <span class="hljs-literal">nullptr</span>)
        <span class="hljs-keyword">return</span> <span class="hljs-string">&quot;&quot;</span>;
    <span class="hljs-keyword">return</span> value;
}

<span class="hljs-function"><span class="hljs-type">int</span> <span class="hljs-title">main</span><span class="hljs-params">(<span class="hljs-type">int</span> argc, <span class="hljs-type">char</span>** argv)</span> </span>{
    Verilated::<span class="hljs-built_in">commandArgs</span>(argc, argv);

    <span class="hljs-keyword">if</span> (argc &lt; <span class="hljs-number">2</span>) {
        std::cout &lt;&lt; <span class="hljs-string">&quot;Usage: &quot;</span> &lt;&lt; argv[<span class="hljs-number">0</span>] &lt;&lt; <span class="hljs-string">&quot; MEMORY_FILE_PATH [CYCLE]&quot;</span> &lt;&lt; std::endl;
        <span class="hljs-keyword">return</span> <span class="hljs-number">1</span>;
    }

    <span class="hljs-comment">// メモリの初期値を格納しているファイル名</span>
    std::string memory_file_path = argv[<span class="hljs-number">1</span>];
    <span class="hljs-keyword">try</span> {
        <span class="hljs-comment">// 絶対パスに変換する</span>
        fs::path absolutePath = fs::<span class="hljs-built_in">absolute</span>(memory_file_path);
        memory_file_path = absolutePath.<span class="hljs-built_in">string</span>();
    } <span class="hljs-built_in">catch</span> (<span class="hljs-type">const</span> std::exception&amp; e) {
        std::cerr &lt;&lt; <span class="hljs-string">&quot;Invalid memory file path : &quot;</span> &lt;&lt; e.<span class="hljs-built_in">what</span>() &lt;&lt; std::endl;
        <span class="hljs-keyword">return</span> <span class="hljs-number">1</span>;
    }

    <span class="hljs-comment">// シミュレーションを実行するクロックサイクル数</span>
    <span class="hljs-type">unsigned</span> <span class="hljs-type">long</span> <span class="hljs-type">long</span> cycles = <span class="hljs-number">0</span>;
    <span class="hljs-keyword">if</span> (argc &gt;= <span class="hljs-number">3</span>) {
        std::string cycles_string = argv[<span class="hljs-number">2</span>];
        <span class="hljs-keyword">try</span> {
            cycles = <span class="hljs-built_in">stoull</span>(cycles_string);
        } <span class="hljs-built_in">catch</span> (<span class="hljs-type">const</span> std::exception&amp; e) {
            std::cerr &lt;&lt; <span class="hljs-string">&quot;Invalid number: &quot;</span> &lt;&lt; argv[<span class="hljs-number">2</span>] &lt;&lt; std::endl;
            <span class="hljs-keyword">return</span> <span class="hljs-number">1</span>;
        }
    }

    <span class="hljs-comment">// 環境変数でメモリの初期化用ファイルを指定する</span>
    <span class="hljs-type">const</span> <span class="hljs-type">char</span>* original_env = <span class="hljs-built_in">getenv</span>(<span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>);
    <span class="hljs-built_in">setenv</span>(<span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>, memory_file_path.<span class="hljs-built_in">c_str</span>(), <span class="hljs-number">1</span>);

    <span class="hljs-comment">// top</span>
    Vcore_top *dut = <span class="hljs-keyword">new</span> <span class="hljs-built_in">Vcore_top</span>();

    <span class="hljs-comment">// reset</span>
    dut-&gt;clk = <span class="hljs-number">0</span>;
    dut-&gt;rst = <span class="hljs-number">1</span>;
    dut-&gt;<span class="hljs-built_in">eval</span>();
    dut-&gt;rst = <span class="hljs-number">0</span>;
    dut-&gt;<span class="hljs-built_in">eval</span>();

    <span class="hljs-comment">// 環境変数を元に戻す</span>
    <span class="hljs-keyword">if</span> (original_env != <span class="hljs-literal">nullptr</span>){
        <span class="hljs-built_in">setenv</span>(<span class="hljs-string">&quot;MEMORY_FILE_PATH&quot;</span>, original_env, <span class="hljs-number">1</span>);
    }

    <span class="hljs-comment">// loop</span>
    dut-&gt;rst = <span class="hljs-number">1</span>;
    <span class="hljs-keyword">for</span> (<span class="hljs-type">long</span> <span class="hljs-type">long</span> i=<span class="hljs-number">0</span>; !Verilated::<span class="hljs-built_in">gotFinish</span>() &amp;&amp; (cycles == <span class="hljs-number">0</span> || i / <span class="hljs-number">2</span> &lt; cycles); i++) {
        dut-&gt;clk = !dut-&gt;clk;
        dut-&gt;<span class="hljs-built_in">eval</span>();
    }

    dut-&gt;<span class="hljs-built_in">final</span>();
}
</code></pre></div><p>このC++プログラムは、 topモジュール(プログラム中ではVtop_coreクラス)をインスタンス化し、 そのクロック信号を反転して実行するのを繰り返しています。</p><p>このプログラムは、コマンドライン引数として次の2つの値を受け取ります。</p><dl><dt>MEMORY_FILE_PATH</dt><dd> メモリの初期値のファイルへのパス<br> 実行時に環境変数MEMORY_FILE_PATHとして渡されます。 </dd><dt>CYCLE</dt><dd> 何クロックで実行を終了するかを表す値<br> \`0\`のときは終了しません。デフォルト値は\`0\`です。 </dd></dl><p>Verilatorによるシミュレーションは、 topモジュールのクロック信号を更新してeval関数を呼び出すことにより実行します。 プログラムでは、 <code>clk</code>を反転させて<code>eval</code>するループの前に、 topモジュールをリセット信号によりリセットする必要があります。 そのため、 topモジュールの<code>rst</code>を<code>1</code>にしてから<code>eval</code>を実行し、 <code>rst</code>を<code>0</code>にしてまた<code>eval</code>を実行し、 <code>rst</code>を<code>1</code>にもどしてから<code>clk</code>を反転しています。</p><h4 id="シミュレータのビルド" tabindex="-1">シミュレータのビルド <a class="header-anchor" href="#シミュレータのビルド" aria-label="Permalink to “シミュレータのビルド”">​</a></h4><p>verilatorコマンドを実行し、 シミュレータをビルドします(リスト16)。</p><p><span class="caption">▼リスト3.16: シミュレータのビルド</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">verilator --cc -f core.f --exe src/tb_verialtor.cpp --top-module top --Mdir obj_dir</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make -C obj_dir -f Vcore_top.mk ← シミュレータをビルドする</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash"><span class="hljs-built_in">mv</span> obj_dir/Vcore_top obj_dir/sim ← シミュレータの名前をsimに変更する</span>
</code></pre></div><p><code>verilator --cc</code>コマンドに次のコマンドライン引数を渡して実行することで、 シミュレータを生成するためのプログラムが<code>obj_dir</code>に生成されます。</p><dl><dt>-f</dt><dd> SystemVerilogソースファイルのファイルリストを指定します。 今回は\`core.f\`を指定しています。 </dd><dt>--exe</dt><dd> 実行可能なシミュレータの生成に使用する、main関数が含まれたC++プログラムを指定します。 今回は\`src/tb_verilator.cpp\`を指定しています。 </dd><dt>--top-module</dt><dd> トップモジュールを指定します。 今回はtopモジュールを指定しています。 </dd><dt>--Mdir</dt><dd> 成果物の生成先を指定します。 今回は\`obj_dir\`ディレクトリに指定しています。 </dd></dl><p>リスト16のコマンドの実行により、 シミュレータが<code>obj_dir/sim</code>に生成されました。</p><h4 id="メモリの初期化用ファイルの作成" tabindex="-1">メモリの初期化用ファイルの作成 <a class="header-anchor" href="#メモリの初期化用ファイルの作成" aria-label="Permalink to “メモリの初期化用ファイルの作成”">​</a></h4><p>シミュレータを実行する前にメモリの初期値となるファイルを作成します。 <code>src/sample.hex</code>を作成し、次のように記述します(リスト17)。</p><p><span class="caption">▼リスト3.17: sample.hex</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>01234567
89abcdef
deadbeef
cafebebe
← 必ず末尾に改行をいれてください
</code></pre></div><p>値は16進数で4バイトずつ記述されています。 シミュレータを実行すると、 memoryモジュールは<code>$readmemh</code>システムタスクでsample.hexを読み込みます。 それにより、メモリは次のように初期化されます(表2)。</p><div id="sample.hex.initial" class="table"><p class="caption">表3.2: sample.hexによって設定されるメモリの初期値</p><table><tr class="hline"><th>アドレス</th><th>値</th></tr><tr class="hline"><td>0x00000000</td><td> 01234567</td></tr><tr class="hline"><td>0x00000004</td><td> 89abcdef</td></tr><tr class="hline"><td>0x00000008</td><td> deadbeef</td></tr><tr class="hline"><td>0x0000000c</td><td> cafebebe</td></tr><tr class="hline"><td>0x00000010～</td><td>不定</td></tr></table></div><h4 id="シミュレータの実行" tabindex="-1">シミュレータの実行 <a class="header-anchor" href="#シミュレータの実行" aria-label="Permalink to “シミュレータの実行”">​</a></h4><p>生成されたシミュレータを実行し、 アドレスが<code>0</code>、<code>4</code>、<code>8</code>、<code>c</code>のデータが正しくフェッチされていることを確認します(リスト18)。</p><p><span class="caption">▼リスト3.18: 命令フェッチの動作チェック</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample.hex 5</span>
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
</code></pre></div><p>メモリファイルのデータが、 4バイトずつ読み込まれていることを確認できます。</p><h4 id="makefileの作成" tabindex="-1">Makefileの作成 <a class="header-anchor" href="#makefileの作成" aria-label="Permalink to “Makefileの作成”">​</a></h4><p>ビルド、シミュレータのビルドのために一々コマンドを打つのは非常に面倒です。 これらの作業を一つのコマンドで済ますために、 <code>Makefile</code>を作成し、 次のように記述します(リスト19)。</p><p><span class="caption">▼リスト3.19: Makefile</span></p><div class="language-Makefile"><button title="Copy Code" class="copy"></button><span class="lang">Makefile</span><pre class="hljs"><code>PROJECT = core
FILELIST = <span class="hljs-variable">$(PROJECT)</span>.f

TOP_MODULE = top
TB_PROGRAM = src/tb_verilator.cpp
OBJ_DIR = obj_dir/
SIM_NAME = sim
VERILATOR_FLAGS = <span class="hljs-string">&quot;&quot;</span>

<span class="hljs-section">build:</span>
        veryl fmt
        veryl build

<span class="hljs-section">clean:</span>
        veryl clean
        rm -rf <span class="hljs-variable">$(OBJ_DIR)</span>

<span class="hljs-section">sim:</span>
        verilator --cc <span class="hljs-variable">$(VERILATOR_FLAGS)</span> -f <span class="hljs-variable">$(FILELIST)</span> --exe <span class="hljs-variable">$(TB_PROGRAM)</span> --top-module <span class="hljs-variable">$(PROJECT)</span>_<span class="hljs-variable">$(TOP_MODULE)</span> --Mdir <span class="hljs-variable">$(OBJ_DIR)</span>
        make -C <span class="hljs-variable">$(OBJ_DIR)</span> -f V<span class="hljs-variable">$(PROJECT)</span>_<span class="hljs-variable">$(TOP_MODULE)</span>.mk
        mv <span class="hljs-variable">$(OBJ_DIR)</span>/V<span class="hljs-variable">$(PROJECT)</span>_<span class="hljs-variable">$(TOP_MODULE)</span> <span class="hljs-variable">$(OBJ_DIR)</span>/<span class="hljs-variable">$(SIM_NAME)</span>

<span class="hljs-meta"><span class="hljs-keyword">.PHONY</span>: build clean sim</span>
</code></pre></div><p>これ以降、 次のようにVerylのソースコードのビルド、 シミュレータのビルド、 成果物の削除ができるようになります(リスト20)。</p><p><span class="caption">▼リスト3.20: Makefileによって追加されたコマンド</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build ← Verylのソースコードのビルド</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim ← シミュレータのビルド</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make clean ← ビルドした成果物の削除</span>
</code></pre></div><h3 id="フェッチした命令をfifoに格納する" tabindex="-1">フェッチした命令をFIFOに格納する <a class="header-anchor" href="#フェッチした命令をfifoに格納する" aria-label="Permalink to “フェッチした命令をFIFOに格納する”">​</a></h3><p><img src="`+c+`" alt="FIFO"> フェッチした命令は次々に実行されますが、 その命令が何クロックで実行されるかは分かりません。 命令が常に1クロックで実行される場合は、 現状の常にフェッチし続けるようなコードで問題ありませんが、 例えばメモリにアクセスする命令は実行に何クロックかかるか分かりません。</p><p>複数クロックかかる命令に対応するために、 命令の処理が終わってから次の命令をフェッチするように変更する場合、 命令の実行の流れは次のようになります。</p><ol><li>命令の処理が終わる</li><li>次の命令のフェッチ要求をメモリに送る</li><li>命令がフェッチされ、命令の処理を開始する</li></ol><p>このとき、 命令の処理が終わってから次の命令をフェッチするため、 次々にフェッチするよりも多くのクロック数が必要です。 これはCPUの性能を露骨に悪化させるので許容できません。</p><h4 id="fifoの作成" tabindex="-1">FIFOの作成 <a class="header-anchor" href="#fifoの作成" aria-label="Permalink to “FIFOの作成”">​</a></h4><p>そこで、 <strong>FIFO</strong>(First In First Out, ファイフォ)を作成して、 フェッチした命令を格納します。 FIFOとは、先に入れたデータが先に出されるデータ構造のことです(図2)。 命令をフェッチしたらFIFOに格納(enqueue)し、 命令を処理するときにFIFOから取り出し(dequeue)ます。</p><p>Verylの標準ライブラリ<sup class="footnote-ref"><a href="#fn3" id="fnref3">[3]</a></sup>にはFIFOが用意されていますが、 FIFOは簡単なデータ構造なので自分で作ってみましょう。 <code>src/fifo.veryl</code>を作成し、次のように記述します(リスト21)。</p><p><span class="caption">▼リスト3.21: FIFOモジュールの実装 (fifo.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> fifo #(
    <span class="hljs-keyword">param</span> DATA_TYPE: <span class="hljs-keyword">type</span> = <span class="hljs-keyword">logic</span>,
    <span class="hljs-keyword">param</span> WIDTH    : <span class="hljs-keyword">u32</span>  = <span class="hljs-number">2</span>    ,
) (
    clk       : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>        ,
    rst       : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>        ,
    wready    : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>        ,
    wready_two: <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>     = _,
    wvalid    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        ,
    wdata     : <span class="hljs-keyword">input</span>  DATA_TYPE    ,
    rready    : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        ,
    rvalid    : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>        ,
    rdata     : <span class="hljs-keyword">output</span> DATA_TYPE    ,
) {
    <span class="hljs-keyword">if</span> WIDTH == <span class="hljs-number">1</span> :width_one {
        <span class="hljs-keyword">always_comb</span> {
            wready     = !rvalid || rready;
            wready_two = <span class="hljs-number">0</span>;
        }
        <span class="hljs-keyword">always_ff</span> {
            <span class="hljs-keyword">if_reset</span> {
                rdata  = <span class="hljs-number">0</span>;
                rvalid = <span class="hljs-number">0</span>;
            } <span class="hljs-keyword">else</span> {
                <span class="hljs-keyword">if</span> wready &amp;&amp; wvalid {
                    rdata  = wdata;
                    rvalid = <span class="hljs-number">1</span>;
                } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> rready {
                    rvalid = <span class="hljs-number">0</span>;
                }
            }
        }
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">type</span> Ptr = <span class="hljs-keyword">logic</span>&lt;WIDTH&gt;;

        <span class="hljs-keyword">var</span> head      : Ptr;
        <span class="hljs-keyword">var</span> tail      : Ptr;
        <span class="hljs-keyword">let</span> tail_plus1: Ptr = tail + <span class="hljs-number">1</span> <span class="hljs-keyword">as</span> Ptr;
        <span class="hljs-keyword">let</span> tail_plus2: Ptr = tail + <span class="hljs-number">2</span> <span class="hljs-keyword">as</span> Ptr;

        <span class="hljs-keyword">var</span> mem: DATA_TYPE [<span class="hljs-number">2</span> ** WIDTH];

        <span class="hljs-keyword">always_comb</span> {
            wready     = tail_plus1 != head;
            wready_two = wready &amp;&amp; tail_plus2 != head;
            rvalid     = head != tail;
            rdata      = mem[head];
        }

        <span class="hljs-keyword">always_ff</span> {
            <span class="hljs-keyword">if_reset</span> {
                head = <span class="hljs-number">0</span>;
                tail = <span class="hljs-number">0</span>;
            } <span class="hljs-keyword">else</span> {
                <span class="hljs-keyword">if</span> wready &amp;&amp; wvalid {
                    mem[tail] = wdata;
                    tail      = tail + <span class="hljs-number">1</span>;
                }
                <span class="hljs-keyword">if</span> rready &amp;&amp; rvalid {
                    head = head + <span class="hljs-number">1</span>;
                }
            }
        }
    }
}
</code></pre></div><p>fifoモジュールは、 <code>DATA_TYPE</code>型のデータを <code>2 ** WIDTH - 1</code>個格納できるFIFOです。 操作は次のように行います。</p><dl><dt>データを追加する</dt><dd> \`wready\`が\`1\`のとき、データを追加できます。**** データを追加するためには、追加したいデータを\`wdata\`に格納し、\`wvalid\`を\`1\`にします。**** 追加したデータは次のクロック以降に取り出せます。 </dd><dt>データを取り出す</dt><dd> \`rvalid\`が\`1\`のとき、データを取り出せます。**** データを取り出せるとき、\`rdata\`にデータが供給されています。**** \`rready\`を\`1\`にすることで、FIFOにデータを取り出したことを通知できます。 </dd></dl><p>データの格納状況は、<code>head</code>レジスタと<code>tail</code>レジスタで管理します。 データを追加するとき、つまり<code>wready &amp;&amp; wvalid</code>のとき、<code>tail = tail + 1</code>しています。 データを取り出すとき、つまり<code>rready &amp;&amp; rvalid</code>のとき、<code>head = head + 1</code>しています。</p><p>データを追加できる状況とは、 <code>tail</code>に<code>1</code>を足しても<code>head</code>を超えないとき、 つまり、<code>tail</code>が指す場所が一周してしまわないときです。 この制限から、FIFOには最大でも<code>2 ** WIDTH - 1</code>個しかデータを格納できません。 データを取り出せる状況とは、<code>head</code>と<code>tail</code>の指す場所が違うときです。 <code>WIDTH</code>が<code>1</code>のときは特別で、既にデータが1つ入っていても、 <code>rready</code>が<code>1</code>のときはデータを追加できるようにしています。</p><h4 id="命令フェッチ処理の変更" tabindex="-1">命令フェッチ処理の変更 <a class="header-anchor" href="#命令フェッチ処理の変更" aria-label="Permalink to “命令フェッチ処理の変更”">​</a></h4><p>fifoモジュールを使って、命令フェッチ処理を変更します。</p><p>まず、FIFOに格納する型を定義します(リスト22)。 <code>if_fifo_type</code>には、 命令のアドレス(<code>addr</code>)と命令のビット列(<code>bits</code>)を格納するためのフィールドを含めます。</p><p><span class="caption">▼リスト3.22: FIFOで格納する型を定義する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// ifのFIFOのデータ型</span>
<span class="hljs-keyword">struct</span> if_fifo_type {
    addr: Addr,
    bits: Inst,
}
</code></pre></div><p>次に、FIFOと接続するための変数を定義します(リスト23)。</p><p><span class="caption">▼リスト3.23: FIFOと接続するための変数を定義する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// FIFOの制御用レジスタ</span>
<span class="hljs-keyword">var</span> if_fifo_wready    : <span class="hljs-keyword">logic</span>       ;
<span class="hljs-keyword">var</span> if_fifo_wready_two: <span class="hljs-keyword">logic</span>       ;
<span class="hljs-keyword">var</span> if_fifo_wvalid    : <span class="hljs-keyword">logic</span>       ;
<span class="hljs-keyword">var</span> if_fifo_wdata     : if_fifo_type;
<span class="hljs-keyword">var</span> if_fifo_rready    : <span class="hljs-keyword">logic</span>       ;
<span class="hljs-keyword">var</span> if_fifo_rvalid    : <span class="hljs-keyword">logic</span>       ;
<span class="hljs-keyword">var</span> if_fifo_rdata     : if_fifo_type;
</code></pre></div><p>FIFOモジュールをインスタンス化します(リスト24)。 <code>DATA_TYPE</code>パラメータに<code>if_fifo_type</code>を渡すことで、 アドレスと命令のペアを格納できるようにします。 <code>WIDTH</code>パラメータには<code>3</code>を指定することで、 サイズを<code>2 ** 3 - 1 = 7</code>にしています。 このサイズは適当です。</p><p><span class="caption">▼リスト3.24: FIFOをインスタンス化する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// フェッチした命令を格納するFIFO</span>
<span class="hljs-keyword">inst</span> if_fifo: fifo #(
    DATA_TYPE: if_fifo_type,
    WIDTH    : <span class="hljs-number">3</span>           ,
) (
    clk                           ,
    rst                           ,
    wready    : if_fifo_wready    ,
    wready_two: if_fifo_wready_two,
    wvalid    : if_fifo_wvalid    ,
    wdata     : if_fifo_wdata     ,
    rready    : if_fifo_rready    ,
    rvalid    : if_fifo_rvalid    ,
    rdata     : if_fifo_rdata     ,
);
</code></pre></div><p>fifoモジュールをインスタンス化したので、 メモリへデータを要求する処理を変更します(リスト25)。</p><p><span class="caption">▼リスト3.25: フェッチ処理の変更 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// 命令フェッチ処理</span>
<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-comment">// FIFOに2個以上空きがあるとき、命令をフェッチする</span>
    membus.valid = <span class="custom-hl-bold">if_fifo_wready_two</span>;
    membus.addr  = if_pc;
    membus.wen   = <span class="hljs-number">0</span>;
    membus.wdata = &#39;x; <span class="hljs-comment">// wdataは使用しない</span>

    <span class="custom-hl-bold"><span class="hljs-comment">// 常にFIFOから命令を受け取る</span></span>
    <span class="custom-hl-bold">if_fifo_rready = <span class="hljs-number">1</span>;</span>
}
</code></pre></div><p>リスト25では、 メモリに命令フェッチを要求する条件を FIFOに2つ以上空きがあるという条件に変更しています<sup class="footnote-ref"><a href="#fn4" id="fnref4">[4]</a></sup>。 これにより、FIFOがあふれてしまうことがなくなります。 また、FIFOから常にデータを取り出すようにしています。</p><p>命令をフェッチできたらFIFOに格納する処理をalways_ffブロックの中に追加します(リスト26)。</p><p><span class="caption">▼リスト3.26: FIFOへのデータの格納 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// IFのFIFOの制御</span>
<span class="hljs-keyword">if</span> if_is_requested &amp;&amp; membus.rvalid { ← フェッチできた時
    if_fifo_wvalid     = <span class="hljs-number">1</span>;
    if_fifo_wdata.addr = if_pc_requested;
    if_fifo_wdata.bits = membus.rdata;
} <span class="hljs-keyword">else</span> {
    <span class="hljs-keyword">if</span> if_fifo_wvalid &amp;&amp; if_fifo_wready { ← FIFOにデータを格納できる時
        if_fifo_wvalid = <span class="hljs-number">0</span>;
    }
}
</code></pre></div><p><code>if_fifo_wvalid</code>と<code>if_fifo_wdata</code>を<code>0</code>に初期化します(リスト27)。</p><p><span class="caption">▼リスト3.27: 変数の初期化 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if_reset</span> {
    if_pc           = <span class="hljs-number">0</span>;
    if_is_requested = <span class="hljs-number">0</span>;
    if_pc_requested = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">if_fifo_wvalid  = <span class="hljs-number">0</span>;</span>
    <span class="custom-hl-bold">if_fifo_wdata   = <span class="hljs-number">0</span>;</span>
} <span class="hljs-keyword">else</span> {
</code></pre></div><p>命令をフェッチできたとき、 <code>if_fifo_wvalid</code>の値を<code>1</code>にして、 <code>if_fifo_wdata</code>にフェッチした命令とアドレスを格納します。 これにより、次のクロック以降のFIFOに空きがあるタイミングでデータが追加されます。</p><p>それ以外のとき、 FIFOにデータを格納しようとしていてFIFOに空きがあるとき、 <code>if_fifo_wvalid</code>を<code>0</code>にすることでデータの追加を完了します。</p><p>命令フェッチはFIFOに2つ以上空きがあるときに行うため、 まだ追加されていないデータが<code>if_fifo_wdata</code>に格納されていても、 別のデータに上書きされてしまうことはありません。</p><h4 id="fifoのテスト" tabindex="-1">FIFOのテスト <a class="header-anchor" href="#fifoのテスト" aria-label="Permalink to “FIFOのテスト”">​</a></h4><p>FIFOをテストする前に、命令のデバッグ表示を行うコードを変更します(リスト28)。</p><p><span class="caption">▼リスト3.28: 命令のデバッグ表示を変更する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> inst_pc  : Addr = if_fifo_rdata.addr;
<span class="hljs-keyword">let</span> inst_bits: Inst = if_fifo_rdata.bits;

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> if_fifo_rvalid {
        $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, inst_pc, inst_bits);
    }
}
</code></pre></div><p>シミュレータを実行します(リスト29)。 命令がフェッチされて表示されるまでに、 FIFOに格納してから取り出すクロック分だけ遅延があることに注意してください。</p><p><span class="caption">▼リスト3.29: FIFOをテストする</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample.hex 7</span>
00000000 : 01234567
00000004 : 89abcdef
00000008 : deadbeef
0000000c : cafebebe
</code></pre></div><h2 id="命令のデコードと即値の生成" tabindex="-1">命令のデコードと即値の生成 <a class="header-anchor" href="#命令のデコードと即値の生成" aria-label="Permalink to “命令のデコードと即値の生成”">​</a></h2><p>命令をフェッチできたら、 フェッチした命令がどのような意味を持つかをチェックし、 CPUが何をすればいいかを判断するためのフラグや値を生成します。 この作業のことを命令の<strong>デコード</strong>(decode)と呼びます。</p><p>RISC-Vの命令のビット列には次のような要素が含まれています。</p><dl><dt>オペコード (opcode)</dt><dd> 5ビットの値です。命令を区別するために使用されます。 </dd><dt>funct3、funct7</dt><dd> funct3は3ビット、funct7は7ビットの値です。 命令を区別するために使用されます。 </dd><dt>即値 (Immediate, imm)</dt><dd> 命令のビット列の中に直接含まれる数値です。 </dd><dt>ソースレジスタ(Source Register)の番号</dt><dd> 計算やメモリアクセスに使う値が格納されているレジスタの番号です。 レジスタは32個あるため5ビットの値になっています。 </dd><dt>デスティネーションレジスタ(Destination Register)の番号</dt><dd> 命令の結果を格納するためのレジスタの番号です。 ソースレジスタと同様に5ビットの値になっています。 </dd></dl><p>RISC-Vにはいくつかの命令の形式がありますが、 RV32IにはR、I、S、B、U、Jの6つの形式の命令が存在しています (図3)。</p><p><img src="`+t+`" alt="RISC-Vの命令形式"></p><dl><dt>R形式</dt><dd> ソースレジスタ(rs1、rs2)が2つ、デスティネーションレジスタ(rd)が1つの命令形式です。 2つのソースレジスタの値を使って計算し、その結果をデスティネーションレジスタに格納します。 例えばADD(足し算)、SUB(引き算)命令に使用されています。 </dd><dt>I形式</dt><dd> ソースレジスタ(rs1)が1つ、デスティネーションレジスタ(rd)が1つの命令形式です。 12ビットの即値(imm[11:0])が命令中に含まれており、これとrs1を使って計算し、 その結果をデスティネーションレジスタに格納します。 例えばADDI(即値を使った足し算)、ANDI(即値を使ったAND演算)命令に使用されています。 </dd><dt>S形式</dt><dd> ソースレジスタ(rs1、rs2)が2つの命令形式です。 12ビットの即値(imm[11:5]、imm[4:0])が命令中に含まれており、 即値とrs1を足し合わせたメモリのアドレスに、rs2を書き込みます。 例えばSW命令(メモリに32ビット書き込む命令)に使用されています。 </dd><dt>B形式</dt><dd> ソースレジスタ(rs1、rs2)が2つの命令形式です。 12ビットの即値(imm[12]、imm[11]、imm[10:5]、imm[4:1])が命令中に含まれています。 分岐命令に使用されており、 ソースレジスタの計算の結果が分岐を成立させる場合、 PCに即値を足したアドレスにジャンプします。 </dd><dt>U形式</dt><dd> デスティネーションレジスタ(rd)が1つの命令形式です。 20ビットの即値(imm[31:12])が命令中に含まれています。 例えばLUI命令(レジスタの上位20ビットを設定する命令)に使用されています。 </dd><dt>J形式</dt><dd> デスティネーションレジスタ(rd)が1つの命令形式です。 20ビットの即値(imm[20]、imm[19:12]、imm[11]、imm[10:1])が命令中に含まれています。 例えばJAL命令(ジャンプ命令)に使用されており、 PCに即値を足したアドレスにジャンプします。 </dd></dl><p>全ての命令形式にはopcodeが共通して存在しています。 命令の判別にはopcode、funct3、funct7を利用します。</p><h3 id="デコード用の定数と型を定義する" tabindex="-1">デコード用の定数と型を定義する <a class="header-anchor" href="#デコード用の定数と型を定義する" aria-label="Permalink to “デコード用の定数と型を定義する”">​</a></h3><p>デコード処理を書く前に、 デコードに利用する定数と型を定義します。 <code>src/corectrl.veryl</code>を作成し、 次のように記述します(リスト30)。</p><p><span class="caption">▼リスト3.30: corectrl.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;

<span class="hljs-keyword">package</span> corectrl {
    <span class="hljs-comment">// 命令形式を表す列挙型</span>
    <span class="hljs-keyword">enum</span> InstType: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">6</span>&gt; {
        X = <span class="hljs-number">6&#39;b000000</span>,
        R = <span class="hljs-number">6&#39;b000001</span>,
        I = <span class="hljs-number">6&#39;b000010</span>,
        S = <span class="hljs-number">6&#39;b000100</span>,
        B = <span class="hljs-number">6&#39;b001000</span>,
        U = <span class="hljs-number">6&#39;b010000</span>,
        J = <span class="hljs-number">6&#39;b100000</span>,
    }

    <span class="hljs-comment">// 制御に使うフラグ用の構造体</span>
    <span class="hljs-keyword">struct</span> InstCtrl {
        itype   : InstType   , <span class="hljs-comment">// 命令の形式</span>
        rwb_en  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// レジスタに書き込むかどうか</span>
        is_lui  : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// LUI命令である</span>
        is_aluop: <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ALUを利用する命令である</span>
        is_jump : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ジャンプ命令である</span>
        is_load : <span class="hljs-keyword">logic</span>      , <span class="hljs-comment">// ロード命令である</span>
        funct3  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">3</span>&gt;, <span class="hljs-comment">// 命令のfunct3フィールド</span>
        funct7  : <span class="hljs-keyword">logic</span>   &lt;<span class="hljs-number">7</span>&gt;, <span class="hljs-comment">// 命令のfunct7フィールド</span>
    }
}
</code></pre></div><p><code>InstType</code>は、命令の形式を表すための列挙型です。 <code>InstType</code>の幅は6ビットで、それぞれのビットに1つの命令形式が対応しています。 どの命令形式にも対応しない場合、すべてのビットが0の<code>InstType::X</code>を対応させます。</p><p><code>InstCtrl</code>は、制御に使うフラグをひとまとめにした構造体です。 <code>itype</code>には命令の形式、 <code>funct3</code>と<code>funct7</code>にはそれぞれ命令のfunct3とfunct7フィールドを格納します。 これ以外の構造体のフィールドは、使用するときに説明します。</p><p>命令をデコードするとき、まずopcodeを使って判別します。 このために、デコードに使う定数をeeiパッケージに記述します(リスト31)。</p><p><span class="caption">▼リスト3.31: opcodeの定数を定義する (eei.veryl)</span></p><div class="language-very"><button title="Copy Code" class="copy"></button><span class="lang">very</span><pre class="hljs"><code>// opcode
const OP_LUI   : logic&lt;7&gt; = 7&#39;b0110111;
const OP_AUIPC : logic&lt;7&gt; = 7&#39;b0010111;
const OP_OP    : logic&lt;7&gt; = 7&#39;b0110011;
const OP_OP_IMM: logic&lt;7&gt; = 7&#39;b0010011;
const OP_JAL   : logic&lt;7&gt; = 7&#39;b1101111;
const OP_JALR  : logic&lt;7&gt; = 7&#39;b1100111;
const OP_BRANCH: logic&lt;7&gt; = 7&#39;b1100011;
const OP_LOAD  : logic&lt;7&gt; = 7&#39;b0000011;
const OP_STORE : logic&lt;7&gt; = 7&#39;b0100011;
</code></pre></div><p>これらの値とそれぞれの命令の対応は、仕様書を確認してください。</p><h3 id="制御フラグと即値を生成する" tabindex="-1">制御フラグと即値を生成する <a class="header-anchor" href="#制御フラグと即値を生成する" aria-label="Permalink to “制御フラグと即値を生成する”">​</a></h3><p>デコード処理を書く準備が整いました。 <code>src/inst_decoder.veryl</code>を作成し、 次のように記述します(リスト32)。</p><p><span class="caption">▼リスト3.32: inst_decoder.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> corectrl::*;

<span class="hljs-keyword">module</span> inst_decoder (
    bits: <span class="hljs-keyword">input</span>  Inst    ,
    ctrl: <span class="hljs-keyword">output</span> InstCtrl,
    imm : <span class="hljs-keyword">output</span> UIntX   ,
) {
    <span class="hljs-comment">// 即値の生成</span>
    <span class="hljs-keyword">let</span> imm_i_g: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = bits[<span class="hljs-number">31</span>:<span class="hljs-number">20</span>];
    <span class="hljs-keyword">let</span> imm_s_g: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {bits[<span class="hljs-number">31</span>:<span class="hljs-number">25</span>], bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>]};
    <span class="hljs-keyword">let</span> imm_b_g: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">12</span>&gt; = {bits[<span class="hljs-number">31</span>], bits[<span class="hljs-number">7</span>], bits[<span class="hljs-number">30</span>:<span class="hljs-number">25</span>], bits[<span class="hljs-number">11</span>:<span class="hljs-number">8</span>]};
    <span class="hljs-keyword">let</span> imm_u_g: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">20</span>&gt; = bits[<span class="hljs-number">31</span>:<span class="hljs-number">12</span>];
    <span class="hljs-keyword">let</span> imm_j_g: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">20</span>&gt; = {bits[<span class="hljs-number">31</span>], bits[<span class="hljs-number">19</span>:<span class="hljs-number">12</span>], bits[<span class="hljs-number">20</span>], bits[<span class="hljs-number">30</span>:<span class="hljs-number">21</span>]};

    <span class="hljs-keyword">let</span> imm_i: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_i_g), imm_i_g};
    <span class="hljs-keyword">let</span> imm_s: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_s_g), imm_s_g};
    <span class="hljs-keyword">let</span> imm_b: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_b_g) - <span class="hljs-number">1</span>, imm_b_g, <span class="hljs-number">1&#39;b0</span>};
    <span class="hljs-keyword">let</span> imm_u: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_u_g) - <span class="hljs-number">12</span>, imm_u_g, <span class="hljs-number">12&#39;b0</span>};
    <span class="hljs-keyword">let</span> imm_j: UIntX = {bits[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> XLEN - $bits(imm_j_g) - <span class="hljs-number">1</span>, imm_j_g, <span class="hljs-number">1&#39;b0</span>};

    <span class="hljs-keyword">let</span> op: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = bits[<span class="hljs-number">6</span>:<span class="hljs-number">0</span>];
    <span class="hljs-keyword">let</span> f7: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">7</span>&gt; = bits[<span class="hljs-number">31</span>:<span class="hljs-number">25</span>];
    <span class="hljs-keyword">let</span> f3: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt; = bits[<span class="hljs-number">14</span>:<span class="hljs-number">12</span>];

    <span class="hljs-keyword">const</span> T: <span class="hljs-keyword">logic</span> = <span class="hljs-number">1&#39;b1</span>;
    <span class="hljs-keyword">const</span> F: <span class="hljs-keyword">logic</span> = <span class="hljs-number">1&#39;b0</span>;

    <span class="hljs-keyword">always_comb</span> {
        imm = <span class="hljs-keyword">case</span> op {
            OP_LUI, OP_AUIPC: imm_u,
            OP_JAL          : imm_j,
            OP_JALR, OP_LOAD: imm_i,
            OP_OP_IMM       : imm_i,
            OP_BRANCH       : imm_b,
            OP_STORE        : imm_s,
            <span class="hljs-keyword">default</span>         : &#39;x,
        };
        ctrl = {
            <span class="hljs-keyword">case</span> op {
                OP_LUI: {
                    InstType::U, T, T, F, F, F
                },
                OP_AUIPC: {
                    InstType::U, T, F, F, F, F
                },
                OP_JAL: {
                    InstType::J, T, F, F, T, F
                },
                OP_JALR: {
                    InstType::I, T, F, F, T, F
                },
                OP_BRANCH: {
                    InstType::B, F, F, F, F, F
                },
                OP_LOAD: {
                    InstType::I, T, F, F, F, T
                },
                OP_STORE: {
                    InstType::S, F, F, F, F, F
                },
                OP_OP: {
                    InstType::R, T, F, T, F, F
                },
                OP_OP_IMM: {
                    InstType::I, T, F, T, F, F
                },
                <span class="hljs-keyword">default</span>: {
                    InstType::X, F, F, F, F, F
                },
            }, f3, f7
        };
    }
}
</code></pre></div><p>inst_decoderモジュールは、 命令のビット列<code>bits</code>を受け取り、 制御信号<code>ctrl</code>と即値<code>imm</code>を出力します。</p><h4 id="即値の生成" tabindex="-1">即値の生成 <a class="header-anchor" href="#即値の生成" aria-label="Permalink to “即値の生成”">​</a></h4><p>B形式の命令を考えます。 まず、命令のビット列から即値部分を取り出して変数<code>imm_b_g</code>を生成します。 B形式の命令内に含まれている即値は12ビットで、最上位ビットは符号ビットです。 最上位ビットを繰り返す(符号拡張する)ことによって、32ビットの即値<code>imm_b</code>を生成します。</p><p>always_combブロックでは、 opcodeをcase式で分岐することにより <code>imm</code>ポートに適切な即値を供給しています。</p><h4 id="制御フラグの生成" tabindex="-1">制御フラグの生成 <a class="header-anchor" href="#制御フラグの生成" aria-label="Permalink to “制御フラグの生成”">​</a></h4><p>opcodeがOP-IMMな命令、 例えばADDI命令を考えます。 ADDI命令は、即値とソースレジスタの値を足し、 デスティネーションレジスタに結果を格納する命令です。</p><p>always_combブロックでは、 opcodeが<code>OP_OP_IMM</code>(OP-IMM)のとき、 次のように制御信号<code>ctrl</code>を設定します。 1ビットの<code>1&#39;b0</code>と<code>1&#39;b1</code>を入力する手間を省くために、 <code>F</code>と<code>T</code>という定数を用意していることに注意してください。</p><ul><li>命令形式<code>itype</code>を<code>InstType::I</code>に設定します</li><li>結果をレジスタに書き込むため、<code>rwb_en</code>を<code>1</code>に設定します</li><li>ALU(計算を実行する部品)を利用するため、<code>is_aluop</code>を<code>1</code>に設定します</li><li><code>funct3</code>、<code>funct7</code>に命令中のビットをそのまま設定します</li><li>それ以外のフィールドは<code>0</code>に設定します</li></ul><h3 id="デコーダをインスタンス化する" tabindex="-1">デコーダをインスタンス化する <a class="header-anchor" href="#デコーダをインスタンス化する" aria-label="Permalink to “デコーダをインスタンス化する”">​</a></h3><p>inst_decoderモジュールを、 coreモジュールでインスタンス化します(リスト33)。</p><p><span class="caption">▼リスト3.33: inst_decoderモジュールのインスタンス化 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> inst_pc  : Addr     = if_fifo_rdata.addr;
<span class="hljs-keyword">let</span> inst_bits: Inst     = if_fifo_rdata.bits;
<span class="hljs-keyword">var</span> inst_ctrl: InstCtrl;
<span class="hljs-keyword">var</span> inst_imm : UIntX   ;

<span class="hljs-keyword">inst</span> decoder: inst_decoder (
    bits: inst_bits,
    ctrl: inst_ctrl,
    imm : inst_imm ,
);
</code></pre></div><p>まず、デコーダとcoreモジュールを接続するために<code>inst_ctrl</code>と<code>inst_imm</code>を定義します。 次に、inst_decoderモジュールをインスタンス化します。 <code>bits</code>ポートに<code>inst_bits</code>を渡すことでフェッチした命令をデコードします。</p><p>デバッグ用のalways_ffブロックに、 デコードした結果をデバッグ表示するコードを記述します(リスト34)。</p><p><span class="caption">▼リスト3.34: デコード結果のデバッグ表示 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> if_fifo_rvalid {
        $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, inst_pc, inst_bits);
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  itype   : %b&quot;</span>, inst_ctrl.itype);</span>
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  imm     : %h&quot;</span>, inst_imm);</span>
    }
}
</code></pre></div><p><code>src/sample.hex</code>をメモリの初期値として使い、 デコード結果を確認します(リスト35)。</p><p><span class="caption">▼リスト3.35: デコーダをテストする</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample.hex 7</span>
00000000 : 01234567
  itype   : 000010
  imm     : 00000012
00000004 : 89abcdef
  itype   : 100000
  imm     : fffbc09a
00000008 : deadbeef
  itype   : 100000
  imm     : fffdb5ea
0000000c : cafebebe
  itype   : 000000
  imm     : 00000000
</code></pre></div><p>例えば<code>32&#39;h01234567</code>は、<code>jalr x10, 18(x6)</code>という命令のビット列になります。 命令の種類はJALRで、命令形式はI形式、即値は10進数で18です。 デコード結果を確認すると、 <code>itype</code>が<code>32&#39;h0000010</code>、 <code>imm</code>が<code>32&#39;h00000012</code>になっており、 正しくデコードできていることを確認できます。</p><h2 id="レジスタの定義と読み込み" tabindex="-1">レジスタの定義と読み込み <a class="header-anchor" href="#レジスタの定義と読み込み" aria-label="Permalink to “レジスタの定義と読み込み”">​</a></h2><p>RV32Iには、32ビット幅のレジスタが32個用意されています。 ただし、0番目のレジスタの値は常に<code>0</code>です。</p><h3 id="レジスタファイルを定義する" tabindex="-1">レジスタファイルを定義する <a class="header-anchor" href="#レジスタファイルを定義する" aria-label="Permalink to “レジスタファイルを定義する”">​</a></h3><p>coreモジュールにレジスタを定義します。 レジスタの幅はXLEN(=32)ビットであるため、 <code>UIntX</code>型のレジスタの配列を定義します(リスト36)。</p><p><span class="caption">▼リスト3.36: レジスタの定義 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// レジスタ</span>
<span class="hljs-keyword">var</span> regfile: UIntX&lt;<span class="hljs-number">32</span>&gt;;
</code></pre></div><p>レジスタをまとめたもののことを<strong>レジスタファイル</strong>(register file)と呼ぶため、 <code>regfile</code>という名前をつけています。</p><h3 id="レジスタの値を読み込む" tabindex="-1">レジスタの値を読み込む <a class="header-anchor" href="#レジスタの値を読み込む" aria-label="Permalink to “レジスタの値を読み込む”">​</a></h3><p>レジスタを定義したので、命令が使用するレジスタの値を取得します。</p><p>図3を見るとわかるように、 RISC-Vの命令は形式によってソースレジスタの数が異なります。 例えば、R形式はソースレジスタが2つで、2つのレジスタの値を使って実行されます。 それに対して、I形式のソースレジスタは1つです。 I形式の命令の実行にはソースレジスタの値と即値を利用します。</p><p>命令のビット列の中のソースレジスタの番号の場所は、 命令形式が違っても共通の場所にあります。 コードを簡単にするために、 命令がレジスタの値を利用するかどうかに関係なく、 常にレジスタの値を読み込むことにします(リスト37)。</p><p><span class="caption">▼リスト3.37: 命令が使うレジスタの値を取得する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// レジスタ番号</span>
<span class="hljs-keyword">let</span> rs1_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst_bits[<span class="hljs-number">19</span>:<span class="hljs-number">15</span>];
<span class="hljs-keyword">let</span> rs2_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst_bits[<span class="hljs-number">24</span>:<span class="hljs-number">20</span>];

<span class="hljs-comment">// ソースレジスタのデータ</span>
<span class="hljs-keyword">let</span> rs1_data: UIntX = <span class="hljs-keyword">if</span> rs1_addr == <span class="hljs-number">0</span> ? <span class="hljs-number">0</span> : regfile[rs1_addr];
<span class="hljs-keyword">let</span> rs2_data: UIntX = <span class="hljs-keyword">if</span> rs2_addr == <span class="hljs-number">0</span> ? <span class="hljs-number">0</span> : regfile[rs2_addr];
</code></pre></div><p>ifを使うことで、 0番目のレジスタが指定されたときは、 値が常に<code>0</code>になるようにします。</p><p>レジスタの値を読み込めていることを確認するために、 デバッグ表示にソースレジスタの値を追加します(リスト38)。 <code>$display</code>システムタスクで、 命令のレジスタ番号と値をデバッグ表示します。</p><p><span class="caption">▼リスト3.38: レジスタの値をデバッグ表示する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> if_fifo_rvalid {
        $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, inst_pc, inst_bits);
        $display(<span class="hljs-string">&quot;  itype   : %b&quot;</span>, inst_ctrl.itype);
        $display(<span class="hljs-string">&quot;  imm     : %h&quot;</span>, inst_imm);
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  rs1[%d] : %h&quot;</span>, rs1_addr, rs1_data);</span>
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  rs2[%d] : %h&quot;</span>, rs2_addr, rs2_data);</span>
    }
}
</code></pre></div><p>早速動作のテストをしたいところですが、 今のままだとレジスタの値が初期化されておらず、 0番目のレジスタの値以外は不定値<sup class="footnote-ref"><a href="#fn5" id="fnref5">[5]</a></sup>になってしまいます。</p><p>これではテストする意味がないため、 レジスタの値を適当な値に初期化します。 always_ffブロックのif_resetで、 <code>i</code>番目(0 &lt; <code>i</code> &lt; 32)のレジスタの値を<code>i</code>で初期化します(リスト39)。</p><p><span class="caption">▼リスト3.39: レジスタを適当な値で初期化する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// レジスタの初期化</span>
<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        <span class="hljs-keyword">for</span> i: <span class="hljs-keyword">i32</span> <span class="hljs-keyword">in</span> <span class="hljs-number">0</span>..<span class="hljs-number">32</span> {
            regfile[i] = i;
        }
    }
}
</code></pre></div><p>レジスタの値を読み込めていることを確認します(リスト40)。</p><p><span class="caption">▼リスト3.40: レジスタ読み込みのデバッグ</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim sample.hex 7</span>
00000000 : 01234567
  itype   : 000010
  imm     : 00000012
  rs1[ 6] : 00000006
  rs2[18] : 00000012
00000004 : 89abcdef
  itype   : 100000
  imm     : fffbc09a
  rs1[23] : 00000017
  rs2[26] : 0000001a
00000008 : deadbeef
  itype   : 100000
  imm     : fffdb5ea
  rs1[27] : 0000001b
  rs2[10] : 0000000a
0000000c : cafebebe
  itype   : 000000
  imm     : 00000000
  rs1[29] : 0000001d
  rs2[15] : 0000000f
</code></pre></div><p><code>32&#39;h01234567</code>は<code>jalr x10, 18(x6)</code>です。 JALR命令は、ソースレジスタ<code>x6</code>を使用します。 <code>x6</code>は6番目のレジスタです。</p><p>シミュレーションと結果が一致していることを確認してください。</p><h2 id="aluによる計算の実装" tabindex="-1">ALUによる計算の実装 <a class="header-anchor" href="#aluによる計算の実装" aria-label="Permalink to “ALUによる計算の実装”">​</a></h2><p>レジスタと即値が揃い、命令で使用するデータが手に入るようになりました。 基本整数命令セットの命令では、 足し算や引き算、ビット演算などの簡単な整数演算を行います。 それでは、CPUの計算を行う部品である<strong>ALU</strong>(Arithmetic Logic Unit)を作成します。</p><h3 id="aluモジュールを作成する" tabindex="-1">ALUモジュールを作成する <a class="header-anchor" href="#aluモジュールを作成する" aria-label="Permalink to “ALUモジュールを作成する”">​</a></h3><p>レジスタと即値の幅はXLENです。 計算には符号付き整数と符号なし整数向けの計算があります。 符号付き整数を利用するために、 eeiモジュールにXLENビットの符号付き整数型を定義します(リスト41)。</p><p><span class="caption">▼リスト3.41: XLENビットの符号付き整数型を定義する (eei.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">type</span> SIntX  = <span class="hljs-keyword">signed</span> <span class="hljs-keyword">logic</span>&lt;XLEN&gt;;
<span class="hljs-keyword">type</span> SInt32 = <span class="hljs-keyword">signed</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">32</span>&gt;  ;
<span class="hljs-keyword">type</span> SInt64 = <span class="hljs-keyword">signed</span> <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">64</span>&gt;  ;
</code></pre></div><p>次に、<code>src/alu.veryl</code>を作成し、次のように記述します(リスト42)。</p><p><span class="caption">▼リスト3.42: alu.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> corectrl::*;

<span class="hljs-keyword">module</span> alu (
    ctrl  : <span class="hljs-keyword">input</span>  InstCtrl,
    op1   : <span class="hljs-keyword">input</span>  UIntX   ,
    op2   : <span class="hljs-keyword">input</span>  UIntX   ,
    result: <span class="hljs-keyword">output</span> UIntX   ,
) {
    <span class="hljs-keyword">let</span> add: UIntX = op1 + op2;
    <span class="hljs-keyword">let</span> sub: UIntX = op1 - op2;

    <span class="hljs-keyword">let</span> sll: UIntX = op1 &lt;&lt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];
    <span class="hljs-keyword">let</span> srl: UIntX = op1 &gt;&gt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];
    <span class="hljs-keyword">let</span> sra: SIntX = $<span class="hljs-keyword">signed</span>(op1) &gt;&gt;&gt; op2[<span class="hljs-number">4</span>:<span class="hljs-number">0</span>];

    <span class="hljs-keyword">let</span> slt : UIntX = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">1</span>, $<span class="hljs-keyword">signed</span>(op1) &lt;: $<span class="hljs-keyword">signed</span>(op2)};
    <span class="hljs-keyword">let</span> sltu: UIntX = {<span class="hljs-number">1&#39;b0</span> <span class="hljs-keyword">repeat</span> XLEN - <span class="hljs-number">1</span>, op1 &lt;: op2};

    <span class="hljs-keyword">always_comb</span> {
        <span class="hljs-keyword">if</span> ctrl.is_aluop {
            <span class="hljs-keyword">case</span> ctrl.funct3 {
                <span class="hljs-number">3&#39;b000</span> : result = <span class="hljs-keyword">if</span> ctrl.itype == InstType::I | ctrl.funct7 == <span class="hljs-number">0</span> ? add : sub;
                <span class="hljs-number">3&#39;b001</span> : result = sll;
                <span class="hljs-number">3&#39;b010</span> : result = slt;
                <span class="hljs-number">3&#39;b011</span> : result = sltu;
                <span class="hljs-number">3&#39;b100</span> : result = op1 ^ op2;
                <span class="hljs-number">3&#39;b101</span> : result = <span class="hljs-keyword">if</span> ctrl.funct7[<span class="hljs-number">5</span>] == <span class="hljs-number">0</span> ? srl : sra;
                <span class="hljs-number">3&#39;b110</span> : result = op1 | op2;
                <span class="hljs-number">3&#39;b111</span> : result = op1 &amp; op2;
                <span class="hljs-keyword">default</span>: result = &#39;x;
            }
        } <span class="hljs-keyword">else</span> {
            result = add;
        }
    }
}
</code></pre></div><p>aluモジュールには、次のポートを定義します (表3)。</p><div id="alu.veryl.port" class="table"><p class="caption">表3.3: aluモジュールのポート定義</p><table><tr class="hline"><th>ポート名</th><th>方向</th><th>型</th><th>用途</th></tr><tr class="hline"><td>ctrl</td><td>input</td><td>InstCtrl</td><td>制御用信号</td></tr><tr class="hline"><td>op1</td><td>input</td><td>UIntX</td><td>1つ目のデータ</td></tr><tr class="hline"><td>op2 </td><td>input</td><td>UIntX</td><td>2つ目のデータ</td></tr><tr class="hline"><td>result</td><td>output</td><td>UIntX</td><td>結果</td></tr></table></div> 仕様書で整数演算命令として定義されている命令は、funct3とfunct7フィールドによって計算の種類を特定できます(表4)。 <div id="alu_funct3" class="table"><p class="caption">表3.4: ALUの演算の種類</p><table><tr class="hline"><th>funct3</th><th>演算</th></tr><tr class="hline"><td>3&#39;b000</td><td>加算、または減算</td></tr><tr class="hline"><td>3&#39;b001</td><td>左シフト</td></tr><tr class="hline"><td>3&#39;b010</td><td>符号付き &lt;=</td></tr><tr class="hline"><td>3&#39;b011</td><td>符号なし &lt;=</td></tr><tr class="hline"><td>3&#39;b100</td><td>ビット単位XOR</td></tr><tr class="hline"><td>3&#39;b101</td><td>右論理、右算術シフト</td></tr><tr class="hline"><td>3&#39;b110</td><td>ビット単位OR</td></tr><tr class="hline"><td>3&#39;b111</td><td>ビット単位AND</td></tr></table></div> それ以外の命令は、足し算しか行いません。 そのため、デコード時に整数演算命令とそれ以外の命令を\`InstCtrl.is_aluop\`で区別し、 整数演算命令以外は常に足し算を行うようにしています。 具体的には、 opcodeがOPかOP-IMMの命令の\`InstCtrl.is_aluop\`を\`1\`にしています(リスト32)。 <p>always_combブロックでは、 funct3のcase文によって計算を選択します。 funct3だけでは選択できないとき、funct7を使用します。</p><h3 id="aluモジュールをインスタンス化する" tabindex="-1">ALUモジュールをインスタンス化する <a class="header-anchor" href="#aluモジュールをインスタンス化する" aria-label="Permalink to “ALUモジュールをインスタンス化する”">​</a></h3><p>次に、ALUに渡すデータを用意します。 <code>UIntX</code>型の変数<code>op1</code>、 <code>op2</code>、 <code>alu_result</code>を定義し、 always_combブロックで値を割り当てます (リスト43)。</p><p><span class="caption">▼リスト3.43: ALUに渡すデータの用意 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// ALU</span>
<span class="hljs-keyword">var</span> op1       : UIntX;
<span class="hljs-keyword">var</span> op2       : UIntX;
<span class="hljs-keyword">var</span> alu_result: UIntX;

<span class="hljs-keyword">always_comb</span> {
    <span class="hljs-keyword">case</span> inst_ctrl.itype {
        InstType::R, InstType::B: {
            op1 = rs1_data;
            op2 = rs2_data;
        }
        InstType::I, InstType::S: {
            op1 = rs1_data;
            op2 = inst_imm;
        }
        InstType::U, InstType::J: {
            op1 = inst_pc;
            op2 = inst_imm;
        }
        <span class="hljs-keyword">default</span>: {
            op1 = &#39;x;
            op2 = &#39;x;
        }
    }
}
</code></pre></div><p>割り当てるデータは、命令形式によって次のように異なります。</p><dl><dt>R形式、B形式</dt><dd> R形式とB形式は、レジスタの値とレジスタの値の演算を行います。 \`op1\`と\`op2\`は、レジスタの値\`rs1_data\`と\`rs2_data\`になります。 </dd><dt>I形式、S形式</dt><dd> I形式とS形式は、レジスタの値と即値の演算を行います。 \`op1\`と\`op2\`は、それぞれレジスタの値\`rs1_data\`と即値\`inst_imm\`になります。 S形式はメモリの書き込み命令に利用されており、 レジスタの値と即値を足し合わせた値がアクセスするアドレスになります。 </dd><dt>U形式、J形式</dt><dd> U形式とJ形式は、即値とPCを足した値、または即値を使う命令に使われています。 \`op1\`と\`op2\`は、それぞれPC\`inst_pc\`と即値\`inst_imm\`になります。 J形式はJAL命令に利用されており、PCに即値を足した値がジャンプ先になります。 U形式はAUIPC命令とLUI命令に利用されています。 AUIPC命令は、PCに即値を足した値をデスティネーションレジスタに格納します。 LUI命令は、即値をそのままデスティネーションレジスタに格納します。 </dd></dl><p>ALUに渡すデータを用意したので、aluモジュールをインスタンス化します(リスト44)。 結果を受け取る用の変数として、<code>alu_result</code>を指定します。</p><p><span class="caption">▼リスト3.44: ALUのインスタンス化 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> alum: alu (
    ctrl  : inst_ctrl ,
    op1               ,
    op2               ,
    result: alu_result,
);
</code></pre></div><h3 id="aluモジュールをテストする" tabindex="-1">ALUモジュールをテストする <a class="header-anchor" href="#aluモジュールをテストする" aria-label="Permalink to “ALUモジュールをテストする”">​</a></h3><p>最後にALUが正しく動くことを確認します。</p><p>always_ffブロックで、 <code>op1</code>と<code>op2</code>、<code>alu_result</code>をデバッグ表示します(リスト45)。</p><p><span class="caption">▼リスト3.45: ALUの結果をデバッグ表示する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> if_fifo_rvalid {
        $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, inst_pc, inst_bits);
        $display(<span class="hljs-string">&quot;  itype   : %b&quot;</span>, inst_ctrl.itype);
        $display(<span class="hljs-string">&quot;  imm     : %h&quot;</span>, inst_imm);
        $display(<span class="hljs-string">&quot;  rs1[%d] : %h&quot;</span>, rs1_addr, rs1_data);
        $display(<span class="hljs-string">&quot;  rs2[%d] : %h&quot;</span>, rs2_addr, rs2_data);
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  op1     : %h&quot;</span>, op1);</span>
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  op2     : %h&quot;</span>, op2);</span>
        <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;  alu res : %h&quot;</span>, alu_result);</span>
    }
}
</code></pre></div><p><code>src/sample.hex</code>を、次のように書き換えます(リスト46)。</p><p><span class="caption">▼リスト3.46: sample.hexを書き換える</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>02000093 // addi x1, x0, 32
00100117 // auipc x2, 256
002081b3 // add x3, x1, x2
</code></pre></div><p>それぞれの命令の意味は次のとおりです(表5)。</p><div id="sample.hex.alu.semantics" class="table"><p class="caption">表3.5: 命令の意味</p><table><tr class="hline"><th>アドレス</th><th>命令</th><th>命令形式</th><th>意味</th></tr><tr class="hline"><td>0x00000000</td><td>addi x1, x0, 32</td><td>I形式</td><td>x1 = x0 + 32</td></tr><tr class="hline"><td>0x00000004</td><td>auipc x2, 256</td><td>U形式</td><td>x2 = pc + 256</td></tr><tr class="hline"><td>0x00000008</td><td>add x3, x1, x2</td><td>R形式</td><td>x3 = x1 + x2</td></tr></table></div> シミュレータを実行し、結果を確かめます(リスト47)。 <p><span class="caption">▼リスト3.47: ALUのデバッグ</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample.hex 6</span>
00000000 : 02000093
  itype   : 000010
  imm     : 00000020
  rs1[ 0] : 00000000
  rs2[ 0] : 00000000
  op1     : 00000000
  op2     : 00000020
  alu res : 00000020
00000004 : 00100117
  itype   : 010000
  imm     : 00100000
  rs1[ 0] : 00000000
  rs2[ 1] : 00000065
  op1     : 00000004
  op2     : 00100000
  alu res : 00100004
00000008 : 002081b3
  itype   : 000001
  imm     : 00000000
  rs1[ 1] : 00000065
  rs2[ 2] : 00000066
  op1     : 00000001
  op2     : 00000002
  alu res : 00000003
</code></pre></div><p>まだ、結果をディスティネーションレジスタに格納する処理を作成していません。 そのため、命令を実行してもレジスタの値は変わらないことに注意してください</p><dl><dt>addi x1, x0, 32</dt><dd> \`op1\`は0番目のレジスタの値です。 0番目のレジスタの値は常に\`0\`であるため、\`32&#39;h00000000\`と表示されています。 \`op2\`は即値です。 即値は32であるため、\`32&#39;h00000020\`と表示されています。 ALUの計算結果として、0と32を足した結果\`32&#39;h00000020\`が表示されています。 </dd><dt>auipc x2, 256</dt><dd> \`op1\`はPCです。 \`op1\`には、命令のアドレス\`0x00000004\`が表示されています。 \`op2\`は即値です。 256を12bit左にシフトした値\`32&#39;h00100000\`が表示されています。 ALUの計算結果として、これを足した結果\`32&#39;h00100004\`が表示されています。 </dd><dt>add x3, x1, x2</dt><dd> \`op1\`、\`op2\`は1、2番目のレジスタの値です。 ALUの計算結果として、それぞれの初期値\`1\`と\`2\`を足した結果\`32&#39;h00000003\`が表示されています。 </dd></dl><h2 id="レジスタに結果を書き込む" tabindex="-1">レジスタに結果を書き込む <a class="header-anchor" href="#レジスタに結果を書き込む" aria-label="Permalink to “レジスタに結果を書き込む”">​</a></h2><p>CPUはレジスタから値を読み込み、計算して、 レジスタに結果の値を書き戻します。 レジスタに値を書き戻すことを、 値を<strong>ライトバック</strong>(write-back)すると呼びます。</p><p>ライトバックする値は、計算やメモリアクセスの結果です。 まだメモリにアクセスする処理を実装していませんが、 先にライトバック処理を実装します。</p><h3 id="ライトバック処理を実装する" tabindex="-1">ライトバック処理を実装する <a class="header-anchor" href="#ライトバック処理を実装する" aria-label="Permalink to “ライトバック処理を実装する”">​</a></h3><p>書き込む対象のレジスタ(デスティネーションレジスタ)は、 命令のrdフィールドによって番号で指定されます。 デコード時に、 レジスタに結果を書き込む命令かどうかを<code>InstCtrl.rwb_en</code>に格納しています(リスト32)。</p><p>LUI命令のときは即値をそのまま、 それ以外の命令のときはALUの結果をライトバックします(リスト48)。</p><p><span class="caption">▼リスト3.48: ライトバック処理の実装 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">let</span> rd_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];</span>
<span class="custom-hl-bold"><span class="hljs-keyword">let</span> wb_data: UIntX    = <span class="hljs-keyword">if</span> inst_ctrl.is_lui ? inst_imm : alu_result;</span>

<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        <span class="hljs-keyword">for</span> i: <span class="hljs-keyword">i32</span> <span class="hljs-keyword">in</span> <span class="hljs-number">0</span>..<span class="hljs-number">32</span> {
            regfile[i] = i;
        }
    } <span class="custom-hl-bold"><span class="hljs-keyword">else</span> {</span>
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> if_fifo_rvalid &amp;&amp; inst_ctrl.rwb_en {</span>
        <span class="custom-hl-bold">    regfile[rd_addr] = wb_data;</span>
        <span class="custom-hl-bold">}</span>
    <span class="custom-hl-bold">}</span>
}
</code></pre></div><h3 id="ライトバック処理をテストする" tabindex="-1">ライトバック処理をテストする <a class="header-anchor" href="#ライトバック処理をテストする" aria-label="Permalink to “ライトバック処理をテストする”">​</a></h3><p>デバッグ表示用のalways_ffブロックで、 ライトバック処理の概要をデバッグ表示します(リスト49)。 処理している命令がライトバックする命令のときにのみ、 <code>$display</code>システムタスクを呼び出します。</p><p><span class="caption">▼リスト3.49: ライトバックのデバッグ表示 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> inst_ctrl.rwb_en {
    $display(<span class="hljs-string">&quot;  reg[%d] &lt;= %h&quot;</span>, rd_addr, wb_data);
}
</code></pre></div><p>シミュレータを実行し、結果を確かめます(リスト50)。</p><p><span class="caption">▼リスト3.50: ライトバックのデバッグ</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim sample.hex 6</span>
00000000 : 02000093
  itype   : 000010
  imm     : 00000020
  rs1[ 0] : 00000000
  rs2[ 0] : 00000000
  op1     : 00000000
  op2     : 00000020
  alu res : 00000020
  reg[ 1] &lt;= 00000020
00000004 : 00100117
  itype   : 010000
  imm     : 00100000
  rs1[ 0] : 00000000
  rs2[ 1] : 00000020
  op1     : 00000004
  op2     : 00100000
  alu res : 00100004
  reg[ 2] &lt;= 00100004
00000008 : 002081b3
  itype   : 000001
  imm     : 00000000
  rs1[ 1] : 00000020
  rs2[ 2] : 00100004
  op1     : 00000020
  op2     : 00100004
  alu res : 00100024
  reg[ 3] &lt;= 00100024
</code></pre></div><dl><dt>addi x1, x0, 32</dt><dd> x1に、0と32を足した値(\`32&#39;h00000020\`)を格納しています。 </dd><dt>auipc x2, 256</dt><dd> x2に、256を12ビット左にシフトした値(\`32&#39;h00100000\`)とPC(\`32&#39;h00000004\`)を足した値(\`32&#39;h00100004\`)を格納しています。 </dd><dt>add x3, x1, x2</dt><dd> x1は1つ目の命令で\`32&#39;h00000020\`に、 x2は2つ目の命令で\`32&#39;h00100004\`にされています。 x3に、x1とx2を足した結果\`32&#39;h00100024\`を格納しています。 </dd></dl><p>おめでとうございます！ このCPUは整数演算命令の実行ができるようになりました！</p><p>最後に、テストのためにレジスタの値を初期化していたコードを削除します(リスト51)。</p><p><span class="caption">▼リスト3.51: レジスタの初期化をやめる (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> if_fifo_rvalid &amp;&amp; inst_ctrl.rwb_en {
        regfile[rd_addr] = wb_data;
    }
}
</code></pre></div><h2 id="ロード命令とストア命令の実装" tabindex="-1">ロード命令とストア命令の実装 <a class="header-anchor" href="#ロード命令とストア命令の実装" aria-label="Permalink to “ロード命令とストア命令の実装”">​</a></h2><p>RV32Iには、 メモリのデータを読み込む、 書き込む命令として次の命令があります(表6)。 データを読み込む命令のことを<strong>ロード命令</strong>、 データを書き込む命令のことを<strong>ストア命令</strong>と呼びます。 2つを合わせて<strong>ロードストア命令</strong>と呼びます。</p><div id="ls.insts" class="table"><p class="caption">表3.6: RV32Iのロード命令、ストア命令</p><table><tr class="hline"><th>命令</th><th>作用</th></tr><tr class="hline"><td>LB</td><td>8ビットのデータを読み込む。上位24ビットは符号拡張する</td></tr><tr class="hline"><td>LBU</td><td>8ビットのデータを読み込む。上位24ビットは0で拡張する</td></tr><tr class="hline"><td>LH</td><td>16ビットのデータを読み込む。上位16ビットは符号拡張する</td></tr><tr class="hline"><td>LHU</td><td>16ビットのデータを読み込む。上位16ビットは0で拡張する</td></tr><tr class="hline"><td>LW</td><td>32ビットのデータを読み込む</td></tr><tr class="hline"><td>SB</td><td>8ビットのデータを書き込む</td></tr><tr class="hline"><td>SH</td><td>16ビットのデータを書き込む</td></tr><tr class="hline"><td>SW</td><td>32ビットのデータを書き込む</td></tr></table></div> ロード命令はI形式、ストア命令はS形式です。 これらの命令で指定するメモリのアドレスは、rs1と即値の足し算です。 ALUに渡すデータがrs1と即値になっていることを確認してください(リスト43)。 ストア命令は、rs2の値をメモリに格納します。 <h3 id="lw、sw命令を実装する" tabindex="-1">LW、SW命令を実装する <a class="header-anchor" href="#lw、sw命令を実装する" aria-label="Permalink to “LW、SW命令を実装する”">​</a></h3><p>8ビット、16ビット単位で読み書きを行う命令の実装は少し大変です。 まず、32ビット単位で読み書きを行うLW命令とSW命令を実装します。</p><h4 id="memunitモジュールの作成" tabindex="-1">memunitモジュールの作成 <a class="header-anchor" href="#memunitモジュールの作成" aria-label="Permalink to “memunitモジュールの作成”">​</a></h4><p>メモリ操作を行うモジュールを、 <code>src/memunit.veryl</code>に記述します(リスト52)。</p><p><span class="caption">▼リスト3.52: memunit.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> corectrl::*;

<span class="hljs-keyword">module</span> memunit (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                                    ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                                    ,
    valid : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>                                    ,
    is_new: <span class="hljs-keyword">input</span>   <span class="hljs-keyword">logic</span>                                    , <span class="hljs-comment">// 命令が新しく供給されたかどうか</span>
    ctrl  : <span class="hljs-keyword">input</span>   InstCtrl                                 , <span class="hljs-comment">// 命令のInstCtrl</span>
    addr  : <span class="hljs-keyword">input</span>   Addr                                     , <span class="hljs-comment">// アクセスするアドレス</span>
    rs2   : <span class="hljs-keyword">input</span>   UIntX                                    , <span class="hljs-comment">// ストア命令で書き込むデータ</span>
    rdata : <span class="hljs-keyword">output</span>  UIntX                                    , <span class="hljs-comment">// ロード命令の結果 (stall = 0のときに有効)</span>
    stall : <span class="hljs-keyword">output</span>  <span class="hljs-keyword">logic</span>                                    , <span class="hljs-comment">// メモリアクセス命令が完了していない</span>
    membus: <span class="hljs-keyword">modport</span> membus_if::&lt;MEM_DATA_WIDTH, XLEN&gt;::master, <span class="hljs-comment">// メモリとのinterface</span>
) {

    <span class="hljs-comment">// memunitの状態を表す列挙型</span>
    <span class="hljs-keyword">enum</span> State: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">2</span>&gt; {
        Init, <span class="hljs-comment">// 命令を受け付ける状態</span>
        WaitReady, <span class="hljs-comment">// メモリが操作可能になるのを待つ状態</span>
        WaitValid, <span class="hljs-comment">// メモリ操作が終了するのを待つ状態</span>
    }

    <span class="hljs-keyword">var</span> state: State;

    <span class="hljs-keyword">var</span> req_wen  : <span class="hljs-keyword">logic</span>                ;
    <span class="hljs-keyword">var</span> req_addr : Addr                 ;
    <span class="hljs-keyword">var</span> req_wdata: <span class="hljs-keyword">logic</span>&lt;MEM_DATA_WIDTH&gt;;

    <span class="hljs-keyword">always_comb</span> {
        <span class="hljs-comment">// メモリアクセス</span>
        membus.valid = state == State::WaitReady;
        membus.addr  = req_addr;
        membus.wen   = req_wen;
        membus.wdata = req_wdata;
        <span class="hljs-comment">// loadの結果</span>
        rdata = membus.rdata;
        <span class="hljs-comment">// stall判定</span>
        stall = valid &amp; <span class="hljs-keyword">case</span> state {
            State::Init     : is_new &amp;&amp; inst_is_memop(ctrl),
            State::WaitReady: <span class="hljs-number">1</span>,
            State::WaitValid: !membus.rvalid,
            <span class="hljs-keyword">default</span>         : <span class="hljs-number">0</span>,
        };
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            state     = State::Init;
            req_wen   = <span class="hljs-number">0</span>;
            req_addr  = <span class="hljs-number">0</span>;
            req_wdata = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">if</span> valid {
                <span class="hljs-keyword">case</span> state {
                    State::Init: <span class="hljs-keyword">if</span> is_new &amp; inst_is_memop(ctrl) {
                        state     = State::WaitReady;
                        req_wen   = inst_is_store(ctrl);
                        req_addr  = addr;
                        req_wdata = rs2;
                    }
                    State::WaitReady: <span class="hljs-keyword">if</span> membus.ready {
                        state = State::WaitValid;
                    }
                    State::WaitValid: <span class="hljs-keyword">if</span> membus.rvalid {
                        state = State::Init;
                    }
                    <span class="hljs-keyword">default</span>: {}
                }
            }
        }
    }
}
</code></pre></div><p>memunitモジュールでは、 命令がメモリにアクセスする命令のとき、 ALUから受け取ったアドレスをメモリに渡して操作を実行します。</p><p>命令がメモリにアクセスする命令かどうかはinst_is_memop関数で判定します。 ストア命令のとき、命令の形式はS形式です。 ロード命令のとき、デコーダは<code>InstCtrl.is_load</code>を<code>1</code>にしています(リスト32)。</p><p>memunitモジュールには次の状態が定義されています。 初期状態は<code>State::Init</code>です。</p><dl><dt>State::Init</dt><dd> memunitモジュールに新しく命令が供給されたとき、 \`valid\`と\`is_new\`は\`1\`になっています。 新しく命令が供給されて、それがメモリにアクセスする命令のとき、 状態を\`State::WaitReady\`に移動します。 その際、\`req_wen\`にストア命令かどうか、 \`req_addr\`にアクセスするアドレス、 \`req_wdata\`に\`rs2\`を格納します。 </dd><dt>State::WaitReady</dt><dd> 命令に応じた要求をメモリに送り続けます。 メモリが要求を受け付ける(\`ready\`)とき、 状態を\`State::WaitValid\`に移動します。 </dd><dt>State::WaitValid</dt><dd> メモリの処理が終了した(\`rvalid\`)とき、 状態を\`State::Init\`に移動します。 </dd></dl><p>メモリにアクセスする命令のとき、 memunitモジュールは<code>Init</code>→<code>WaitReady</code>→<code>WaitValid</code>の順で状態を移動するため、 実行には少なくとも3クロックが必要です。 その間、CPUはレジスタのライトバック処理やFIFOからの命令の取り出しを止める必要があります。</p><p>CPUの実行が止まることを、CPUが<strong>ストール</strong>(Stall)すると呼びます。 メモリアクセス中のストールを実現するために、 memunitモジュールには処理中かどうかを表す<code>stall</code>フラグを実装しています。 有効な命令が供給されているとき、<code>state</code>やメモリの状態に応じて、 次のように<code>stall</code>の値を決定します(表7)。</p><div id="stall.cond" class="table"><p class="caption">表3.7: stallの値の決定方法</p><table><tr class="hline"><th>状態</th><th>stallが1になる条件</th></tr><tr class="hline"><td>Init</td><td>新しく命令が供給されて、それがメモリにアクセスする命令のとき</td></tr><tr class="hline"><td>WaitReady</td><td>常に1</td></tr><tr class="hline"><td>WaitValid</td><td>処理が終了していない(\`!membus.rvalid\`)とき</td></tr></table></div><div class="warning custom-block"><p class="custom-block-title"><b>アドレスが4バイトに整列されていない場合の動作</b></p><p>memoryモジュールはアドレスの下位2ビットを無視するため、 <code>addr</code>の下位2ビットが<code>00</code>ではない、 つまり、4で割り切れないアドレスに対してLW命令かSW命令を実行する場合、 memunitモジュールは正しい動作をしません。 この問題は後の章で対応するため、 全てのロードストア命令は、 アクセスするビット幅で割り切れるアドレスにしかアクセスしないということにしておきます。</p></div><h4 id="memunitモジュールのインスタンス化" tabindex="-1">memunitモジュールのインスタンス化 <a class="header-anchor" href="#memunitモジュールのインスタンス化" aria-label="Permalink to “memunitモジュールのインスタンス化”">​</a></h4><p>coreモジュール内にmemunitモジュールをインスタンス化します。</p><p>まず、命令が供給されていることを示す信号<code>inst_valid</code>と、 命令が現在のクロックで供給されたことを示す信号<code>inst_is_new</code>を作成します(リスト53)。 命令が供給されているかどうかは<code>if_fifo_rvalid</code>と同値です。 これを機に、<code>if_fifo_rvalid</code>を使用しているところを<code>inst_valid</code>に置き換えましょう。</p><p><span class="caption">▼リスト3.53: inst_validとinst_is_newの定義 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> inst_valid : <span class="hljs-keyword">logic</span>    = if_fifo_rvalid;
<span class="hljs-keyword">var</span> inst_is_new: <span class="hljs-keyword">logic</span>   ; <span class="hljs-comment">// 命令が現在のクロックで供給されたかどうか</span>
</code></pre></div><p>次に、<code>inst_is_new</code>の値を更新します(リスト54)。 命令が現在のクロックで供給されたかどうかは、 FIFOの<code>rvalid</code>と<code>rready</code>を観測することでわかります。 <code>rvalid</code>が<code>1</code>のとき、 <code>rready</code>が<code>1</code>なら、 次のクロックで供給される命令は新しく供給される命令です。 <code>rready</code>が<code>0</code>なら、 次のクロックで供給されている命令は現在のクロックと同じ命令になります。 <code>rvalid</code>が<code>0</code>のとき、 次のクロックで供給される命令は常に新しく供給される命令になります (次のクロックで<code>rvalid</code>が<code>1</code>かどうかは考えません)。</p><p><span class="caption">▼リスト3.54: inst_is_newの実装 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        inst_is_new = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> if_fifo_rvalid {
            inst_is_new = if_fifo_rready;
        } <span class="hljs-keyword">else</span> {
            inst_is_new = <span class="hljs-number">1</span>;
        }
    }
}
</code></pre></div><p>memunitモジュールをインスタンス化する前に、 メモリとの接続方法を考える必要があります。</p><p>coreモジュールには、メモリとの接続点としてmembusポートが存在します。 しかし、これは命令フェッチに使用されているため、 memunitモジュールのために使用できません。 また、memoryモジュールは同時に2つの操作を受け付けられません。</p><p>この問題を、 coreモジュールにメモリとのインターフェースを2つ用意してtopモジュールで調停することにより回避します。</p><p>まず、coreモジュールに命令フェッチ用のポート<code>i_membus</code>と、 ロードストア命令用のポート<code>d_membus</code>の2つのポートを用意します(リスト55)。</p><p><span class="caption">▼リスト3.55: coreモジュールのポート定義 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> core (
    clk     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                                    ,
    rst     : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                                    ,
    <span class="custom-hl-bold">i_</span>membus: <span class="hljs-keyword">modport</span> membus_if::&lt;ILEN, XLEN&gt;::master          ,
    <span class="custom-hl-bold">d_membus: <span class="hljs-keyword">modport</span> membus_if::&lt;MEM_DATA_WIDTH, XLEN&gt;::master,</span>
) {
</code></pre></div><p>命令フェッチ用のポートが<code>membus</code>から<code>i_membus</code>に変更されるため、 既存の<code>membus</code>を<code>i_membus</code>に置き換えてください(リスト56)。</p><p><span class="caption">▼リスト3.56: membusをi_membusに置き換える (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// FIFOに2個以上空きがあるとき、命令をフェッチする</span>
<span class="custom-hl-bold">i_</span>membus.valid = if_fifo_wready_two;
<span class="custom-hl-bold">i_</span>membus.addr  = if_pc;
<span class="custom-hl-bold">i_</span>membus.wen   = <span class="hljs-number">0</span>;
<span class="custom-hl-bold">i_</span>membus.wdata = &#39;x; <span class="hljs-comment">// wdataは使用しない</span>
</code></pre></div><p>次に、topモジュールでの調停を実装します(リスト57)。 新しく<code>i_membus</code>と<code>d_membus</code>をインスタンス化し、 それを<code>membus</code>と接続します。</p><p><span class="caption">▼リスト3.57: メモリへのアクセス要求の調停 (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> membus  : membus_if::&lt;MEM_DATA_WIDTH, MEM_ADDR_WIDTH&gt;;
<span class="hljs-keyword">inst</span> i_membus: membus_if::&lt;ILEN, XLEN&gt;; <span class="hljs-comment">// 命令フェッチ用</span>
<span class="hljs-keyword">inst</span> d_membus: membus_if::&lt;MEM_DATA_WIDTH, XLEN&gt;; <span class="hljs-comment">// ロードストア命令用</span>

<span class="hljs-keyword">var</span> memarb_last_i: <span class="hljs-keyword">logic</span>;

<span class="hljs-comment">// メモリアクセスを調停する</span>
<span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        memarb_last_i = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="hljs-keyword">if</span> membus.ready {
            memarb_last_i = !d_membus.valid;
        }
    }
}

<span class="hljs-keyword">always_comb</span> {
    i_membus.ready  = membus.ready &amp;&amp; !d_membus.valid;
    i_membus.rvalid = membus.rvalid &amp;&amp; memarb_last_i;
    i_membus.rdata  = membus.rdata;

    d_membus.ready  = membus.ready;
    d_membus.rvalid = membus.rvalid &amp;&amp; !memarb_last_i;
    d_membus.rdata  = membus.rdata;

    membus.valid = i_membus.valid | d_membus.valid;
    <span class="hljs-keyword">if</span> d_membus.valid {
        membus.addr  = addr_to_memaddr(d_membus.addr);
        membus.wen   = d_membus.wen;
        membus.wdata = d_membus.wdata;
    } <span class="hljs-keyword">else</span> {
        membus.addr  = addr_to_memaddr(i_membus.addr);
        membus.wen   = <span class="hljs-number">0</span>; <span class="hljs-comment">// 命令フェッチは常に読み込み</span>
        membus.wdata = &#39;x;
    }
}
</code></pre></div><p>調停の仕組みは次のとおりです。</p><ul><li><code>i_membus</code>と<code>d_membus</code>の両方の<code>valid</code>が<code>1</code>のとき、<code>d_membus</code>を優先する</li><li><code>memarb_last_i</code>レジスタに、受け入れた要求が<code>i_membus</code>からのものだったかを記録する</li><li>メモリが要求の結果を返すとき、<code>memarb_last_i</code>を見て、<code>i_membus</code>と<code>d_membus</code>のどちらか片方の<code>rvalid</code>を<code>1</code>にする</li></ul><p>命令フェッチを優先しているとロードストア命令の処理が進まないため、 <code>i_membus</code>よりも<code>d_membus</code>を優先します。</p><p>coreモジュールとの接続を次のように変更します(リスト58)。</p><p><span class="caption">▼リスト3.58: membusを2つに分けて接続する (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> c: core (
    clk       ,
    rst       ,
    i_membus  ,
    d_membus  ,
);
</code></pre></div><p>memoryモジュールとmemunitモジュールを接続する準備が整ったので、memunitモジュールをインスタンス化します(リスト59)。</p><p><span class="caption">▼リスト3.59: memunitモジュールのインスタンス化 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> memu_rdata: UIntX;
<span class="hljs-keyword">var</span> memu_stall: <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">inst</span> memu: memunit (
    clk                ,
    rst                ,
    valid : inst_valid ,
    is_new: inst_is_new,
    ctrl  : inst_ctrl  ,
    addr  : alu_result ,
    rs2   : rs2_data   ,
    rdata : memu_rdata ,
    stall : memu_stall ,
    membus: d_membus   ,
);
</code></pre></div><h4 id="memunitモジュールの処理待ちとライトバック" tabindex="-1">memunitモジュールの処理待ちとライトバック <a class="header-anchor" href="#memunitモジュールの処理待ちとライトバック" aria-label="Permalink to “memunitモジュールの処理待ちとライトバック”">​</a></h4><p>memunitモジュールが処理中のときは命令をFIFOから取り出すのを止める処理と、 ロード命令で読み込んだデータをレジスタにライトバックする処理を実装します。</p><p>memunitモジュールが処理中のとき、 FIFOから命令を取り出すのを止めます(リスト60)。</p><p><span class="caption">▼リスト3.60: memunitモジュールの処理が終わるのを待つ (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// memunitが処理中ではないとき、FIFOから命令を取り出していい</span>
if_fifo_rready = <span class="custom-hl-bold">!memu_stall</span>;
</code></pre></div><p>memunitモジュールが処理中のとき、<code>memu_stall</code>が<code>1</code>になっています。 そのため、<code>memu_stall</code>が<code>1</code>のときは<code>if_fifo_rready</code>を<code>0</code>にすることで、 FIFOからの命令の取り出しを停止します。</p><p>次に、ロード命令の結果をレジスタにライトバックします(リスト61)。 ライトバック処理では、命令がロード命令のとき(<code>inst_ctrl.is_load</code>)、 <code>memu_rdata</code>を<code>wb_data</code>に設定します。</p><p><span class="caption">▼リスト3.61: memunitモジュールの結果をライトバックする (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> rd_addr: <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">5</span>&gt; = inst_bits[<span class="hljs-number">11</span>:<span class="hljs-number">7</span>];
<span class="hljs-keyword">let</span> wb_data: UIntX    = <span class="custom-hl-bold"><span class="hljs-keyword">switch</span> {</span>
    inst_ctrl.is_lui <span class="custom-hl-bold">:</span> inst_imm,
    <span class="custom-hl-bold">inst_ctrl.is_load: memu_rdata,</span>
    <span class="custom-hl-bold"><span class="hljs-keyword">default</span>          :</span> alu_result
};
</code></pre></div><p>ところで、現在のコードではmemunitの処理が終了していないときも値をライトバックし続けています。 レジスタへのライトバックは命令の実行が終了したときのみで良いため、 次のようにコードを変更します(リスト62)。</p><p><span class="caption">▼リスト3.62: 命令の実行が終了したときにのみライトバックする (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if</span> inst_valid <span class="custom-hl-bold">&amp;&amp; if_fifo_rready</span> &amp;&amp; inst_ctrl.rwb_en {
        regfile[rd_addr] = wb_data;
    }
}
</code></pre></div><p>デバッグ表示も同様で、 ライトバックするときにのみデバッグ表示します(リスト63)。</p><p><span class="caption">▼リスト3.63: ライトバックするときにのみデバッグ表示する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if</span> <span class="custom-hl-bold">if_fifo_rready &amp;&amp;</span> inst_ctrl.rwb_en {
    $display(<span class="hljs-string">&quot;  reg[%d] &lt;= %h&quot;</span>, rd_addr, wb_data);
}
</code></pre></div><h4 id="lw、sw命令のテスト" tabindex="-1">LW、SW命令のテスト <a class="header-anchor" href="#lw、sw命令のテスト" aria-label="Permalink to “LW、SW命令のテスト”">​</a></h4><p>LW命令とSW命令が正しく動作していることを確認するために、 デバッグ表示に次のコードを追加します(リスト64)。</p><p><span class="caption">▼リスト3.64: メモリモジュールの状態をデバッグ表示する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>$display(<span class="hljs-string">&quot;  mem stall : %b&quot;</span>, memu_stall);
$display(<span class="hljs-string">&quot;  mem rdata : %h&quot;</span>, memu_rdata);
</code></pre></div><p>ここからのテストは実行するクロック数が多くなります。 そこで、ログに何クロック目かを表示することでログを読みやすくします(リスト65)。</p><p><span class="caption">▼リスト3.65: 何クロック目かを出力する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="custom-hl-bold"><span class="hljs-keyword">var</span> clock_count: <span class="hljs-keyword">u64</span>;</span>

<span class="hljs-keyword">always_ff</span> {
    <span class="custom-hl-bold"><span class="hljs-keyword">if_reset</span> {</span>
        <span class="custom-hl-bold">clock_count = <span class="hljs-number">1</span>;</span>
    <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
        <span class="custom-hl-bold">clock_count = clock_count + <span class="hljs-number">1</span>;</span>
        <span class="hljs-keyword">if</span> inst_valid {
            <span class="custom-hl-bold">$display(<span class="hljs-string">&quot;# %d&quot;</span>, clock_count);</span>
            $display(<span class="hljs-string">&quot;%h : %h&quot;</span>, inst_pc, inst_bits);
            $display(<span class="hljs-string">&quot;  itype     : %b&quot;</span>, inst_ctrl.itype);
</code></pre></div><p>LW、SW命令のテストのために、 <code>src/sample.hex</code>を次のように変更します(リスト66)。</p><p><span class="caption">▼リスト3.66: テスト用のプログラムを記述する (sample.hex)</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>02002503 // lw x10, 0x20(x0)
40000593 // addi x11, x0, 0x400
02b02023 // sw x11, 0x20(x0)
02002603 // lw x12, 0x20(x0)
00000000
00000000
00000000
00000000
deadbeef // 0x20
</code></pre></div><p>プログラムは次のようになっています(表8)。</p><div id="sample.hex.table.lwsw-range" class="table"><p class="caption">表3.8: メモリに格納する命令</p><table><tr class="hline"><th>アドレス</th><th>命令</th><th>意味</th></tr><tr class="hline"><td>0x00000000</td><td>lw x10, 0x20(x0)</td><td>x10に、アドレスが0x20のデータを読み込む</td></tr><tr class="hline"><td>0x00000004</td><td>addi x11, x0, 0x400</td><td>x11 = 0x400</td></tr><tr class="hline"><td>0x00000008</td><td>sw x11, 0x20(x0)</td><td>アドレス0x20にx11の値を書き込む</td></tr><tr class="hline"><td>0x0000000c</td><td>lw x12, 0x20(x0)</td><td>x12に、アドレスが0x20のデータを読み込む</td></tr></table></div> アドレス\`0x00000020\`には、データ\`32&#39;hdeadbeef\`を格納しています。 1つ目の命令で\`32&#39;hdeadbeef\`が読み込まれ、 3つ目の命令で\`32&#39;h00000400\`を書き込み、 4つ目の命令で\`32&#39;h00000400\`が読み込まれます。 <p>シミュレータを実行し、結果を確かめます(リスト67)。</p><p><span class="caption">▼リスト3.67: LW、SW命令のテスト</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample.hex 13</span>
<span class="hljs-meta prompt_">
# </span><span class="language-bash">                   4</span>
00000000 : 02002503
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 1 ← LW命令でストールしている
  mem rdata : 02b02023
...
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   6</span>
00000000 : 02002503
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 0 ← LWが終わったので0になった
  mem rdata : deadbeef
  reg[10] &lt;= deadbeef ← 0x20の値が読み込まれた
...
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  13</span>
0000000c : 02002603
  itype     : 000010
  imm       : 00000020
  rs1[ 0]   : 00000000
  rs2[ 0]   : 00000000
  op1       : 00000000
  op2       : 00000020
  alu res   : 00000020
  mem stall : 0
  mem rdata : 00000400
  reg[12] &lt;= 00000400 ← 書き込んだ値が読み込まれた
</code></pre></div><h3 id="lb、lbu、lh、lhu命令を実装する" tabindex="-1">LB、LBU、LH、LHU命令を実装する <a class="header-anchor" href="#lb、lbu、lh、lhu命令を実装する" aria-label="Permalink to “LB、LBU、LH、LHU命令を実装する”">​</a></h3><p>LBとLBUとSB命令は8ビット単位、LHとLHUとSH命令は16ビット単位でロードストアを行う命令です。 まず、ロード命令を実装します。 ロード命令は32ビット単位でデータを読み込み、 その結果の一部を切り取ることで実装できます。</p><p>LB、LBU、LH、LHU、LW命令は、funct3の値で区別できます(表9)。 funct3の上位1ビットが<code>1</code>のとき、符号拡張を行います。</p><div id="funct3.load" class="table"><p class="caption">表3.9: ロード命令のfunct3</p><table><tr class="hline"><th>funct3</th><th>命令</th></tr><tr class="hline"><td>3&#39;b000</td><td>LB</td></tr><tr class="hline"><td>3&#39;b100</td><td>LBU</td></tr><tr class="hline"><td>3&#39;b001</td><td>LH</td></tr><tr class="hline"><td>3&#39;b101</td><td>LHU</td></tr><tr class="hline"><td>3&#39;b010</td><td>LW</td></tr></table></div> まず、何度も記述することになる値を短い名前(\`W\`、\`D\`、\`sext\`)で定義します(リスト68)。 \`sext\`は、符号拡張を行うかどうかを示す変数です。 <p><span class="caption">▼リスト3.68: W、D、sextの定義 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">const</span> W   : <span class="hljs-keyword">u32</span>                   = XLEN;
<span class="hljs-keyword">let</span> D   : <span class="hljs-keyword">logic</span>&lt;MEM_DATA_WIDTH&gt; = membus.rdata;
<span class="hljs-keyword">let</span> sext: <span class="hljs-keyword">logic</span>                 = ctrl.funct3[<span class="hljs-number">2</span>] == <span class="hljs-number">1&#39;b0</span>;
</code></pre></div><p>funct3をcase文で分岐し、 アドレスの下位ビットを見ることで、 命令とアドレスに応じた値をrdataに設定します(リスト69)。</p><p><span class="caption">▼リスト3.69: rdataをアドレスと読み込みサイズに応じて変更する (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// loadの結果</span>
rdata = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>: <span class="hljs-keyword">case</span> addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">0</span>      : {sext &amp; D[<span class="hljs-number">7</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">7</span>:<span class="hljs-number">0</span>]},
        <span class="hljs-number">1</span>      : {sext &amp; D[<span class="hljs-number">15</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">15</span>:<span class="hljs-number">8</span>]},
        <span class="hljs-number">2</span>      : {sext &amp; D[<span class="hljs-number">23</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">23</span>:<span class="hljs-number">16</span>]},
        <span class="hljs-number">3</span>      : {sext &amp; D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">8</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">24</span>]},
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">case</span> addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
        <span class="hljs-number">0</span>      : {sext &amp; D[<span class="hljs-number">15</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">15</span>:<span class="hljs-number">0</span>]},
        <span class="hljs-number">2</span>      : {sext &amp; D[<span class="hljs-number">31</span>] <span class="hljs-keyword">repeat</span> W - <span class="hljs-number">16</span>, D[<span class="hljs-number">31</span>:<span class="hljs-number">16</span>]},
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="hljs-number">2&#39;b10</span>  : D,
    <span class="hljs-keyword">default</span>: &#39;x,
};
</code></pre></div><p>ロードした値の拡張を行うとき、 値の最上位ビットと<code>sext</code>をAND演算した値を使って拡張します。 これにより、符号拡張するときは最上位ビットの値が、 ゼロで拡張するときは<code>0</code>が拡張に利用されます。</p><h3 id="sb、sh命令を実装する" tabindex="-1">SB、SH命令を実装する <a class="header-anchor" href="#sb、sh命令を実装する" aria-label="Permalink to “SB、SH命令を実装する”">​</a></h3><p>次に、SB、SH命令を実装します。</p><h4 id="memoryモジュールで書き込みマスクをサポートする" tabindex="-1">memoryモジュールで書き込みマスクをサポートする <a class="header-anchor" href="#memoryモジュールで書き込みマスクをサポートする" aria-label="Permalink to “memoryモジュールで書き込みマスクをサポートする”">​</a></h4><p>memoryモジュールは、32ビット単位の読み書きしかサポートしておらず、 一部のみの書き込みをサポートしていません。 本書では、一部のみ書き込む命令をmemoryモジュールでサポートすることでSB、SH命令を実装します。</p><p>まず、membus_ifインターフェースに、 書き込む場所をバイト単位で示す信号<code>wmask</code>を追加します ( リスト70 )。</p><p><span class="caption">▼リスト3.70: wmaskの定義 (membus_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> wmask : <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH / <span class="hljs-number">8</span>&gt;;
</code></pre></div><p>後で<code>wmask</code>を<code>DATA_WIDTH</code>ビットに展開して使うので、wmaskを展開するwmask_expand関数を定義します ( リスト72 )。</p><p><span class="caption">▼リスト3.71: wmask_expand関数の定義 (membus_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// get DATA_WIDTH-bit expanded wmask</span>
<span class="hljs-keyword">function</span> wmask_expand () -&gt; <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt; {
    <span class="hljs-keyword">var</span> result: <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt;;

    <span class="hljs-keyword">for</span> i: <span class="hljs-keyword">u32</span> <span class="hljs-keyword">in</span> <span class="hljs-number">0</span>..DATA_WIDTH {
        result[i] = wmask[i / <span class="hljs-number">8</span>];
    }
    <span class="hljs-keyword">return</span> result;
}
</code></pre></div><p><code>wmask</code>、wmask_expand関数をmodportに追加します ( リスト72 )。</p><p><span class="caption">▼リスト3.72: modport masterとslaveにwmask、wmask_expand関数を追加する (membus_if.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">modport</span> master {
    valid       : <span class="hljs-keyword">output</span>,
    ready       : <span class="hljs-keyword">input</span> ,
    addr        : <span class="hljs-keyword">output</span>,
    wen         : <span class="hljs-keyword">output</span>,
    wdata       : <span class="hljs-keyword">output</span>,
    <span class="custom-hl-bold">wmask       : <span class="hljs-keyword">output</span>,</span>
    rvalid      : <span class="hljs-keyword">input</span> ,
    rdata       : <span class="hljs-keyword">input</span> ,
    <span class="custom-hl-bold">wmask_expand: <span class="hljs-keyword">import</span>,</span>
}

<span class="hljs-keyword">modport</span> slave {
    <span class="custom-hl-bold">wmask_expand: <span class="hljs-keyword">import</span>,</span>
    ..<span class="hljs-keyword">converse</span>(master)
}
</code></pre></div><p><code>wmask</code>には、書き込む部分を<code>1</code>、書き込まない部分を<code>0</code>で指定します。 このような挙動をする値を、書き込みマスクと呼びます。 バイト単位で指定するため、<code>wmask</code>の幅は<code>DATA_WIDTH / 8</code>ビットです。</p><p>次に、memoryモジュールで書き込みマスクをサポートします(リスト73)。</p><p><span class="caption">▼リスト3.73: 書き込みマスクをサポートするmemoryモジュール (memory.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> memory::&lt;DATA_WIDTH: <span class="hljs-keyword">u32</span>, ADDR_WIDTH: <span class="hljs-keyword">u32</span>&gt; #(
    <span class="hljs-keyword">param</span> FILEPATH_IS_ENV: <span class="hljs-keyword">logic</span>  = <span class="hljs-number">0</span> , <span class="hljs-comment">// FILEPATHが環境変数名かどうか</span>
    <span class="hljs-keyword">param</span> FILEPATH       : <span class="hljs-keyword">string</span> = <span class="hljs-string">&quot;&quot;</span>, <span class="hljs-comment">// メモリの初期化用ファイルのパス, または環境変数名</span>
) (
    clk   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">clock</span>                                     ,
    rst   : <span class="hljs-keyword">input</span>   <span class="hljs-keyword">reset</span>                                     ,
    membus: <span class="hljs-keyword">modport</span> membus_if::&lt;DATA_WIDTH, ADDR_WIDTH&gt;::slave,
) {
    <span class="hljs-keyword">type</span> DataType = <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt;    ;
    <span class="hljs-keyword">type</span> MaskType = <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH / <span class="hljs-number">8</span>&gt;;

    <span class="hljs-keyword">var</span> mem: DataType [<span class="hljs-number">2</span> ** ADDR_WIDTH];

    <span class="hljs-keyword">initial</span> {
        <span class="hljs-comment">// memを初期化する</span>
        <span class="hljs-keyword">if</span> FILEPATH != <span class="hljs-string">&quot;&quot;</span> {
            <span class="hljs-keyword">if</span> FILEPATH_IS_ENV {
                $readmemh(util::get_env(FILEPATH), mem);
            } <span class="hljs-keyword">else</span> {
                $readmemh(FILEPATH, mem);
            }
        }
    }

    <span class="hljs-comment">// 状態</span>
    <span class="hljs-keyword">enum</span> State {
        Ready,
        WriteValid,
    }
    <span class="hljs-keyword">var</span> state: State;

    <span class="hljs-keyword">var</span> addr_saved : <span class="hljs-keyword">logic</span>   &lt;ADDR_WIDTH&gt;;
    <span class="hljs-keyword">var</span> wdata_saved: DataType            ;
    <span class="hljs-keyword">var</span> wmask_saved: MaskType            ;
    <span class="hljs-keyword">var</span> rdata_saved: DataType            ;

    <span class="hljs-keyword">always_comb</span> {
        membus.ready = state == State::Ready;
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">let</span> wmask: <span class="hljs-keyword">logic</span>&lt;DATA_WIDTH&gt; = membus.wmask_expand();
        <span class="hljs-keyword">if</span> state == State::WriteValid {
            mem[addr_saved[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]] = wdata_saved &amp; wmask | rdata_saved &amp; ~wmask;
        }
    }

    <span class="hljs-keyword">always_ff</span> {
        <span class="hljs-keyword">if_reset</span> {
            state         = State::Ready;
            membus.rvalid = <span class="hljs-number">0</span>;
            membus.rdata  = <span class="hljs-number">0</span>;
            addr_saved    = <span class="hljs-number">0</span>;
            wdata_saved   = <span class="hljs-number">0</span>;
            wmask_saved   = <span class="hljs-number">0</span>;
            rdata_saved   = <span class="hljs-number">0</span>;
        } <span class="hljs-keyword">else</span> {
            <span class="hljs-keyword">case</span> state {
                State::Ready: {
                    membus.rvalid = membus.valid &amp; !membus.wen;
                    membus.rdata  = mem[membus.addr[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]];
                    addr_saved    = membus.addr[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>];
                    wdata_saved   = membus.wdata;
                    wmask_saved   = membus.wmask;
                    rdata_saved   = mem[membus.addr[ADDR_WIDTH - <span class="hljs-number">1</span>:<span class="hljs-number">0</span>]];
                    <span class="hljs-keyword">if</span> membus.valid &amp;&amp; membus.wen {
                        state = State::WriteValid;
                    }
                }
                State::WriteValid: {
                    state         = State::Ready;
                    membus.rvalid = <span class="hljs-number">1</span>;
                }
            }
        }
    }
}
</code></pre></div><p>書き込みマスクをサポートするmemoryモジュールは、次の2つの状態を持ちます。</p><dl><dt>State::Ready</dt><dd> 要求を受け付ける。 読み込み要求のとき、次のクロックで結果を返す。 書き込み要求のとき、要求の内容をレジスタに格納し、 状態を\`State::WriteValid\`に移動する。 </dd><dt>State::WriteValid</dt><dd> 書き込みマスクつきの書き込みを行う。 状態を\`State::Ready\`に移動する。 </dd></dl><p>memoryモジュールは、書き込み要求が送られてきた場合、 名前が<code>_saved</code>で終わるレジスタに要求の内容を格納します。 また、指定されたアドレスのデータを<code>rdata_saved</code>に格納します。 次のクロックで、書き込みマスクを使った書き込みを行い、要求の処理を終了します。</p><p>topモジュールの調停処理で、 <code>wmask</code>も調停します(リスト74)。</p><p><span class="caption">▼リスト3.74: wmaskの調停 (top.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>membus.valid = i_membus.valid | d_membus.valid;
<span class="hljs-keyword">if</span> d_membus.valid {
    membus.addr  = addr_to_memaddr(d_membus.addr);
    membus.wen   = d_membus.wen;
    membus.wdata = d_membus.wdata;
    <span class="custom-hl-bold">membus.wmask = d_membus.wmask;</span>
} <span class="hljs-keyword">else</span> {
    membus.addr  = addr_to_memaddr(i_membus.addr);
    membus.wen   = <span class="hljs-number">0</span>; <span class="hljs-comment">// 命令フェッチは常に読み込み</span>
    membus.wdata = &#39;x;
    <span class="custom-hl-bold">membus.wmask = &#39;x;</span>
}
</code></pre></div><h4 id="memunitモジュールの実装" tabindex="-1">memunitモジュールの実装 <a class="header-anchor" href="#memunitモジュールの実装" aria-label="Permalink to “memunitモジュールの実装”">​</a></h4><p>memoryモジュールが書き込みマスクをサポートしたので、 memunitモジュールで<code>wmask</code>を設定します。</p><p><code>req_wmask</code>レジスタを作成し、 <code>membus.wmask</code>と接続します ( リスト75、 リスト76 )。</p><p><span class="caption">▼リスト3.75: req_wmaskの定義 (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> req_wmask: <span class="hljs-keyword">logic</span>&lt;MEM_DATA_WIDTH / <span class="hljs-number">8</span>&gt;;
</code></pre></div><p><span class="caption">▼リスト3.76: membusにwmaskを設定する (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// メモリアクセス</span>
membus.valid = state == State::WaitReady;
membus.addr  = req_addr;
membus.wen   = req_wen;
membus.wdata = req_wdata;
<span class="custom-hl-bold">membus.wmask = req_wmask;</span>
</code></pre></div><p>always_ffの中で、<code>req_wmask</code>の値を設定します。 それぞれの命令のとき、<code>wmask</code>がどうなるかを確認してください( リスト77、 リスト78 )。</p><p><span class="caption">▼リスト3.77: if_resetでreq_wmaskを初期化する (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">if_reset</span> {
    state     = State::Init;
    req_wen   = <span class="hljs-number">0</span>;
    req_addr  = <span class="hljs-number">0</span>;
    req_wdata = <span class="hljs-number">0</span>;
    <span class="custom-hl-bold">req_wmask = <span class="hljs-number">0</span>;</span>
} <span class="hljs-keyword">else</span> {
</code></pre></div><p><span class="caption">▼リスト3.78: メモリにアクセスする命令のとき、wmaskを設定する (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>req_wmask = <span class="hljs-keyword">case</span> ctrl.funct3[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] {
    <span class="hljs-number">2&#39;b00</span>: <span class="hljs-number">4&#39;b1</span> &lt;&lt; addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>],← SB命令のとき、アドレス下位<span class="hljs-number">2</span>ビット分だけ<span class="hljs-number">1</span>を左シフトする
    <span class="hljs-number">2&#39;b01</span>: <span class="hljs-keyword">case</span> addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>] { ← SH命令のとき
        <span class="hljs-number">2</span>      : <span class="hljs-number">4&#39;b1100</span>, ← 上位<span class="hljs-number">2</span>バイトに書き込む
        <span class="hljs-number">0</span>      : <span class="hljs-number">4&#39;b0011</span>, ← 下位<span class="hljs-number">2</span>バイトに書き込む
        <span class="hljs-keyword">default</span>: &#39;x,
    },
    <span class="hljs-number">2&#39;b10</span>  : <span class="hljs-number">4&#39;b1111</span>, ← SW命令のとき、全体に書き込む
    <span class="hljs-keyword">default</span>: &#39;x,
};
</code></pre></div><p>ソースレジスタの値はLSB側(右)に寄せられているため、アドレスを4で割った値が1, 2, 3のとき、アドレスに合わせてSB命令で書き込む値の左シフトが必要です ( リスト79 )。</p><p><span class="caption">▼リスト3.79: 書き込みデータをシフトする (memunit.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code>req_wdata = rs2 &lt;&lt; {addr[<span class="hljs-number">1</span>:<span class="hljs-number">0</span>], <span class="hljs-number">3&#39;b0</span>};
</code></pre></div><h3 id="lb、lbu、lh、lhu、sb、sh命令をテストする" tabindex="-1">LB、LBU、LH、LHU、SB、SH命令をテストする <a class="header-anchor" href="#lb、lbu、lh、lhu、sb、sh命令をテストする" aria-label="Permalink to “LB、LBU、LH、LHU、SB、SH命令をテストする”">​</a></h3><p>簡単なテストを作成し、動作をテストします。 2つテストを記載するので、正しく動いているか確認してください。</p><p><span class="caption">▼リスト3.80: src/sample_lbh.hex</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>02000083 // lb x1, 0x20(x0)  : x1 = ffffffef
02104083 // lbu x1, 0x21(x0) : x1 = 000000be
02201083 // lh x1, 0x22(x0)  : x1 = ffffdead
02205083 // lhu x1, 0x22(x0) : x1 = 0000dead
00000000
00000000
00000000
00000000
deadbeef // 0x0
</code></pre></div><p><span class="caption">▼リスト3.81: src/sample_sbsh.hex</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>12300093 // addi x1, x0, 0x123
02101023 // sh x1, 0x20(x0)
02100123 // sb x1, 0x22(x0)
02200103 // lb x2, 0x22(x0) : x2 = 00000023
02001183 // lh x3, 0x20(x0) : x3 = 00000123
</code></pre></div><h2 id="ジャンプ命令、分岐命令の実装" tabindex="-1">ジャンプ命令、分岐命令の実装 <a class="header-anchor" href="#ジャンプ命令、分岐命令の実装" aria-label="Permalink to “ジャンプ命令、分岐命令の実装”">​</a></h2><p>まだ重要な命令を実装できていません。 プログラムで分岐やループを実現するためにはジャンプや分岐をする命令が必要です。 RV32Iには、次のジャンプ、分岐命令が定義されています(表10)。</p><div id="jump.br.insts" class="table"><p class="caption">表3.10: ジャンプ命令、分岐命令</p><table><tr class="hline"><th>命令</th><th>形式</th><th>動作</th></tr><tr class="hline"><td>JAL</td><td>J形式</td><td>PC+即値に無条件ジャンプする。rdにPC+4を格納する</td></tr><tr class="hline"><td>JALR</td><td>I形式</td><td>rs1+即値に無条件ジャンプする。rdにPC+4を格納する</td></tr><tr class="hline"><td>BEQ</td><td>B形式</td><td>rs1とrs2が等しいとき、PC+即値にジャンプする</td></tr><tr class="hline"><td>BNE</td><td>B形式</td><td>rs1とrs2が異なるとき、PC+即値にジャンプする</td></tr><tr class="hline"><td>BLT</td><td>B形式</td><td>rs1(符号付き整数)がrs2(符号付き整数)より小さいとき、PC+即値にジャンプする</td></tr><tr class="hline"><td>BLTU</td><td>B形式</td><td>rs1(符号なし整数)がrs2(符号なし整数)より小さいとき、PC+即値にジャンプする</td></tr><tr class="hline"><td>BGE</td><td>B形式</td><td>rs1(符号付き整数)がrs2(符号付き整数)より大きいとき、PC+即値にジャンプする</td></tr><tr class="hline"><td>BGEU</td><td>B形式</td><td>rs1(符号なし整数)がrs2(符号なし整数)より大きいとき、PC+即値にジャンプする</td></tr></table></div> ジャンプ命令は、無条件でジャンプするため、 **無条件ジャンプ**(Unconditional Jump)と呼びます。 分岐命令は、条件付きで分岐するため、 **条件分岐**(Conditional Branch)と呼びます。 <h3 id="jal、jalr命令を実装する" tabindex="-1">JAL、JALR命令を実装する <a class="header-anchor" href="#jal、jalr命令を実装する" aria-label="Permalink to “JAL、JALR命令を実装する”">​</a></h3><p>まず、無条件ジャンプを実装します。</p><p>JAL(Jump And Link)命令は、PC+即値でジャンプ先を指定します。 Linkとは、rdレジスタにPC+4を記録しておくことで、分岐元に戻れるようにしておく操作のことです。 即値の幅は20ビットです。 PCの下位1ビットは常に<code>0</code>なため、即値を1ビット左シフトして符号拡張した値をPCに加算します (即値の生成はリスト32を確認してください)。 JAL命令でジャンプ可能な範囲は、PC±1MiBです。</p><p>JALR (Jump And Link Register)命令は、rs1+即値でジャンプ先を指定します。 即値はI形式の即値です。 JAL命令と同様に、rdレジスタにPC+4を格納(link)します。 JALR命令でジャンプ可能な範囲は、rs1レジスタの値±4KiBです。</p><p>inst_decoderモジュールは、 JAL命令かJALR命令のとき、 <code>InstCtrl.rwb_en</code>を<code>1</code>、 <code>InstCtrl.is_aluop</code>を<code>0</code>、 <code>InstCtrl.is_jump</code>を<code>1</code> としてデコードします。</p><p>無条件ジャンプであるかどうかは<code>InstCtrl.is_jump</code>で確かめられます。 また、<code>InstCtrl.is_aluop</code>が<code>0</code>なため、ALUは常に加算を行います。 加算の対象のデータが、 JAL命令(J形式)ならPCと即値、 JALR命令(I形式)ならrs1と即値になっていることを確認してください(リスト43)。</p><h4 id="無条件ジャンプの実装" tabindex="-1">無条件ジャンプの実装 <a class="header-anchor" href="#無条件ジャンプの実装" aria-label="Permalink to “無条件ジャンプの実装”">​</a></h4><p>それでは、無条件ジャンプを実装します。 まず、ジャンプ命令を実行するときにライトバックする値を<code>inst_pc + 4</code>にします(リスト82)。</p><p><span class="caption">▼リスト3.82: pc + 4を書き込む (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">let</span> wb_data: UIntX    = <span class="hljs-keyword">switch</span> {
    inst_ctrl.is_lui : inst_imm,
    <span class="custom-hl-bold">inst_ctrl.is_jump: inst_pc + <span class="hljs-number">4</span>,</span>
    inst_ctrl.is_load: memu_rdata,
    <span class="hljs-keyword">default</span>          : alu_result
};
</code></pre></div><p>次に、次にフェッチする命令をジャンプ先の命令に変更します。 フェッチ先の変更が発生を示す信号<code>control_hazard</code>と、 新しいフェッチ先を示す信号<code>control_hazard_pc_next</code>を作成します ( リスト83、 リスト84 )。</p><p><span class="caption">▼リスト3.83: control_hazardとcontrol_hazard_pc_nextの定義 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> control_hazard        : <span class="hljs-keyword">logic</span>;
<span class="hljs-keyword">var</span> control_hazard_pc_next: Addr ;
</code></pre></div><p><span class="caption">▼リスト3.84: control_hazardとcontrol_hazard_pc_nextの割り当て (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> control_hazard         = inst_valid &amp;&amp; inst_ctrl.is_jump;
<span class="hljs-keyword">assign</span> control_hazard_pc_next = alu_result &amp; ~<span class="hljs-number">1</span>;
</code></pre></div><p><code>control_hazard</code>を利用して<code>if_pc</code>を更新し、 新しく命令をフェッチしなおすようにします(リスト85)。</p><p><span class="caption">▼リスト3.85: PCをジャンプ先に変更する (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        ...
    } <span class="hljs-keyword">else</span> {
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> control_hazard {</span>
        <span class="custom-hl-bold">    if_pc           = control_hazard_pc_next;</span>
        <span class="custom-hl-bold">    if_is_requested = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">    if_fifo_wvalid  = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            <span class="hljs-keyword">if</span> if_is_requested {
                ...
            }
            <span class="hljs-comment">// IFのFIFOの制御</span>
            <span class="hljs-keyword">if</span> if_is_requested &amp;&amp; i_membus.rvalid {
                ...
            }
        <span class="custom-hl-bold">}</span>
    }
}
</code></pre></div><p>ここで、新しく命令をフェッチしなおすようにしても、 ジャンプ命令によって実行されることがなくなった命令がFIFOに残っていることがあることに注意する必要があります(図4)。</p><p><img src="`+d+`" alt="ジャンプ命令とジャンプ先の間に余計な命令が入ってしまっている"> 実行するべきではない命令を実行しないようにするために、 ジャンプ命令を実行するときに、FIFOをリセットします。</p><p>FIFOに、中身をリセットするための信号<code>flush</code>を実装します(リスト86)。</p><p><span class="caption">▼リスト3.86: ポートにflushを追加する (fifo.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">module</span> fifo #(
    <span class="hljs-keyword">param</span> DATA_TYPE: <span class="hljs-keyword">type</span> = <span class="hljs-keyword">logic</span>,
    <span class="hljs-keyword">param</span> WIDTH    : <span class="hljs-keyword">u32</span>  = <span class="hljs-number">2</span>    ,
) (
    clk       : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">clock</span>        ,
    rst       : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">reset</span>        ,
    <span class="custom-hl-bold">flush     : <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>        ,</span>
    wready    : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>        ,
</code></pre></div><p><code>flush</code>が<code>1</code>のとき、 <code>head</code>と<code>tail</code>を<code>0</code>に初期化することでFIFOを空にします(リスト87、リスト88)。</p><p><span class="caption">▼リスト3.87: flushが1のとき、FIFOを空にする (fifo.veryl、WIDTH==1)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        rdata  = <span class="hljs-number">0</span>;
        rvalid = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> flush {</span>
        <span class="custom-hl-bold">    rvalid = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            <span class="hljs-keyword">if</span> wready &amp;&amp; wvalid {
                rdata  = wdata;
                rvalid = <span class="hljs-number">1</span>;
            } <span class="hljs-keyword">else</span> <span class="hljs-keyword">if</span> rready {
                rvalid = <span class="hljs-number">0</span>;
            }
        <span class="custom-hl-bold">}</span>
    }
}
</code></pre></div><p><span class="caption">▼リスト3.88: flushが1のとき、FIFOを空にする (fifo.veryl、WIDTH!=1)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">always_ff</span> {
    <span class="hljs-keyword">if_reset</span> {
        head = <span class="hljs-number">0</span>;
        tail = <span class="hljs-number">0</span>;
    } <span class="hljs-keyword">else</span> {
        <span class="custom-hl-bold"><span class="hljs-keyword">if</span> flush {</span>
        <span class="custom-hl-bold">    head = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">    tail = <span class="hljs-number">0</span>;</span>
        <span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
            <span class="hljs-keyword">if</span> wready &amp;&amp; wvalid {
                mem[tail] = wdata;
                tail      = tail + <span class="hljs-number">1</span>;
            }
            <span class="hljs-keyword">if</span> rready &amp;&amp; rvalid {
                head = head + <span class="hljs-number">1</span>;
            }
        <span class="custom-hl-bold">}</span>
    }
}
</code></pre></div><p>coreモジュールで、 <code>control_hazard</code>と<code>flush</code>を接続し、 FIFOをリセットします(リスト89)。</p><p><span class="caption">▼リスト3.89: ジャンプ命令のとき、FIFOをリセットする (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">inst</span> if_fifo: fifo #(
    DATA_TYPE: if_fifo_type,
    WIDTH    : <span class="hljs-number">3</span>           ,
) (
    clk                           ,
    rst                           ,
    <span class="custom-hl-bold">flush     : control_hazard    ,</span>
    ...
);
</code></pre></div><h4 id="無条件ジャンプのテスト" tabindex="-1">無条件ジャンプのテスト <a class="header-anchor" href="#無条件ジャンプのテスト" aria-label="Permalink to “無条件ジャンプのテスト”">​</a></h4><p>簡単なテストを作成し、動作をテストします(リスト90、リスト91)。</p><p><span class="caption">▼リスト3.90: sample_jump.hex</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>0100006f //  0: jal x0, 0x10 : 0x10にジャンプする
deadbeef //  4:
deadbeef //  8:
deadbeef //  c:
01800093 // 10: addi x1, x0, 0x18
00808067 // 14: jalr x0, 8(x1) : x1+8=0x20にジャンプする
deadbeef // 18:
deadbeef // 1c:
fe1ff06f // 20: jal x0, -0x20 : 0にジャンプする
</code></pre></div><p><span class="caption">▼リスト3.91: テストの実行</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample_jump.hex 17</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 0100006f
  reg[ 0] &lt;= 00000004 ← rd = PC + 4
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   8</span>
00000010 : 01800093 ← 0x00 → 0x10にジャンプしている
  reg[ 1] &lt;= 00000018
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   9</span>
00000014 : 00808067
  reg[ 0] &lt;= 00000018 ← rd = PC + 4
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  13</span>
00000020 : fe1ff06f ← 0x14 → 0x20にジャンプしている
  reg[ 0] &lt;= 00000024 ← rd = PC + 4
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  17</span>
00000000 : 0100006f ← 0x20 → 0x00にジャンプしている
  reg[ 0] &lt;= 00000004
</code></pre></div><h3 id="条件分岐命令を実装する" tabindex="-1">条件分岐命令を実装する <a class="header-anchor" href="#条件分岐命令を実装する" aria-label="Permalink to “条件分岐命令を実装する”">​</a></h3><p>条件分岐命令はすべてB形式で、PC+即値で分岐先を指定します。 それぞれの命令は、命令のfunct3フィールドで判別できます (表11)。</p><div id="br.funct3" class="table"><p class="caption">表3.11: 条件分岐命令とfunct3</p><table><tr class="hline"><th>funct3</th><th>命令</th><th>演算</th></tr><tr class="hline"><td>3&#39;b000</td><td>BEQ</td><td>==</td></tr><tr class="hline"><td>3&#39;b001</td><td>BNE</td><td>!=</td></tr><tr class="hline"><td>3&#39;b100</td><td>BLT</td><td>符号付き &lt;=</td></tr><tr class="hline"><td>3&#39;b101</td><td>BGE</td><td>符号付き &gt;</td></tr><tr class="hline"><td>3&#39;b110</td><td>BLTU</td><td>符号なし &lt;=</td></tr><tr class="hline"><td>3&#39;b111</td><td>BGEU</td><td>符号なし &gt;</td></tr></table></div><h4 id="条件分岐の実装" tabindex="-1">条件分岐の実装 <a class="header-anchor" href="#条件分岐の実装" aria-label="Permalink to “条件分岐の実装”">​</a></h4><p>分岐の条件が成立するかどうかを判定するモジュールを作成します。 <code>src/brunit.veryl</code>を作成し、次のように記述します(リスト92)。</p><p><span class="caption">▼リスト3.92: brunit.veryl</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">import</span> eei::*;
<span class="hljs-keyword">import</span> corectrl::*;

<span class="hljs-keyword">module</span> brunit (
    funct3: <span class="hljs-keyword">input</span>  <span class="hljs-keyword">logic</span>&lt;<span class="hljs-number">3</span>&gt;,
    op1   : <span class="hljs-keyword">input</span>  UIntX   ,
    op2   : <span class="hljs-keyword">input</span>  UIntX   ,
    take  : <span class="hljs-keyword">output</span> <span class="hljs-keyword">logic</span>   , <span class="hljs-comment">// 分岐が成立するか否か</span>
) {
    <span class="hljs-keyword">let</span> beq : <span class="hljs-keyword">logic</span> = op1 == op2;
    <span class="hljs-keyword">let</span> blt : <span class="hljs-keyword">logic</span> = $<span class="hljs-keyword">signed</span>(op1) &lt;: $<span class="hljs-keyword">signed</span>(op2);
    <span class="hljs-keyword">let</span> bltu: <span class="hljs-keyword">logic</span> = op1 &lt;: op2;

    <span class="hljs-keyword">always_comb</span> {
        <span class="hljs-keyword">case</span> funct3 {
            <span class="hljs-number">3&#39;b000</span> : take = beq;
            <span class="hljs-number">3&#39;b001</span> : take = !beq;
            <span class="hljs-number">3&#39;b100</span> : take = blt;
            <span class="hljs-number">3&#39;b101</span> : take = !blt;
            <span class="hljs-number">3&#39;b110</span> : take = bltu;
            <span class="hljs-number">3&#39;b111</span> : take = !bltu;
            <span class="hljs-keyword">default</span>: take = <span class="hljs-number">0</span>;
        }
    }
}
</code></pre></div><p>brunitモジュールは、 <code>funct3</code>に応じて<code>take</code>の条件を切り替えます。 分岐が成立するときに<code>take</code>が<code>1</code>になります。</p><p>brunitモジュールを、 coreモジュールでインスタンス化します(リスト93)。 命令がB形式のとき、 <code>op1</code>は<code>rs1_data</code>、 <code>op2</code>は<code>rs2_data</code>になっていることを確認してください(リスト43)。</p><p><span class="caption">▼リスト3.93: brunitモジュールのインスタンス化 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">var</span> brunit_take: <span class="hljs-keyword">logic</span>;

<span class="hljs-keyword">inst</span> bru: brunit (
    funct3: inst_ctrl.funct3,
    op1                     ,
    op2                     ,
    take  : brunit_take     ,
);
</code></pre></div><p>命令が条件分岐命令で<code>brunit_take</code>が<code>1</code>のとき、 次のPCをPC + 即値にします ( リスト94、 リスト95 )。</p><p><span class="caption">▼リスト3.94: 命令が条件分岐命令か判定する関数 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-comment">// 命令が分岐命令かどうかを判定する</span>
<span class="hljs-keyword">function</span> inst_is_br (
    ctrl: <span class="hljs-keyword">input</span> InstCtrl,
) -&gt; <span class="hljs-keyword">logic</span>    {
    <span class="hljs-keyword">return</span> ctrl.itype == InstType::B;
}
</code></pre></div><p><span class="caption">▼リスト3.95: 分岐成立時のPCの設定 (core.veryl)</span></p><div class="language-veryl"><button title="Copy Code" class="copy"></button><span class="lang">veryl</span><pre class="hljs"><code><span class="hljs-keyword">assign</span> control_hazard         = inst_valid &amp;&amp; <span class="custom-hl-bold">(</span>inst_ctrl.is_jump <span class="custom-hl-bold">|| inst_is_br(inst_ctrl) &amp;&amp; brunit_take)</span>;
<span class="hljs-keyword">assign</span> control_hazard_pc_next = <span class="custom-hl-bold"><span class="hljs-keyword">if</span> inst_is_br(inst_ctrl) {</span>
    <span class="custom-hl-bold">inst_pc + inst_imm</span>
<span class="custom-hl-bold">} <span class="hljs-keyword">else</span> {</span>
    alu_result &amp; ~<span class="hljs-number">1</span>
<span class="custom-hl-bold">}</span>;
</code></pre></div><p><code>control_hazard</code>は、命令が無条件ジャンプ命令か、命令が条件分岐命令かつ分岐が成立するときに<code>1</code>になります。 <code>control_hazard_pc_next</code>は、無条件ジャンプ命令のときは<code>alu_result</code>、条件分岐命令のときはPC + 即値になります。</p><h4 id="条件分岐命令のテスト" tabindex="-1">条件分岐命令のテスト <a class="header-anchor" href="#条件分岐命令のテスト" aria-label="Permalink to “条件分岐命令のテスト”">​</a></h4><p>条件分岐命令を実行するとき、分岐の成否をデバッグ表示します。 デバッグ表示を行っているalways_ffブロック内に、次のコードを追加します(リスト96)。</p><p><span class="caption">▼リスト3.96: 分岐判定のデバッグ表示 (core.veryl)</span></p><div class="language-very"><button title="Copy Code" class="copy"></button><span class="lang">very</span><pre class="hljs"><code>if inst_is_br(inst_ctrl) {
    $display(&quot;  br take   : %b&quot;, brunit_take);
}
</code></pre></div><p>簡単なテストを作成し、動作をテストします(リスト97, リスト98)。</p><p><span class="caption">▼リスト3.97: sample_br.hex</span></p><div class="language-hex"><button title="Copy Code" class="copy"></button><span class="lang">hex</span><pre class="hljs"><code>00100093 //  0: addi x1, x0, 1
10100063 //  4: beq x0, x1, 0x100
00101863 //  8: bne x0, x1, 0x10
deadbeef //  c:
deadbeef // 10:
deadbeef // 14:
0000d063 // 18: bge x1, x0, 0
</code></pre></div><p><span class="caption">▼リスト3.98: テストの実行</span></p><div class="language-terminal"><button title="Copy Code" class="copy"></button><span class="lang">terminal</span><pre class="hljs"><code><span class="hljs-meta prompt_">$ </span><span class="language-bash">make build</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">make sim</span>
<span class="hljs-meta prompt_">$ </span><span class="language-bash">obj_dir/sim src/sample_br.hex 15</span>
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   4</span>
00000000 : 00100093 ← x1に1を代入
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   5</span>
00000004 : 10100063
  op1       : 00000000
  op2       : 00000001
  br take   : 0 ← x0 != x1なので不成立
<span class="hljs-meta prompt_"># </span><span class="language-bash">                   6</span>
00000008 : 00101863
  op1       : 00000000
  op2       : 00000001
  br take   : 1 ← x0 != x1なので成立
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  10</span>
00000018 : 0000d063 ← 0x08 → 0x18にジャンプ
  br take   : 1 ← x1 &gt; x0なので成立
<span class="hljs-meta prompt_"># </span><span class="language-bash">                  14</span>
00000018 : 0000d063 ← 0x18 → 0x18にジャンプ
  br take   : 1
</code></pre></div><p>BLT、BLTU、BGEU命令は後の章で紹介するriscv-testsでテストします。</p><div class="warning custom-block"><p class="custom-block-title"><b>実装していないRV32Iの命令</b></p><p>メモリフェンス命令、ECALL命令、EBREAK命令は後の章で実装します。</p></div><hr class="footnotes-sep"><section class="footnotes"><ol class="footnotes-list"><li id="fn1" class="footnote-item"><p>その昔、Setunという3進数のコンピュータが存在したらしく、機械語は3進数のトリット(trit)で構成されていたようです <a href="#fnref1" class="footnote-backref">↩︎</a></p></li><li id="fn2" class="footnote-item"><p>Verilogのソースファイルだけでビルドすることもできます <a href="#fnref2" class="footnote-backref">↩︎</a></p></li><li id="fn3" class="footnote-item"><p><a href="https://std.veryl-lang.org/" target="_blank" rel="noreferrer">https://std.veryl-lang.org/</a> <a href="#fnref3" class="footnote-backref">↩︎</a></p></li><li id="fn4" class="footnote-item"><p>1つ空きがあるという条件だとあふれてしまいます。FIFOが容量いっぱいのときにどうなるか確認してください <a href="#fnref4" class="footnote-backref">↩︎</a></p></li><li id="fn5" class="footnote-item"><p>Verilatorはデフォルト設定では不定値に対応していないため、不定値は0になります <a href="#fnref5" class="footnote-backref">↩︎</a></p></li></ol></section>`,524)])])}const _=a(o,[["render",r]]);export{j as __pageData,_ as default};
